import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert,
  CircularProgress,
  Button,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Check, Close, Visibility } from "@mui/icons-material";
import dayjs from "dayjs";
import Link from "next/link";
import { FileViewer } from "@/app/components/FileViewer";
import { LeaveDetailsDialog } from "@/app/components/leave/LeaveDetailsDialog";

import {
  fetchLeaveRequests,
  updateLeaveRequest,
  LeaveRequest,
  createLeaveRequest,
} from "@/app/lib/api/leaveRequestApi";
import { LeaveApplicationForm } from "@/app/user/clientComponents/leaves/LeaveApplicationForm"; // Imported
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Add, Send } from "@mui/icons-material";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Divider
} from "@mui/material";
import { uploadFile } from "@/app/lib/uploadService";
import { FileUpload } from "@/app/components/FileUpload";

const LeaveRequestsManagement: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
  mode?: "all" | "my-requests" | "pending-approvals";
}> = ({ user, companyId, mode = "all" }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] = useState<string>(mode === "pending-approvals" ? "pending" : "");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Queries for Create Request: Removed (handled in component)

  const getCleanFilename = (key: string) => {
    try {
      const parts = key.split('/');
      const fileNameWithTimestamp = parts[parts.length - 1];
      const match = fileNameWithTimestamp.match(/^\d{13}-(.+)$/);
      if (match && match[1]) {
        return match[1];
      }
      return fileNameWithTimestamp;
    } catch (e) {
      return "Attachment";
    }
  };

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  const [filterModel, setFilterModel] = React.useState<any>({
    items: [],
    quickFilterValues: [],
  });

  const searchQuery = filterModel.quickFilterValues?.join(" ") || undefined;

  // Fetch leave requests
  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
  } = useQuery<any, Error>({
    queryKey: ["leaveRequests", companyId, statusFilter, paginationModel.page, paginationModel.pageSize, searchQuery, mode],
    queryFn: async () => {
      // Assuming fetchLeaveRequests is updated or we pass params manually
      // The current fetchLeaveRequests likely takes simple args, we might need to update the API client too or pass a larger object
      // Let's assume we can update fetchLeaveRequests or construct URL params here if needed, 
      // but ideally we should update the api client function signature.
      // For now, let's call it and assume the backend handles the new params if we pass them? 
      // Wait, api client determines arguments. Check fetchLeaveRequests signature.
      // It is: export const fetchLeaveRequests = (companyId: string, params?: any) ...
      // So we can pass extra params.

      const result = await fetchLeaveRequests(companyId, {
        status: statusFilter,
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery,
        myRequests: mode === "my-requests",
        pendingApprovals: mode === "pending-approvals",
      });
      return result.data; // Assuming result.data is the full response body for raw fetch or similar
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const leaveRequests = paginatedData?.data || (Array.isArray(paginatedData) ? paginatedData : []);
  const rowCount = paginatedData?.pagination?.total || (Array.isArray(paginatedData) ? paginatedData.length : 0);

  // Update leave request mutation
  const updateLeaveRequestMutation = useMutation({
    mutationFn: ({
      leaveRequestId,
      action,
      remarks,
      documents,
    }: {
      leaveRequestId: string;
      action: "approve" | "reject" | "cancel";
      remarks?: string;
      documents?: string[];
    }) => updateLeaveRequest({ leaveRequestId, action, remarks, documents }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leaveRequests", companyId] });
      showSnackbar({
        message: `Leave request ${variables.action}d successfully!`,
        severity: "success",
      });
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const columns: GridColDef[] = [
    {
      field: "employee",
      headerName: "Employee",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        if (!params.row.employee) return <Typography variant="body2" color="text.secondary">Deleted Employee</Typography>;
        return (
          <Link
            href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${params.row.employee._id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Button variant="text" sx={{ textTransform: 'none' }}>
              {`${params.row.employee.name} (${params.row.employee.memberNo})`}
            </Button>
          </Link>
        );
      },
    },
    {
      field: "leaveType",
      headerName: "Leave Type",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        if (!params.value) return "-";
        return (
          <Chip
            label={params.value.name}
            size="small"
            sx={{
              backgroundColor: params.value.color || "#1976d2",
              color: "#fff",
            }}
          />
        );
      },
    },
    {
      field: "startDate",
      headerName: "Start Date",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => {
        const date = dayjs(params.row.startDate);
        if (params.row.leaveType?.isShortLeave) {
          return date.format("DD-MM-YYYY | HH:mm");
        }
        return date.format("DD-MM-YYYY");
      },
    },
    {
      field: "endDate",
      headerName: "End Date",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => {
        const date = dayjs(params.row.endDate);
        if (params.row.leaveType?.isShortLeave) {
          return date.format("DD-MM-YYYY | HH:mm");
        }
        return date.format("DD-MM-YYYY");
      },
    },
    {
      field: "totalDays",
      headerName: "Duration",
      flex: 0.8,
      minWidth: 120,
      valueGetter: (value, row) => {
        if (row.leaveType?.isShortLeave) {
          return `${row.totalMinutes || 0} mins`;
        }
        if (row.halfDay) {
          return `0.5 Days (${row.halfDayPeriod})`;
        }
        return `${row.totalDays} Days`;
      }
    },
    {
      field: "reason",
      headerName: "Reason",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const colors: Record<string, any> = {
          pending: "warning",
          approved: "success",
          rejected: "error",
          cancelled: "default",
        };
        return (
          <Chip
            label={params.value.toUpperCase()}
            size="small"
            color={colors[params.value]}
          />
        );
      },
    },
    {
      field: "approver",
      headerName: "Approver",
      flex: 1,
      minWidth: 150,
      valueGetter: (value, row) => {
        return row.approver
          ? `${row.approver.name} (${row.approver.memberNo})`
          : "None";
      },
    },
    {
      field: "remarks",
      headerName: "Remarks / Reason",
      flex: 1.5,
      minWidth: 250,
      valueGetter: (value, row) => {
        return row.rejectionReason || row.cancelReason || row.remarks || "-";
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        return (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Visibility />}
            onClick={() => handleViewDetails(params.row)}
          >
            View
          </Button>
        );
      },
    },
  ];

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setLeaveDialogOpen(true);
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      reason: false,
      approver: mode !== "my-requests",
      employee: mode !== "my-requests",
    });

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          minHeight: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || "An unexpected error occurred"}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
        {mode === "all" && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ ml: 'auto' }}
          >
            Create Request
          </Button>
        )}
      </Box>

      <Box sx={{ height: "calc(100vh - 350px)", width: "100%" }}>
        <DataGrid
          rows={leaveRequests || []}
          columns={columns}
          getRowId={(row) => row._id}
          rowCount={rowCount}
          loading={isLoading}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={(newModel) => setFilterModel(newModel)}
          pageSizeOptions={[10, 20, 50]}
          slots={{
            toolbar: (props) => (
              <GridToolbar
                {...props}
                csvOptions={{ disableToolbarButton: true }}
                printOptions={{ disableToolbarButton: true }}
              />
            ),
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          disableRowSelectionOnClick
          disableDensitySelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
        />
      </Box>

      {/* Leave Details Dialog */}
      <LeaveDetailsDialog
        open={leaveDialogOpen}
        onClose={() => {
          setLeaveDialogOpen(false);
          setSelectedRequest(null);
        }}
        leaveRequest={selectedRequest || undefined}
        mode="manage"
        isEmployer={mode !== "my-requests"}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["leaveRequests", companyId] });
        }}
      />

      {/* Create Request Dialog (Admin/Employer) */}
      < Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Leave Request (Employer)</DialogTitle>
        <DialogContent dividers>
          <LeaveApplicationForm
            companyId={companyId}
            onSuccess={() => setCreateDialogOpen(false)}
            onCancel={() => setCreateDialogOpen(false)}
            isDialog={true}
          />
        </DialogContent>
      </Dialog >
    </Box >
  );
};

export default LeaveRequestsManagement;
