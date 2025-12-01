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
} from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Check, Close } from "@mui/icons-material";
import dayjs from "dayjs";

import {
  fetchLeaveRequests,
  updateLeaveRequest,
  LeaveRequest,
} from "@/app/lib/api/leaveRequestApi";

const LeaveRequestsManagement: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
}> = ({ user, companyId }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null
  );
  const [action, setAction] = useState<"approve" | "reject" | "cancel" | null>(
    null
  );
  const [remarks, setRemarks] = useState("");

  // Fetch leave requests
  const {
    data: leaveRequests,
    isLoading,
    isError,
    error,
  } = useQuery<LeaveRequest[], Error>({
    queryKey: ["leaveRequests", companyId, statusFilter],
    queryFn: async () => {
      const result = await fetchLeaveRequests(companyId, {
        status: statusFilter,
      });
      return result.data;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Update leave request mutation
  const updateLeaveRequestMutation = useMutation({
    mutationFn: ({
      leaveRequestId,
      action,
      remarks,
    }: {
      leaveRequestId: string;
      action: "approve" | "reject" | "cancel";
      remarks?: string;
    }) => updateLeaveRequest({ leaveRequestId, action, remarks }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leaveRequests", companyId] });
      showSnackbar({
        message: `Leave request ${variables.action}d successfully!`,
        severity: "success",
      });
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAction(null);
      setRemarks("");
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
      valueGetter: (value, row) => {
        return `${row.employee.name} (${row.employee.memberNo})`;
      },
    },
    {
      field: "leaveType",
      headerName: "Leave Type",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
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
      minWidth: 120,
      valueGetter: (value, row) => {
        return dayjs(row.startDate).format("DD-MM-YYYY");
      },
    },
    {
      field: "endDate",
      headerName: "End Date",
      flex: 1,
      minWidth: 120,
      valueGetter: (value, row) => {
        return dayjs(row.endDate).format("DD-MM-YYYY");
      },
    },
    {
      field: "totalDays",
      headerName: "Days",
      flex: 0.5,
      maxWidth: 80,
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
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const request = params.row;
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            {request.status === "pending" && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<Check />}
                  onClick={() => handleActionClick(request, "approve")}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<Close />}
                  onClick={() => handleActionClick(request, "reject")}
                >
                  Reject
                </Button>
              </>
            )}
            {(request.status === "pending" ||
              request.status === "approved") && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleActionClick(request, "cancel")}
                >
                  Cancel
                </Button>
              )}
          </Box>
        );
      },
    },
  ];

  const handleActionClick = (
    request: LeaveRequest,
    actionType: "approve" | "reject" | "cancel"
  ) => {
    setSelectedRequest(request);
    setAction(actionType);
    setActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (selectedRequest && action) {
      updateLeaveRequestMutation.mutate({
        leaveRequestId: selectedRequest._id,
        action,
        remarks,
      });
    }
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      reason: false,
      approver: false,
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
      </Box>

      <Box sx={{ height: "calc(100vh - 400px)", minHeight: "400px" }}>
        <DataGrid
          rows={leaveRequests || []}
          columns={columns}
          getRowId={(row) => row._id}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 20,
              },
            },
            filter: {
              filterModel: {
                items: [],
                quickFilterExcludeHiddenColumns: false,
              },
            },
          }}
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

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => {
          setActionDialogOpen(false);
          setSelectedRequest(null);
          setAction(null);
          setRemarks("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {action === "approve"
            ? "Approve Leave Request"
            : action === "reject"
              ? "Reject Leave Request"
              : "Cancel Leave Request"}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <strong>Employee:</strong> {selectedRequest.employee.name} (
                {selectedRequest.employee.memberNo})
              </Box>
              <Box sx={{ mb: 2 }}>
                <strong>Leave Type:</strong> {selectedRequest.leaveType.name}
              </Box>
              <Box sx={{ mb: 2 }}>
                <strong>Duration:</strong>{" "}
                {dayjs(selectedRequest.startDate).format("DD-MM-YYYY")} to{" "}
                {dayjs(selectedRequest.endDate).format("DD-MM-YYYY")} (
                {selectedRequest.totalDays} days)
              </Box>
              {selectedRequest.reason && (
                <Box sx={{ mb: 2 }}>
                  <strong>Reason:</strong> {selectedRequest.reason}
                </Box>
              )}
              <TextField
                label="Remarks (optional)"
                multiline
                rows={3}
                fullWidth
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setActionDialogOpen(false);
              setSelectedRequest(null);
              setAction(null);
              setRemarks("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={
              action === "approve"
                ? "success"
                : action === "reject"
                  ? "error"
                  : "primary"
            }
          >
            {action === "approve"
              ? "Approve"
              : action === "reject"
                ? "Reject"
                : "Cancel Leave"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveRequestsManagement;
