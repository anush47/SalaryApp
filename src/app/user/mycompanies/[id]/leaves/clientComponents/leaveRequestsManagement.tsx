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

import {
  fetchLeaveRequests,
  updateLeaveRequest,
  LeaveRequest,
} from "@/app/lib/api/leaveRequestApi";

const LeaveRequestsManagement: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
  mode?: "all" | "my-requests" | "pending-approvals";
}> = ({ user, companyId, mode = "all" }) => {
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
  const [updatedDocuments, setUpdatedDocuments] = useState<string[]>([]);

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
      renderCell: (params) => {
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
    setUpdatedDocuments(request.documents || []);
    setAction(null); // No specific action yet
    // Populate remarks from the request so the employer sees what they saved
    setRemarks(request.remarks || "");
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
        documents: updatedDocuments,
      });
    }
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
      </Box>

      <Box sx={{ height: "calc(100vh - 230px)", width: "100%" }}>
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
                      Reason for Leave
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
                      {selectedRequest.reason}
                    </Typography>
                  </Box>
                )}

                {/* Status Specific Reasons */}
                {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                  <Box>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      Rejection Reason
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: 'error.lighter', color: 'error.dark', borderRadius: 1, mb: 2, border: '1px solid', borderColor: 'error.light' }}>
                      {selectedRequest.rejectionReason}
                    </Typography>
                  </Box>
                )}

                {selectedRequest.status === 'cancelled' && selectedRequest.cancelReason && (
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Cancellation Reason
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: 'warning.lighter', color: 'warning.dark', borderRadius: 1, mb: 2, border: '1px solid', borderColor: 'warning.light' }}>
                      {selectedRequest.cancelReason}
                    </Typography>
                  </Box>
                )}

                {updatedDocuments && updatedDocuments.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Attachments
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {updatedDocuments.map((docKey, index) => (
                        <Box key={docKey} sx={{ position: 'relative', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <FileViewer fileKey={docKey} filename={getCleanFilename(docKey)} showPreview={true} />
                          {selectedRequest.status === 'pending' && (
                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => setUpdatedDocuments(prev => prev.filter(d => d !== docKey))}
                              >
                                Remove
                              </Button>
                            </Box>
                          )}
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
                        documents: updatedDocuments,
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
                          documents: updatedDocuments,
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
                        documents: updatedDocuments,
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
