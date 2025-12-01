"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Paper,
  IconButton,
} from "@mui/material";
import {
  Send,
  Cancel,
  CheckCircle,
  Block,
  AttachFile,
  Close,
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { fetchLeaveTypes } from "@/app/lib/api/leaveTypeApi";
import {
  fetchLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
} from "@/app/lib/api/leaveRequestApi";

interface UserProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leave-tabpanel-${index}`}
      aria-labelledby={`leave-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EmployeeLeaves: React.FC<UserProps> = ({ user }) => {
  const { showSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Apply form state
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    leaveRequest: any;
    action: "approve" | "reject" | "cancel" | null;
  }>({
    open: false,
    leaveRequest: null,
    action: null,
  });
  const [remarks, setRemarks] = useState("");

  const fetchEmployeeData = async () => {
    try {
      const empResponse = await fetch(`/api/employees?user=${user.id}`);
      if (!empResponse.ok) throw new Error("Failed to fetch employee data");
      const empData = await empResponse.json();
      if (!empData.employees || empData.employees.length === 0) {
        throw new Error("Employee profile not found");
      }
      return empData.employees[0];
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
      return null;
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    const employee = await fetchEmployeeData();
    if (!employee) {
      setLoading(false);
      return;
    }

    setEmployeeData(employee);

    try {
      // Fetch leave types
      const types = await fetchLeaveTypes(employee.company._id);
      setLeaveTypes(types || []);

      // Fetch leave balance
      const balanceResponse = await fetch(
        `/api/employees/leave-balance?employeeId=${employee._id}`
      );
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setLeaveBalance(balanceData.summary || []);
      }

      // Fetch my leaves
      const myLeavesResult = await fetchLeaveRequests(employee.company._id, {
        myRequests: true,
      });
      setMyLeaves(myLeavesResult.data || []);

      // Fetch pending approvals
      const approvalsResult = await fetchLeaveRequests(employee.company._id, {
        pendingApprovals: true,
      });
      setPendingApprovals(approvalsResult.data || []);
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [user.id]);

  const validateForm = (): boolean => {
    const newErrors = {
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    };

    let isValid = true;

    // Validate leave type
    if (!selectedLeaveType) {
      newErrors.leaveType = "Please select a leave type";
      isValid = false;
    }

    // Validate start date
    if (!startDate) {
      newErrors.startDate = "Start date is required";
      isValid = false;
    } else {
      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        newErrors.startDate = "Start date cannot be in the past";
        isValid = false;
      }
    }

    // Validate end date
    if (!endDate) {
      newErrors.endDate = "End date is required";
      isValid = false;
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        newErrors.endDate = "End date must be on or after start date";
        isValid = false;
      }

      // Check if date range is too long (optional check)
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays > 365) {
        newErrors.endDate = "Leave period cannot exceed 365 days";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleApplyLeave = async () => {
    // Clear previous errors
    setErrors({
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    });

    // Validate form
    if (!validateForm()) {
      showSnackbar({
        message: "Please fix the errors in the form",
        severity: "error",
      });
      return;
    }

    if (!employeeData) {
      showSnackbar({
        message: "Employee data not available",
        severity: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createLeaveRequest({
        employeeId: employeeData._id,
        leaveTypeId: selectedLeaveType,
        startDate,
        endDate,
        halfDay,
        reason: reason.trim(),
      });

      showSnackbar({
        message: "Leave request submitted successfully",
        severity: "success",
      });
      // Reset form
      setSelectedLeaveType("");
      setStartDate("");
      setEndDate("");
      setHalfDay(false);
      setReason("");
      setErrors({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      // Refresh data
      fetchAllData();
    } catch (error: any) {
      showSnackbar({
        message: error.message || "Failed to submit leave request",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveAction = async () => {
    if (!actionDialog.leaveRequest || !actionDialog.action) return;

    try {
      await updateLeaveRequest({
        leaveRequestId: actionDialog.leaveRequest._id,
        action: actionDialog.action,
        remarks: remarks.trim(),
      });

      showSnackbar({
        message: `Leave request ${actionDialog.action}d successfully`,
        severity: "success",
      });
      setActionDialog({ open: false, leaveRequest: null, action: null });
      setRemarks("");
      fetchAllData();
    } catch (error: any) {
      showSnackbar({
        message:
          error.message || `Failed to ${actionDialog.action} leave request`,
        severity: "error",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "cancelled":
        return "default";
      default:
        return "warning";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!employeeData) {
    return (
      <Box p={3}>
        <Alert severity="error">Employee data not available</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Leave Management
      </Typography>

      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Apply for Leave" />
          <Tab label={`My Leaves (${myLeaves.length})`} />
          {pendingApprovals.length > 0 && (
            <Tab label={`Pending Approvals (${pendingApprovals.length})`} />
          )}
        </Tabs>

        {/* Tab 1: Apply for Leave */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Leave Application Form */}
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Apply for New Leave
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!errors.leaveType}>
                    <InputLabel>Leave Type *</InputLabel>
                    <Select
                      value={selectedLeaveType}
                      label="Leave Type *"
                      onChange={(e) => {
                        setSelectedLeaveType(e.target.value);
                        setErrors((prev) => ({ ...prev, leaveType: "" }));
                      }}
                      disabled={submitting}
                    >
                      {leaveTypes.length === 0 ? (
                        <MenuItem value="" disabled>
                          No leave types available
                        </MenuItem>
                      ) : (
                        leaveTypes.map((type) => (
                          <MenuItem key={type._id} value={type._id}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={type.code}
                                size="small"
                                sx={{
                                  backgroundColor: type.color,
                                  color: "white",
                                }}
                              />
                              <Typography>{type.name}</Typography>
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {errors.leaveType && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 0.5, ml: 1.5 }}
                      >
                        {errors.leaveType}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Date *"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setErrors((prev) => ({ ...prev, startDate: "" }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: new Date().toISOString().split("T")[0],
                    }}
                    error={!!errors.startDate}
                    helperText={errors.startDate}
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Date *"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setErrors((prev) => ({ ...prev, endDate: "" }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: startDate || new Date().toISOString().split("T")[0],
                    }}
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={halfDay}
                        onChange={(e) => setHalfDay(e.target.checked)}
                        disabled={submitting}
                      />
                    }
                    label="Half Day Leave"
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ ml: 4 }}
                  >
                    Enable this if you&apos;re applying for half-day leave only
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reason"
                    multiline
                    rows={3}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setErrors((prev) => ({ ...prev, reason: "" }));
                    }}
                    placeholder="Enter reason for leave (optional)..."
                    helperText="Provide a brief explanation for your leave request (optional)"
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={
                      submitting ? <CircularProgress size={20} /> : <Send />
                    }
                    onClick={handleApplyLeave}
                    disabled={submitting}
                  >
                    Submit Leave Request
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            {/* Leave Balance Summary */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Leave Balance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {leaveBalance.length === 0 ? (
                <Alert severity="info">No leave balance available</Alert>
              ) : (
                <List>
                  {leaveBalance.map((leave, index) => (
                    <Paper key={index} sx={{ mb: 1, p: 2 }}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Chip
                          label={leave.leaveType.code}
                          size="small"
                          sx={{
                            backgroundColor: leave.leaveType.color,
                            color: "white",
                          }}
                        />
                        <Typography variant="h6">
                          {leave.available} days
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {leave.leaveType.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Used: {leave.used} / {leave.maxDaysPerYear}
                      </Typography>
                      {leave.currentPeriod && (
                        <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                          Period: {leave.currentPeriod.label}
                        </Typography>
                      )}
                      {leave.carriedForward > 0 && (
                        <Typography variant="caption" color="success.main" display="block">
                          +{leave.carriedForward} days carried forward
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </List>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: My Leaves */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            My Leave Requests
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {myLeaves.length === 0 ? (
            <Alert severity="info">No leave requests found</Alert>
          ) : (
            <List>
              {myLeaves.map((leave) => (
                <Paper key={leave._id} sx={{ mb: 2, p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Chip
                        label={leave.leaveType.code}
                        sx={{
                          backgroundColor: leave.leaveType.color,
                          color: "white",
                        }}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {leave.leaveType.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Dates
                      </Typography>
                      <Typography variant="body1">
                        {new Date(leave.startDate).toLocaleDateString()} -{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption">
                        {leave.totalDays} day{leave.totalDays > 1 ? "s" : ""}
                        {leave.halfDay && " (Half Day)"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Chip
                        label={leave.status.toUpperCase()}
                        color={getStatusColor(leave.status)}
                        size="small"
                      />
                      {leave.status === "approved" ? (
                        leave.approvedBy ? (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ mt: 1 }}
                          >
                            Approved by: {leave.approvedBy.name}
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ mt: 1 }}
                          >
                            Approved by: Employer
                          </Typography>
                        )
                      ) : leave.status === "pending" && leave.approver ? (
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 1 }}
                        >
                          Approver: {leave.approver.name}
                        </Typography>
                      ) : null}
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      {leave.status === "pending" && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              leaveRequest: leave,
                              action: "cancel",
                            })
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </Grid>
                    {leave.reason && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Reason: {leave.reason}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Tab 3: Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Leave Requests Pending Your Approval
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List>
              {pendingApprovals.map((leave) => (
                <Paper key={leave._id} sx={{ mb: 2, p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle1">
                        {leave.employee.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {leave.employee.designation || "Employee"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Chip
                        label={leave.leaveType.code}
                        sx={{
                          backgroundColor: leave.leaveType.color,
                          color: "white",
                        }}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {leave.leaveType.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Dates
                      </Typography>
                      <Typography variant="body1">
                        {new Date(leave.startDate).toLocaleDateString()} -{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption">
                        {leave.totalDays} day{leave.totalDays > 1 ? "s" : ""}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              leaveRequest: leave,
                              action: "approve",
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Block />}
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              leaveRequest: leave,
                              action: "reject",
                            })
                          }
                        >
                          Reject
                        </Button>
                      </Box>
                    </Grid>
                    {leave.reason && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Reason: {leave.reason}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))}
            </List>
          </TabPanel>
        )}
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() =>
          setActionDialog({ open: false, leaveRequest: null, action: null })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === "approve" && "Approve Leave Request"}
          {actionDialog.action === "reject" && "Reject Leave Request"}
          {actionDialog.action === "cancel" && "Cancel Leave Request"}
        </DialogTitle>
        <DialogContent>
          {actionDialog.leaveRequest && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Employee: {actionDialog.leaveRequest.employee?.name || "You"}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Leave Type: {actionDialog.leaveRequest.leaveType.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Duration:{" "}
                {new Date(
                  actionDialog.leaveRequest.startDate
                ).toLocaleDateString()}{" "}
                -{" "}
                {new Date(
                  actionDialog.leaveRequest.endDate
                ).toLocaleDateString()}{" "}
                ({actionDialog.leaveRequest.totalDays} days)
              </Typography>
              <TextField
                fullWidth
                label="Remarks (Optional)"
                multiline
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setActionDialog({ open: false, leaveRequest: null, action: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionDialog.action === "approve" ? "success" : "error"}
            onClick={handleLeaveAction}
          >
            Confirm {actionDialog.action}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeLeaves;
