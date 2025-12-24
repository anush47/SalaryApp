"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardHeader,
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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Divider,
  Radio,
  RadioGroup,
  FormLabel,
} from "@mui/material";
import {
  Send,
  Cancel,
  CheckCircle,
  Block,
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { FileUpload } from "@/app/components/FileUpload"; // Imported
import { FileViewer } from "@/app/components/FileViewer"; // Imported
import LeaveRequestsManagement from "@/app/user/mycompanies/[id]/leaves/clientComponents/leaveRequestsManagement";
import { fetchLeaveTypes } from "@/app/lib/api/leaveTypeApi";
import {
  fetchLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
} from "@/app/lib/api/leaveRequestApi";
import { fetchLeaveBalance, fetchEmployees } from "@/app/lib/api/employeeApi";
import { getNICDetails } from "@/app/lib/nicUtils";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { uploadFile } from "@/app/lib/uploadService";

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
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  // Apply form state
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<"morning" | "afternoon">("morning");
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [reason, setReason] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]); // New state for attachments


  const getCleanFilename = (key: string) => {
    try {
      // Key: companies/{cid}/leaves/{eid}/{timestamp}-{filename}
      // We want to remove the timestamp part (first 13 digits + dash) if possible, or just take the last part.
      // Usually format is: .../1234567890123-filename.ext
      const parts = key.split('/');
      const fileNameWithTimestamp = parts[parts.length - 1];
      // Splitting by first dash which usually separates timestamp
      const match = fileNameWithTimestamp.match(/^\d{13}-(.+)$/);
      if (match && match[1]) {
        return match[1];
      }
      return fileNameWithTimestamp;
    } catch (e) {
      return "Attachment";
    }
  };

  // Validation errors
  const [errors, setErrors] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    startTime: "",
    endTime: "",
    halfDayPeriod: "",
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

  // 1. Fetch Employee Data
  const {
    data: employee,
    isLoading: loadingEmployee,
    error: employeeError,
  } = useQuery({
    queryKey: ["employee", user.id],
    queryFn: async () => {
      const employees = await fetchEmployees({ user: user.id });
      if (employees.length === 0) {
        throw new Error("Employee profile not found");
      }
      return employees[0];
    },
    staleTime: 5 * 60 * 1000,
  });

  const employeeId = employee?._id;
  const companyId = employee?.company?._id;

  // 2. Fetch Dependent Data
  const { data: leaveTypes = [], isLoading: loadingLeaveTypes } = useQuery({
    queryKey: ["leaveTypes", companyId],
    queryFn: () => fetchLeaveTypes(companyId),
    enabled: !!companyId,
  });

  const employeeNIC = employee?.nic;
  const { gender } = employeeNIC ? getNICDetails(employeeNIC) : { gender: "" };

  const filteredLeaveTypes = leaveTypes.filter((lt: any) => {
    if (!lt.gender || lt.gender === "all") return true;
    return lt.gender === gender;
  });

  const selectedTypeData = filteredLeaveTypes.find((lt: any) => lt._id === selectedLeaveType);
  const isShortLeave = selectedTypeData?.isShortLeave;

  const { data: leaveBalanceData, isLoading: loadingLeaveBalance } = useQuery({
    queryKey: ["leaveBalance", employeeId],
    queryFn: () => fetchLeaveBalance(employeeId),
    enabled: !!employeeId,
  });

  // Handle leave balance structure
  const leaveBalanceRaw = (leaveBalanceData as any)?.summary || (Array.isArray(leaveBalanceData) ? leaveBalanceData : []);

  const leaveBalance = leaveBalanceRaw.filter((leave: any) => {
    const leaveGender = leave.leaveType.gender;
    if (!leaveGender || leaveGender === "all") return true;
    return leaveGender === gender;
  });

  /* Removed unused fetching for myLeaves and pendingApprovals as they are now handled by child components */

  // Mutations
  const createLeaveMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      showSnackbar({
        message: "Leave request submitted successfully",
        severity: "success",
      });
      // Reset form
      setSelectedLeaveType("");
      setStartDate(null);
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setHalfDay(false);
      setHalfDayPeriod("morning");
      setReason("");
      setErrors({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        startTime: "",
        endTime: "",
        halfDayPeriod: "",
      });
      setAttachments([]); // Clear attachments
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["myLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingLeaves"] }); // From dashboard
    },
    onError: (error: any) => {
      showSnackbar({
        message: error.message || "Failed to submit leave request",
        severity: "error",
      });
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: updateLeaveRequest,
    onSuccess: (_, variables) => {
      showSnackbar({
        message: `Leave request ${variables.action}d successfully`,
        severity: "success",
      });
      setActionDialog({ open: false, leaveRequest: null, action: null });
      setRemarks("");
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["myLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["pendingApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["managerDashboard"] });
    },
    onError: (error: any) => {
      showSnackbar({
        message: error.message || `Failed to update leave request`,
        severity: "error",
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors = {
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
      startTime: "",
      endTime: "",
      halfDayPeriod: "",
    };

    let isValid = true;

    // Validate leave type
    if (!selectedLeaveType) {
      newErrors.leaveType = "Please select a leave type";
      isValid = false;
    }

    const selectedTypeData = leaveTypes.find((lt: any) => lt._id === selectedLeaveType);
    const isShortLeave = selectedTypeData?.isShortLeave;

    // Validate start date
    if (!startDate) {
      newErrors.startDate = "Date is required";
      isValid = false;
    } else {
      const today = dayjs().startOf('day');

      // Allow retroactive short leaves, but restrict others unless needed
      if (!isShortLeave && startDate.isBefore(today)) {
        newErrors.startDate = "Start date cannot be in the past";
        isValid = false;
      }
    }

    if (isShortLeave) {
      // Short Leave Validation
      if (!startTime) {
        newErrors.startTime = "Start time is required";
        isValid = false;
      }
      if (!endTime) {
        newErrors.endTime = "End time is required";
        isValid = false;
      }

      if (startTime && endTime) {
        if (endTime.isBefore(startTime)) {
          newErrors.endTime = "End time must be after start time";
          isValid = false;
        }

        // Check max duration
        if (selectedTypeData?.maxDurationMinutes) {
          const durationMinutes = endTime.diff(startTime, 'minute');
          if (durationMinutes > selectedTypeData.maxDurationMinutes) {
            newErrors.endTime = `Duration cannot exceed ${selectedTypeData.maxDurationMinutes} minutes`;
            isValid = false;
          }
        }
      }

    } else {
      // Normal Leave Validation

      // Validate end date
      if (!endDate) {
        newErrors.endDate = "End date is required";
        isValid = false;
      } else if (startDate && endDate) {
        if (endDate.isBefore(startDate)) {
          newErrors.endDate = "End date must be on or after start date";
          isValid = false;
        }

        // Check if date range is too long (optional check)
        const diffDays = endDate.diff(startDate, 'day') + 1;

        if (diffDays > 365) {
          newErrors.endDate = "Leave period cannot exceed 365 days";
          isValid = false;
        }
      }

      // Validate Half Day Period
      if (halfDay && !halfDayPeriod) {
        newErrors.halfDayPeriod = "Please select a period (Morning/Afternoon)";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ... (inside component)

  const handleApplyLeave = async () => {
    setErrors({
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
      startTime: "",
      endTime: "",
      halfDayPeriod: ""
    });

    if (!validateForm()) {
      showSnackbar({
        message: "Please fix the errors in the form",
        severity: "error",
      });
      return;
    }

    if (!employee || !startDate) return;

    const selectedTypeData = leaveTypes.find((lt: any) => lt._id === selectedLeaveType);
    const isShortLeave = selectedTypeData?.isShortLeave;

    if (!isShortLeave && !endDate) return;

    // Handle File Upload
    let uploadedKey = null;
    if (selectedFile) {
      setUploading(true);
      try {
        const result = await uploadFile({
          file: selectedFile,
          folder: 'leaves',
          entityId: employee._id || "temp", // Using employee ID as temp placeholder if easier, or just 'temp'
          companyId: companyId
        });
        uploadedKey = result.key;
      } catch (error: any) {
        showSnackbar({ message: error.message || "File upload failed", severity: "error" });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Use uploaded key if available, otherwise use existing attachments (if any were somehow set differently)
    // In this flow, we prefer the new upload.
    const finalAttachments = uploadedKey ? [uploadedKey] : attachments;

    // For short leave, start and end dates are the same day mixed with time
    let finalStartDate = startDate;
    let finalEndDate = isShortLeave ? startDate : endDate;

    if (isShortLeave && startTime && endTime) {
      finalStartDate = startDate.hour(startTime.hour()).minute(startTime.minute());
      finalEndDate = startDate.hour(endTime.hour()).minute(endTime.minute());
    }

    createLeaveMutation.mutate({
      employeeId: employee._id,
      leaveTypeId: selectedLeaveType,
      startDate: finalStartDate?.format('YYYY-MM-DD HH:mm') || "",
      endDate: finalEndDate?.format('YYYY-MM-DD HH:mm') || "",
      halfDay: isShortLeave ? false : halfDay,
      halfDayPeriod: (halfDay && !isShortLeave) ? halfDayPeriod : undefined,
      reason: reason.trim(),
      documents: finalAttachments,
    });
  };

  // Action dialog state has been removed as it is handled in LeaveRequestsManagement

  if (loadingEmployee) {
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

  if (employeeError) {
    return (
      <Box p={3}>
        <Alert severity="error">{(employeeError as Error).message}</Alert>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box p={3}>
        <Alert severity="error">Employee data not available</Alert>
      </Box>
    );
  }

  return (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
      <CardHeader
        title={
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexDirection={{ xs: "column", sm: "row" }}
            gap={2}
          >
            <Typography variant="h4" component="h1">
              Leave Management
            </Typography>
          </Box>
        }
      />
      <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Apply for Leave" />
          <Tab label="My Leaves" />
          <Tab label="Pending Approvals" />
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

              <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                        disabled={createLeaveMutation.isPending}
                      >
                        {loadingLeaveTypes ? (
                          <MenuItem value="" disabled>
                            <Box display="flex" alignItems="center" gap={1}>
                              <CircularProgress size={20} />
                              <Typography>Loading leave types...</Typography>
                            </Box>
                          </MenuItem>
                        ) : filteredLeaveTypes.length === 0 ? (
                          <MenuItem value="" disabled>
                            No leave types available
                          </MenuItem>
                        ) : (
                          filteredLeaveTypes.map((type: any) => (
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
                    <DatePicker
                      label={isShortLeave ? "Date *" : "Start Date *"}
                      value={startDate}
                      onChange={(newValue) => {
                        setStartDate(newValue);
                        setErrors((prev) => ({ ...prev, startDate: "" }));
                      }}
                      minDate={!isShortLeave ? dayjs() : undefined} // Relax constraint for short leave if needed, or keep dayjs()
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.startDate,
                          helperText: errors.startDate,
                          disabled: createLeaveMutation.isPending
                        }
                      }}
                    />
                  </Grid>

                  {!isShortLeave && (
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="End Date *"
                        value={endDate}
                        onChange={(newValue) => {
                          setEndDate(newValue);
                          setErrors((prev) => ({ ...prev, endDate: "" }));
                        }}
                        minDate={startDate || dayjs()}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.endDate,
                            helperText: errors.endDate,
                            disabled: createLeaveMutation.isPending
                          }
                        }}
                      />
                    </Grid>
                  )}

                  {isShortLeave && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TimePicker
                          label="Start Time *"
                          value={startTime}
                          onChange={(newValue) => {
                            setStartTime(newValue);
                            setErrors((prev) => ({ ...prev, startTime: "" }));
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.startTime,
                              helperText: errors.startTime,
                              disabled: createLeaveMutation.isPending
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TimePicker
                          label="End Time *"
                          value={endTime}
                          onChange={(newValue) => {
                            setEndTime(newValue);
                            setErrors((prev) => ({ ...prev, endTime: "" }));
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.endTime,
                              helperText: errors.endTime,
                              disabled: createLeaveMutation.isPending
                            }
                          }}
                        />
                      </Grid>
                    </>
                  )}

                  {!isShortLeave && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={halfDay}
                                onChange={(e) => setHalfDay(e.target.checked)}
                                disabled={createLeaveMutation.isPending}
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
                        </Box>

                        {halfDay && (
                          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, pt: 1 }}>
                            <FormLabel id="half-day-period-label">Half Day Period *</FormLabel>
                            <RadioGroup
                              row
                              aria-labelledby="half-day-period-label"
                              name="half-day-period"
                              value={halfDayPeriod}
                              onChange={(e) => {
                                setHalfDayPeriod(e.target.value as "morning" | "afternoon");
                                setErrors((prev) => ({ ...prev, halfDayPeriod: "" }));
                              }}
                            >
                              <FormControlLabel value="morning" control={<Radio size="small" />} label="Morning" />
                              <FormControlLabel value="afternoon" control={<Radio size="small" />} label="Afternoon" />
                            </RadioGroup>
                            {errors.halfDayPeriod && (
                              <Typography variant="caption" color="error">
                                {errors.halfDayPeriod}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  )}

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
                      disabled={createLeaveMutation.isPending}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Attachment (Optional)
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {/* Show 'Remove & Replace' if we have an uploaded attachment (from history) OR a newly selected file */}
                      {(attachments.length > 0 || selectedFile) ? (
                        <Box display="flex" flexDirection="column" gap={1} alignItems="flex-start">
                          <Box display="flex" alignItems="center" gap={2} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            {selectedFile ? (
                              <Box>
                                <Typography variant="body2">{selectedFile.name}</Typography>
                                <Typography variant="caption" color="text.secondary">Ready to upload</Typography>
                              </Box>
                            ) : (
                              <FileViewer fileKey={attachments[0]} filename={getCleanFilename(attachments[0])} showPreview={true} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            To change the file, please remove the current one.
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => {
                              setAttachments([]);
                              setSelectedFile(null);
                            }}
                          >
                            Remove & Replace
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ maxWidth: 300 }}>
                          <FileUpload
                            folder="leaves"
                            entityId={employee?._id || "temp"}
                            companyId={companyId}
                            label="Add Attachment"
                            maxSizeMB={10}
                            mode="manual"
                            accept="image/*,application/pdf"
                            onFileSelect={(file) => setSelectedFile(file)}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>


                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={
                        createLeaveMutation.isPending ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Send />
                        )
                      }
                      onClick={handleApplyLeave}
                      disabled={createLeaveMutation.isPending}
                    >
                      Submit Leave Request
                    </Button>
                  </Grid>
                </Grid>
              </LocalizationProvider>
            </Grid>

            {/* Leave Balance Summary */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Leave Balance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {loadingLeaveBalance ? (
                  <Grid item xs={12} display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={30} />
                  </Grid>
                ) : leaveBalance.length === 0 ? (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ width: '100%' }}>No leave balance available</Alert>
                  </Grid>
                ) : (
                  leaveBalance.map((leave: any, index: number) => (
                    <Grid item xs={12} key={index}>
                      <Card variant="outlined">
                        <CardContent>
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
                              {leave.available}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {leave.leaveType.name}
                          </Typography>

                          <Typography variant="caption" color="text.secondary" display="block">
                            Used: {leave.used} / {leave.maxDaysPerPeriod}
                          </Typography>

                          {leave.currentPeriod && (
                            <Typography
                              variant="caption"
                              color="primary"
                              display="block"
                              sx={{ mt: 0.5 }}
                            >
                              Period: {leave.currentPeriod.label}
                            </Typography>
                          )}
                          {leave.carriedForwardBalance > 0 && (
                            <Typography
                              variant="caption"
                              color="success.main"
                              display="block"
                            >
                              +{leave.carriedForwardBalance} carried
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: My Leaves */}
        <TabPanel value={tabValue} index={1}>
          <LeaveRequestsManagement user={user} companyId={companyId} mode="my-requests" />
        </TabPanel>

        {/* Tab 3: Pending Approvals */}
        {/* Tab 3: Pending Approvals */}
        <TabPanel value={tabValue} index={2}>
          <LeaveRequestsManagement user={user} companyId={companyId} mode="pending-approvals" />
        </TabPanel>
      </CardContent>

      {/* Action Dialog */}

    </Card >
  );
};

export default EmployeeLeaves;
