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
import { FileViewer } from "@/app/components/FileViewer";

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
      minWidth: 140,
      renderCell: (params) => {
        const date = dayjs(params.row.startDate);
        if (params.row.leaveType.isShortLeave) {
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
        if (params.row.leaveType.isShortLeave) {
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
        if (row.leaveType.isShortLeave) {
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
    setAction(null); // No specific action yet
    setActionDialogOpen(true);
  };

  const handleActionClick = (
    actionType: "approve" | "reject" | "cancel"
  ) => {
    setAction(actionType);
    // Logic to handle confirmation within the dialog or separate
    // Actually, we want to confirm immediately if clicked inside dialog? 
    // Or set action state and show confirmation UI?
    // Let's make the handleConfirmAction rely on the local state action.
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Leave Request Details</DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>

              {/* Header Info */}
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedRequest.employee.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Member No: {selectedRequest.employee.memberNo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Designation: {selectedRequest.employee.designation || 'N/A'}
                  </Typography>
                </Box>
                <Chip
                  label={selectedRequest.status.toUpperCase()}
                  color={
                    selectedRequest.status === 'approved' ? 'success' :
                      selectedRequest.status === 'rejected' ? 'error' :
                        selectedRequest.status === 'pending' ? 'warning' : 'default'
                  }
                  variant="outlined"
                />
              </Box>

              {/* Leave Details Grid */}
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Leave Type
                  </Typography>
                  <Chip
                    label={selectedRequest.leaveType.name}
                    size="small"
                    sx={{ bgcolor: selectedRequest.leaveType.color || 'primary.main', color: '#fff' }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Duration
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedRequest.leaveType.isShortLeave ? (
                      <>
                        {dayjs(selectedRequest.startDate).format("DD MMM YYYY")}
                        <Box component="span" sx={{ mx: 1, color: 'text.secondary' }}>|</Box>
                        {dayjs(selectedRequest.startDate).format("HH:mm")} - {dayjs(selectedRequest.endDate).format("HH:mm")}
                        <Typography component="span" variant="body2" color="primary" sx={{ ml: 1 }}>
                          ({selectedRequest.totalMinutes} mins)
                        </Typography>
                      </>
                    ) : (
                      <>
                        {dayjs(selectedRequest.startDate).format("DD MMM YYYY")}
                        {selectedRequest.startDate !== selectedRequest.endDate && ` - ${dayjs(selectedRequest.endDate).format("DD MMM YYYY")}`}
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          {selectedRequest.totalDays} Days
                          {selectedRequest.halfDay && ` (${selectedRequest.halfDayPeriod} Half)`}
                        </Typography>
                      </>
                    )}
                  </Typography>
                </Box>

                {selectedRequest.reason && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Reason
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      {selectedRequest.reason}
                    </Typography>
                  </Box>
                )}

                {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Attachments
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedRequest.documents.map((docKey, index) => (
                        <Box key={index} sx={{ minWidth: 200 }}>
                          <FileViewer fileKey={docKey} filename={`Attachment ${index + 1}`} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              <TextField
                label="Add Remarks / Rejection Reason"
                multiline
                rows={2}
                fullWidth
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                sx={{ mt: 3 }}
                placeholder="Enter remarks before approving or rejecting..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 2 }}>
            <Button
              onClick={() => {
                setActionDialogOpen(false);
                setSelectedRequest(null);
                setAction(null);
                setRemarks("");
              }}
              color="inherit"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Close
            </Button>

            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
              {selectedRequest && selectedRequest.status === "pending" && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Close />}
                  onClick={() => {
                    if (selectedRequest) {
                      updateLeaveRequestMutation.mutate({
                        leaveRequestId: selectedRequest._id,
                        action: "reject",
                        remarks,
                      });
                    }
                  }}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Reject
                </Button>
              )}

              {selectedRequest &&
                (selectedRequest.status === "pending" ||
                  selectedRequest.status === "approved") && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      if (selectedRequest) {
                        updateLeaveRequestMutation.mutate({
                          leaveRequestId: selectedRequest._id,
                          action: "cancel",
                          remarks,
                        });
                      }
                    }}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Cancel Leave
                  </Button>
                )}

              {selectedRequest && selectedRequest.status === "pending" && (
                <Button
                  variant="contained"
                  color="success"
                  endIcon={<Check />}
                  onClick={() => {
                    if (selectedRequest) {
                      updateLeaveRequestMutation.mutate({
                        leaveRequestId: selectedRequest._id,
                        action: "approve",
                        remarks,
                      });
                    }
                  }}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Approve
                </Button>
              )}
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveRequestsManagement;
