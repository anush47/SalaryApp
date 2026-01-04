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
import { LeaveApplicationForm } from "@/app/user/clientComponents/leaves/LeaveApplicationForm"; // Imported
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
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const EmployeeLeaves: React.FC<UserProps> = ({ user }) => {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  // Apply form state removed (handled in LeaveApplicationForm)


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

  // Logic/Mutation removed (handled in component)

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
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Leave Application Form */}
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Apply for New Leave
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {employee && companyId && (
                <LeaveApplicationForm
                  companyId={companyId}
                  employeeId={employee._id}
                  onSuccess={() => setTabValue(1)}
                />
              )}
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
                      <Card
                        variant="outlined"
                        sx={{
                          borderLeft: '4px solid',
                          borderLeftColor: leave.leaveType.color || 'primary.main',
                        }}
                      >
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={1}
                          >
                            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                              {leave.leaveType.name}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold">
                              {leave.available}
                            </Typography>
                          </Box>

                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Used: {leave.used} / {leave.maxDaysPerPeriod}
                            </Typography>
                            {leave.carriedForwardBalance > 0 && (
                              <Typography
                                variant="caption"
                                color="success.main"
                                fontWeight="medium"
                              >
                                +{leave.carriedForwardBalance} carried
                              </Typography>
                            )}
                          </Box>

                          {leave.currentPeriod && (
                            <Typography
                              variant="caption"
                              color="primary"
                              display="block"
                              sx={{ mt: 0.5, fontSize: '0.65rem', opacity: 0.8 }}
                            >
                              Period: {leave.currentPeriod.label}
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
      </CardContent>

      {/* Action Dialog */}

    </Card >
  );
};

export default EmployeeLeaves;
