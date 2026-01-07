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
  Tooltip,
  Paper,
  Divider,
  Stack,
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
  Info,
} from "@mui/icons-material";
import QuickActions from "./QuickActions";
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

  // Manager Dashboard (if manager)
  const { data: managerData } = useQuery({
    queryKey: ["managerDashboard", employeeId],
    queryFn: () => fetchManagerDashboard(employeeId),
    enabled: !!employeeId,
  });

  const isManager = (managerData?.team?.total || 0) > 0 || pendingApprovals.length > 0;

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
          <QuickActions isClockedIn={isClockedIn} view="dashboard" />
        </Box>

        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {loadingAttendance ? (
            <Grid item xs={12} display="flex" justifyContent="center" p={2}>
              <CircularProgress size={30} />
            </Grid>
          ) : (
            <>
              {[
                {
                  label: 'Attendance',
                  val: attendanceStats?.workedDays || 0,
                  unit: 'Days',
                  icon: CheckCircle,
                  color: 'primary'
                },
                {
                  label: 'Avg Daily',
                  val: attendanceStats?.workedDays ? Math.round((attendanceStats.totalHours / attendanceStats.workedDays) * 10) / 10 : 0,
                  unit: 'Hours',
                  icon: AccessTime,
                  color: 'secondary'
                },
                {
                  label: 'On-Time Score',
                  val: (attendanceStats?.workedDays && attendanceStats?.workedDays > 0)
                    ? Math.round(((attendanceStats.workedDays - (attendanceStats.lateCount || 0)) / attendanceStats.workedDays) * 100)
                    : 0,
                  unit: '%',
                  icon: Fingerprint,
                  color: 'success'
                },
                {
                  label: 'Total OT',
                  val: attendanceStats?.totalOT || 0,
                  unit: 'Hours',
                  icon: TrendingUp,
                  color: 'info'
                },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <Grid item xs={6} sm={4} md={3} key={idx}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeft: `4px solid`,
                        borderColor: `${stat.color}.main`,
                        height: '100%',
                        bgcolor: 'background.paper',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">
                              {stat.label}
                            </Typography>
                            {stat.label === 'On-Time Score' && (
                              <Tooltip title="Your arrival punctuality percentage." arrow>
                                <Info sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
                              </Tooltip>
                            )}
                          </Stack>
                          <Typography variant="h4" fontWeight="bold" color={`${stat.color}.main`}>
                            {stat.val} <Typography variant="caption" color="text.secondary" fontWeight="bold">{stat.unit}</Typography>
                          </Typography>
                        </Box>
                        <Icon sx={{ color: `${stat.color}.light`, opacity: 0.5, fontSize: 32 }} />
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </>
          )}
        </Grid>

        <Grid container spacing={2}>
          {/* Work Hours Graph */}
          <Grid item xs={12} lg={8}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">Weekly Performance</Typography>
                  <Typography variant="caption" color="text.secondary">Last 7 Days</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 220 }}>
                  {loadingWeekly ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    <AttendanceStatsChart data={weeklyRecords} height={220} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Leave Balances List (more compact) */}
          <Grid item xs={12} lg={4}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
              <CardHeader
                title={<Typography variant="subtitle1" fontWeight="bold">Leave Balances</Typography>}
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
              />
              <CardContent sx={{ p: 0 }}>
                {loadingLeaveBalance ? (
                  <Box p={2} textAlign="center"><CircularProgress size={20} /></Box>
                ) : filteredLeaveBalance.length === 0 ? (
                  <Box p={2}><Typography variant="body2" color="text.secondary">No balances</Typography></Box>
                ) : (
                  <List disablePadding>
                    {filteredLeaveBalance.map((leave: any, index: number) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ py: 1 }}>
                          <Box sx={{ width: 8, height: 32, borderRadius: 1, bgcolor: leave.leaveType.color || 'primary.main', mr: 2 }} />
                          <ListItemText
                            primary={leave.leaveType.name}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                          />
                          <Box textAlign="right">
                            <Typography variant="body2" fontWeight="bold">{leave.available}</Typography>
                            <Typography variant="caption" color="text.secondary">days left</Typography>
                          </Box>
                        </ListItem>
                        {index < filteredLeaveBalance.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Sections */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                {
                  title: 'Upcoming Leaves',
                  data: upcomingLeaves,
                  loading: loadingUpcomingLeaves,
                  icon: <CalendarToday color="primary" sx={{ fontSize: 18 }} />,
                  emptyMsg: 'No upcoming leaves',
                  viewAllPath: '/user?userPageSelect=leaves&tab=history'
                },
                {
                  title: 'Recent Leaves',
                  data: recentLeaves,
                  loading: loadingPastLeaves,
                  icon: <EventBusy color="warning" sx={{ fontSize: 18 }} />,
                  emptyMsg: 'No recent leaves',
                  viewAllPath: '/user?userPageSelect=leaves&tab=history'
                },
                {
                  title: 'Recent Salaries',
                  data: recentSalaries,
                  loading: loadingSalaries,
                  icon: <Receipt color="primary" sx={{ fontSize: 18 }} />,
                  emptyMsg: 'No records found',
                  viewAllPath: '/user?userPageSelect=payslips&tab=payslips',
                  isSalary: true
                },
                {
                  title: 'Recent Payments',
                  data: recentPayments,
                  loading: loadingPayments,
                  icon: <Receipt color="secondary" sx={{ fontSize: 18 }} />,
                  emptyMsg: 'No records found',
                  viewAllPath: '/user?userPageSelect=payslips&tab=payments',
                  isPayment: true
                },
              ].map((section, sIdx) => (
                <Grid item xs={12} sm={6} md={3} key={sIdx}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">{section.title}</Typography>
                        <Button
                          size="small"
                          onClick={() => router.push(section.viewAllPath)}
                          sx={{ minWidth: 'auto', p: 0.5, fontSize: '0.7rem' }}
                        >
                          View All
                        </Button>
                      </Box>
                      <Divider sx={{ mb: 1 }} />
                      {section.loading ? (
                        <Box display="flex" justifyContent="center" p={1}><CircularProgress size={20} /></Box>
                      ) : section.data.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>{section.emptyMsg}</Typography>
                      ) : (
                        <List dense disablePadding>
                          {section.data.map((item: any, iIdx: number) => (
                            <ListItem key={iIdx} disableGutters sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 28 }}>{section.icon}</ListItemIcon>
                              <ListItemText
                                primary={section.isSalary ? formatPeriodLabel(item.period) : section.isPayment ? `LKR ${item.amount?.toLocaleString()}` : item.leaveType.name}
                                secondary={section.isSalary ? `LKR ${item.finalSalary?.toLocaleString()}` : section.isPayment ? dayjs(item.paymentDate).format("DD MMM") : `${dayjs(item.startDate).format("DD MMM")}`}
                                primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium', noWrap: true }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {isManager && (
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '4px solid', borderColor: 'info.main' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Team Oversight</Typography>
                      <Typography variant="caption" color="text.secondary">Quick view of team status</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => router.push("/user?userPageSelect=teamManagement")}
                      sx={{ fontWeight: 'bold' }}
                    >
                      Manage Team
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Pending Leaves</Typography>
                      <Chip label={managerData?.leaves?.totalPending || 0} size="small" color={managerData?.leaves?.totalPending > 0 ? "warning" : "default"} />
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Pending Attendance</Typography>
                      <Chip label={managerData?.attendance?.totalPending || 0} size="small" color={managerData?.attendance?.totalPending > 0 ? "info" : "default"} />
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Team Members</Typography>
                      <Typography variant="body2" fontWeight="bold">{managerData?.team?.total || 0}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {pendingApprovals.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '4px solid', borderColor: 'warning.main' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="subtitle1" fontWeight="bold">Immediate Actions</Typography>
                    <Chip label={pendingApprovals.length} color="warning" size="small" sx={{ fontWeight: 'bold' }} />
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <List dense disablePadding>
                    {pendingApprovals.slice(0, 3).map((request: any) => (
                      <ListItem key={request._id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={request.employee.name}
                          secondary={`${request.leaveType.name} • ${request.totalDays} day${request.totalDays > 1 ? "s" : ""}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        />
                        <Button size="small" variant="outlined" onClick={() => router.push("/user?userPageSelect=teamManagement")}>Review</Button>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {isManager && managerData && (
            <Grid item xs={12}>
              <Box mt={2} mb={1}>
                <Typography variant="h6" fontWeight="bold">Team Management</Typography>
                <Typography variant="caption" color="text.secondary">Admin & Oversight Overview</Typography>
              </Box>
              <Grid container spacing={1.5}>
                {[
                  { label: 'Team Members', val: managerData.team.total, icon: <Groups />, color: 'primary.main' },
                  { label: 'Pending Leaves', val: managerData.leaves.totalPending, icon: <Pending />, color: 'warning.main' },
                  { label: 'Depts', val: Object.keys(managerData.team.byDepartment).length, icon: <Work />, color: 'success.main' },
                ].map((mStat, msIdx) => (
                  <Grid item xs={4} key={msIdx}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight="bold" color={mStat.color}>{mStat.val}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="medium">{mStat.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EmployeeDashboard;
