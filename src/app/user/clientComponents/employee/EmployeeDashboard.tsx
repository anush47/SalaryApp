"use client";
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  EventNote,
  Receipt,
  Person,
  CheckCircle,
  Pending,
  CalendarToday,
  Groups,
  Work,
  AccessTime,
  TrendingUp,
  TrendingDown,
  WorkOff,
  Fingerprint,
  EventBusy,
} from "@mui/icons-material";
import AttendanceStatsChart from "@/app/components/attendance/AttendanceStatsChart";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useAttendanceAggregation } from "@/app/hooks/useAttendanceAggregation";
import { getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import {
  fetchEmployees,
  fetchLeaveBalance,
  fetchManagerDashboard,
} from "@/app/lib/api/employeeApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { fetchSalaries } from "@/app/lib/api/salaryApi";
import { fetchSalaryPayments } from "@/app/lib/api/salaryPaymentApi";
import { getNICDetails } from "@/app/lib/nicUtils";
import { formatPeriodLabel } from "@/app/lib/formatUtils";

interface UserProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
}

const EmployeeDashboard: React.FC<UserProps> = ({ user }) => {
  const router = useRouter();

  // 1. Fetch Employee Data
  const {
    data: employee,
    isLoading: loadingEmployee,
    error: employeeError
  } = useQuery({
    queryKey: ["employee", user.id],
    queryFn: async () => {
      const employees = await fetchEmployees({ user: user.id });
      if (employees.length === 0) {
        throw new Error("Employee profile not found. Please contact your employer.");
      }
      return employees[0];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Dependent Data
  const employeeId = employee?._id;
  const companyId = employee?.company?._id;

  // Leave Balance
  const { data: leaveBalance = [], isLoading: loadingLeaveBalance } = useQuery({
    queryKey: ["leaveBalance", employeeId],
    queryFn: () => fetchLeaveBalance(employeeId),
    enabled: !!employeeId,
  });

  // Upcoming Leaves
  const { data: upcomingLeavesData, isLoading: loadingUpcomingLeaves } = useQuery({
    queryKey: ["upcomingLeaves", companyId, employeeId],
    queryFn: () =>
      fetchLeaveRequests(companyId, {
        employeeId: employeeId,
        status: "approved",
      }),
    enabled: !!companyId && !!employeeId,
  });

  // Recent Leaves (Approved/Past)
  const { data: pastLeavesData, isLoading: loadingPastLeaves } = useQuery({
    queryKey: ["pastLeaves", companyId, employeeId],
    queryFn: () =>
      fetchLeaveRequests(companyId, {
        employeeId: employeeId,
        status: "approved",
      }), // We'll filter for past dates in useMemo
    enabled: !!companyId && !!employeeId,
  });

  // Today's Attendance logs to determine clock status
  const { data: todayLogsData } = useQuery({
    queryKey: ["todayAttendance", employeeId],
    queryFn: () => getAttendanceLogs(companyId, employeeId, dayjs().format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")),
    enabled: !!companyId && !!employeeId,
    refetchInterval: 30000, // Refetch every 30s to keep status fresh
  });

  const todayLogs = todayLogsData?.data || [];
  const lastLog = todayLogs.length > 0 ? todayLogs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[todayLogs.length - 1] : null;
  const isClockedIn = lastLog?.type === 'in';

  // Last 7 days data for graph
  const { records: weeklyRecords, loading: loadingWeekly } = useAttendanceAggregation(
    employeeId,
    companyId,
    dayjs().subtract(6, 'days').format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD")
  );


  // Payments
  const { data: paymentsData = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["salary-payments", employeeId],
    queryFn: () => fetchSalaryPayments({ employeeId }),
    enabled: !!employeeId,
  });

  const recentPayments = useMemo(() => {
    return (paymentsData || [])
      .sort((a: any, b: any) => {
        // Prioritize pending acknowledgement
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
      })
      .slice(0, 3);
  }, [paymentsData]);

  const upcomingLeaves = useMemo(() => {
    if (!upcomingLeavesData?.data) return [];
    const today = dayjs().startOf('day');
    return (upcomingLeavesData.data || [])
      .filter((l: any) => !!l.employee && (dayjs(l.startDate).isAfter(today) || dayjs(l.startDate).isSame(today)))
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [upcomingLeavesData]);

  const recentLeaves = useMemo(() => {
    if (!pastLeavesData?.data) return [];
    const today = dayjs().startOf('day');
    return (pastLeavesData.data || [])
      .filter((l: any) => !!l.employee && dayjs(l.endDate).isBefore(today))
      .sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      .slice(0, 3);
  }, [pastLeavesData]);

  // Pending Approvals (for managers)
  const { data: pendingApprovalsData, isLoading: loadingPendingApprovals } = useQuery({
    queryKey: ["pendingApprovals", companyId],
    queryFn: () =>
      fetchLeaveRequests(companyId, {
        pendingApprovals: true,
      }),
    enabled: !!companyId,
  });

  const pendingApprovals = useMemo(() => {
    return (pendingApprovalsData?.data || []).filter((l: any) => !!l.employee);
  }, [pendingApprovalsData]);
  const isManager = pendingApprovals.length > 0;

  // Manager Dashboard (if manager)
  const { data: managerData } = useQuery({
    queryKey: ["managerDashboard", employeeId],
    queryFn: () => fetchManagerDashboard(employeeId),
    enabled: !!employeeId && isManager,
  });

  // Recent Salaries
  const { data: recentSalariesResponse, isLoading: loadingSalaries } = useQuery({
    queryKey: ["recentSalaries", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/salaries?employee=${employeeId}&limit=3`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!employeeId
  });

  const recentSalaries = recentSalariesResponse?.salaries || [];

  // 3. Fetch Attendance Statistics for current month
  const { stats: attendanceStats, loading: loadingAttendance } = useAttendanceAggregation(
    employeeId,
    companyId,
    dayjs().startOf('month').format("YYYY-MM-DD"),
    dayjs().endOf('month').format("YYYY-MM-DD")
  );

  // Helper for leave balance summary logic
  // If fetchLeaveBalance returns { summary: [] }, accessing it:
  const actualLeaveBalance = (leaveBalance as any)?.summary || (Array.isArray(leaveBalance) ? leaveBalance : []);

  // Filter Leave Balance by Gender
  const employeeNIC = employee?.nic;
  const { gender } = employeeNIC ? getNICDetails(employeeNIC) : { gender: "" };

  const filteredLeaveBalance = actualLeaveBalance.filter((leave: any) => {
    const leaveGender = leave.leaveType.gender;
    if (!leaveGender || leaveGender === "all") return true;
    return leaveGender === gender;
  });

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
        <Alert severity="warning">Employee data not available</Alert>
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
      <CardContent
        sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
      >
        {/* Welcome Card */}
        <Card
          variant="outlined"
          sx={{ mb: 2, borderLeft: '4px solid', borderLeftColor: 'primary.main', boxShadow: 'none' }}
        >
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexDirection={{ xs: "row", sm: "row" }}
              gap={2}
            >
              <Box
                display="flex"
                alignItems="center"
                gap={2}
                textAlign="left"
              >
                <Avatar
                  src={user.image}
                  alt={user.name}
                  sx={{ width: 56, height: 56, border: "2px solid", borderColor: 'divider' }}
                />
                <Box>
                  <Typography
                    variant="h5"
                    component="h1"
                    fontWeight="bold"
                  >
                    Hi, {employee.name}!
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {employee.designation || "Employee"} • #{employee.memberNo}
                    </Typography>
                    <Chip
                      label={isClockedIn ? "Clocked In" : "Clocked Out"}
                      size="small"
                      color={isClockedIn ? "success" : "default"}
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                    {lastLog && (
                      <Typography variant="caption" color="text.secondary">
                        at {dayjs(lastLog.timestamp).format("h:mm A")}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box textAlign="right" display={{ xs: 'none', md: 'block' }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {dayjs().format("dddd")}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="medium"
                >
                  {dayjs().format("MMM D, YYYY")}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Quick Actions at the top */}
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Fingerprint />}
                onClick={() => router.push("/user?userPageSelect=attendance&tab=live")}
                sx={{ py: 1.2, fontWeight: 'bold' }}
              >
                {isClockedIn ? "Clock Out / Attendance" : "Clock In / Attendance"}
              </Button>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<EventNote />}
                onClick={() => router.push("/user?userPageSelect=leaves&tab=apply")}
                sx={{ py: 1.2 }}
              >
                Apply Leave
              </Button>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Receipt />}
                onClick={() => router.push("/user?userPageSelect=payslips&tab=payslips")}
                sx={{ py: 1.2 }}
              >
                Payslips
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Person />}
                onClick={() => router.push("/user?userPageSelect=profile")}
                sx={{ py: 1.2 }}
              >
                My Profile
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {loadingAttendance ? (
            <Grid item xs={12} display="flex" justifyContent="center" p={2}>
              <CircularProgress size={30} />
            </Grid>
          ) : (
            <>
              {[
                { label: 'Present', val: attendanceStats?.workedDays || 0, icon: <CheckCircle sx={{ color: 'success.main', opacity: 0.8, fontSize: 24 }} />, color: 'success.main' },
                { label: 'Absent', val: attendanceStats?.absent || 0, icon: <WorkOff sx={{ color: 'error.main', opacity: 0.8, fontSize: 24 }} />, color: 'error.main' },
                { label: 'Leaves', val: attendanceStats?.leaves || 0, icon: <EventBusy sx={{ color: 'warning.main', opacity: 0.8, fontSize: 24 }} />, color: 'warning.main' },
                { label: 'Hours', val: `${attendanceStats?.totalHours || 0}h`, icon: <AccessTime sx={{ color: 'primary.main', opacity: 0.8, fontSize: 24 }} />, color: 'primary.main' },
                { label: 'OT', val: `${attendanceStats?.totalOT || 0}h`, icon: <TrendingUp sx={{ color: 'secondary.main', opacity: 0.8, fontSize: 24 }} />, color: 'secondary.main' },
              ].map((stat, idx) => (
                <Grid item xs={6} sm={4} md={2.4} key={idx}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: '3px solid',
                      borderLeftColor: stat.color,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => router.push('/user?userPageSelect=attendance&tab=history')}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{stat.label}</Typography>
                          <Typography variant="h5" fontWeight="bold">{stat.val}</Typography>
                        </Box>
                        {stat.icon}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </>
          )}
        </Grid>

        <Grid container spacing={2}>
          {/* Work Hours Graph - Show only if data exists */}
          {weeklyRecords.some(r => r.durationMinutes > 0) && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Work Hours (Last 7 Days)
                  </Typography>
                  <Box sx={{ width: '100%', mt: 2 }}>
                    {loadingWeekly ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                        <CircularProgress size={30} />
                      </Box>
                    ) : (
                      <AttendanceStatsChart data={weeklyRecords} height={200} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Upcoming Leaves */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="subtitle1" fontWeight="bold">Upcoming Leaves</Typography>
                  <Button
                    size="small"
                    onClick={() => router.push("/user?userPageSelect=leaves&tab=history")}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {loadingUpcomingLeaves ? (
                  <Box display="flex" justifyContent="center" p={1}>
                    <CircularProgress size={20} />
                  </Box>
                ) : upcomingLeaves.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No upcoming leaves</Typography>
                ) : (
                  <List dense disablePadding>
                    {upcomingLeaves.map((leave: any) => (
                      <ListItem key={leave._id} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CalendarToday color="primary" sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={leave.leaveType.name}
                          secondary={`${dayjs(leave.startDate).format("DD MMM")} - ${dayjs(leave.endDate).format("DD MMM")}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          label={leave.status}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Leaves */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="subtitle1" fontWeight="bold">Recent Leaves</Typography>
                  <Button
                    size="small"
                    onClick={() => router.push("/user?userPageSelect=leaves&tab=history")}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {loadingPastLeaves ? (
                  <Box display="flex" justifyContent="center" p={1}>
                    <CircularProgress size={20} />
                  </Box>
                ) : recentLeaves.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No recent leaves</Typography>
                ) : (
                  <List dense disablePadding>
                    {recentLeaves.map((leave: any) => (
                      <ListItem key={leave._id} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <EventBusy color="warning" sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={leave.leaveType.name}
                          secondary={`${dayjs(leave.startDate).format("DD MMM")} - ${dayjs(leave.endDate).format("DD MMM")}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          label="Taken"
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Salaries */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="subtitle1" fontWeight="bold">Recent Salaries</Typography>
                  <Button
                    size="small"
                    onClick={() => router.push("/user?userPageSelect=payslips&tab=payslips")}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {loadingSalaries ? (
                  <Box display="flex" justifyContent="center" p={1}>
                    <CircularProgress size={20} />
                  </Box>
                ) : recentSalaries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No records found</Typography>
                ) : (
                  <List dense disablePadding>
                    {recentSalaries.map((salary: any) => (
                      <ListItem key={salary._id} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Receipt color="primary" sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={formatPeriodLabel(salary.period)}
                          secondary={`LKR ${salary.finalSalary?.toLocaleString()}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          label={(salary.paymentStatus || "unpaid").replace("_", " ")}
                          size="small"
                          color={salary.paymentStatus === "fully_paid" ? "success" : "warning"}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Payments */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="subtitle1" fontWeight="bold">Recent Payments</Typography>
                  <Button
                    size="small"
                    onClick={() => router.push("/user?userPageSelect=payslips&tab=payments")}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {loadingPayments ? (
                  <Box display="flex" justifyContent="center" p={1}>
                    <CircularProgress size={20} />
                  </Box>
                ) : recentPayments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No records found</Typography>
                ) : (
                  <List dense disablePadding>
                    {recentPayments.map((payment: any) => (
                      <ListItem key={payment._id} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Receipt color="secondary" sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={`LKR ${payment.amount?.toLocaleString()}`}
                          secondary={`${dayjs(payment.paymentDate).format("DD MMM")} (${payment.type})`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          label={payment.status === "acknowledged" ? "Received" : "Confirm"}
                          size="small"
                          color={payment.status === "acknowledged" ? "success" : "warning"}
                          variant={payment.status === "acknowledged" ? "outlined" : "filled"}
                          onClick={() => router.push("/user?userPageSelect=payslips&tab=payments")}
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Leave Balances
            </Typography>
            <Grid container spacing={1.5}>
              {loadingLeaveBalance ? (
                <Grid item xs={12} display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={30} />
                </Grid>
              ) : filteredLeaveBalance.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info">No leave types available</Alert>
                </Grid>
              ) : (
                filteredLeaveBalance.map((leave: any, index: number) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderLeft: '3px solid',
                        borderLeftColor: leave.leaveType.color || 'primary.main',
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" noWrap sx={{ maxWidth: '80px', fontSize: '0.65rem' }}>
                              {leave.leaveType.name}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold">
                              {leave.available}
                            </Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block' }}>
                              Used: {leave.used}
                            </Typography>
                            {leave.carriedForwardBalance > 0 && (
                              <Typography
                                variant="caption"
                                color="success.main"
                                sx={{ fontSize: '0.6rem' }}
                              >
                                +{leave.carriedForwardBalance}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Grid>

          {/* Pending Approvals (if manager) */}
          {pendingApprovals.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography variant="h6">Pending Approvals</Typography>
                    <Chip
                      label={pendingApprovals.length}
                      color="warning"
                      size="small"
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    {pendingApprovals.slice(0, 5).map((request: any) => (
                      <ListItem key={request._id}>
                        <ListItemIcon>
                          <Pending color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={request.employee.name}
                          secondary={`${request.leaveType.name} - ${request.totalDays
                            } day${request.totalDays > 1 ? "s" : ""}`}
                        />
                        <Button
                          size="small"
                          onClick={() =>
                            router.push("/user?userPageSelect=leaves")
                          }
                        >
                          Review
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}



          {/* Manager Dashboard Section */}
          {isManager && managerData && (
            <>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                  Team Management
                </Typography>
                <Divider />
              </Grid>

              {/* Team Statistics */}
              <Grid item xs={12} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: 'primary.main',
                  }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Team Members
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {managerData.team.total}
                        </Typography>
                      </Box>
                      <Groups
                        sx={{
                          fontSize: 48,
                          color: "primary.main",
                          opacity: 0.2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: 'warning.main',
                  }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Pending Approvals
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {managerData.leaves.totalPending}
                        </Typography>
                      </Box>
                      <Pending
                        sx={{
                          fontSize: 48,
                          color: "warning.main",
                          opacity: 0.2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: 'success.main',
                  }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Employee Types
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {Object.keys(managerData.team.byType).length}
                        </Typography>
                      </Box>
                      <Work
                        sx={{
                          fontSize: 48,
                          color: "success.main",
                          opacity: 0.2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: 'secondary.main',
                  }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Departments
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {Object.keys(managerData.team.byDepartment).length}
                        </Typography>
                      </Box>
                      <Work
                        sx={{
                          fontSize: 48,
                          color: "secondary.main",
                          opacity: 0.2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Team Members with Leave Balance */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Team Leave Overview
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                      <Grid container spacing={2}>
                        {managerData.team.members.map((member: any) => (
                          <Grid item xs={12} md={6} key={member._id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  mb={1}
                                >
                                  <Box>
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight="bold"
                                    >
                                      {member.name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {member.designation || "Employee"} • #
                                      {member.memberNo}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={member.employeeType || "permanent"}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </Box>
                                {member.leaveBalance &&
                                  member.leaveBalance.length > 0 ? (
                                  <Grid container spacing={1} mt={1}>
                                    {member.leaveBalance
                                      .slice(0, 4)
                                      .map((leave: any, idx: number) => (
                                        <Grid item xs={6} key={idx}>
                                          <Box
                                            sx={{
                                              p: 1,
                                              borderRadius: 1,
                                              bgcolor: "background.default",
                                            }}
                                          >
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {leave.leaveType.code}
                                            </Typography>
                                            <Typography
                                              variant="body2"
                                              fontWeight="bold"
                                            >
                                              {leave.available}/
                                              {leave.maxDaysPerPeriod}
                                            </Typography>
                                          </Box>
                                        </Grid>
                                      ))}
                                  </Grid>
                                ) : (
                                  <Alert severity="info" sx={{ mt: 1 }}>
                                    No leave data available
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
    </Card >
  );
};

export default EmployeeDashboard;
