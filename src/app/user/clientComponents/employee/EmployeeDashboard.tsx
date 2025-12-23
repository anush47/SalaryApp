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
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import {
  fetchEmployees,
  fetchLeaveBalance,
  fetchManagerDashboard,
} from "@/app/lib/api/employeeApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { fetchSalaries } from "@/app/lib/api/salaryApi";

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

  const upcomingLeaves = useMemo(() => {
    if (!upcomingLeavesData?.data) return [];
    const today = new Date();
    return upcomingLeavesData.data
      .filter((req: any) => new Date(req.startDate) >= today)
      .slice(0, 5);
  }, [upcomingLeavesData]);

  // Pending Approvals (for managers)
  const { data: pendingApprovalsData, isLoading: loadingPendingApprovals } = useQuery({
    queryKey: ["pendingApprovals", companyId],
    queryFn: () =>
      fetchLeaveRequests(companyId, {
        pendingApprovals: true,
      }),
    enabled: !!companyId,
  });

  const pendingApprovals = pendingApprovalsData?.data || [];
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

  // Helper for leave balance summary logic
  // If fetchLeaveBalance returns { summary: [] }, accessing it:
  const actualLeaveBalance = (leaveBalance as any)?.summary || (Array.isArray(leaveBalance) ? leaveBalance : []);

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
              Dashboard
            </Typography>
          </Box>
        }
      />
      <CardContent
        sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
      >
        {/* Welcome Card */}
        <Card
          sx={{ mb: 3, bgcolor: "primary.main", color: "primary.contrastText" }}
        >
          <CardContent>
            <Box
              display="flex"
              alignItems={{ xs: "center", sm: "flex-start" }}
              justifyContent="space-between"
              flexDirection={{ xs: "column", sm: "row" }}
              gap={2}
            >
              <Box
                display="flex"
                alignItems="center"
                gap={2}
                flexDirection={{ xs: "column", sm: "row" }}
                textAlign={{ xs: "center", sm: "left" }}
              >
                <Avatar
                  src={user.image}
                  alt={user.name}
                  sx={{ width: 80, height: 80, border: "3px solid white" }}
                />
                <Box>
                  <Typography
                    variant="h4"
                    component="h1" // Semantic HTML
                    color="primary.contrastText"
                    gutterBottom
                  >
                    Welcome back, {employee.name}!
                  </Typography>
                  <Typography
                    variant="body1"
                    color="primary.contrastText"
                    sx={{ opacity: 0.9 }}
                  >
                    {employee.designation || "Employee"} • Member #
                    {employee.memberNo}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="primary.contrastText"
                    sx={{ opacity: 0.8 }}
                  >
                    {employee.company?.name || ""}
                  </Typography>
                </Box>
              </Box>
              <Box textAlign={{ xs: "center", sm: "right" }} mt={{ xs: 1, sm: 0 }}>
                <Typography
                  variant="body2"
                  color="primary.contrastText"
                  sx={{ opacity: 0.9 }}
                >
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Leave Balance Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Leave Balance
            </Typography>
            <Grid container spacing={2}>
              {loadingLeaveBalance ? (
                <Grid item xs={12} display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={30} />
                </Grid>
              ) : actualLeaveBalance.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info">No leave types available</Alert>
                </Grid>
              ) : (
                actualLeaveBalance.map((leave: any, index: number) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card>
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
                          <EventNote color="action" />
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          {leave.leaveType.name}
                        </Typography>
                        <Typography variant="h4" gutterBottom>
                          {leave.available}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(leave.available / leave.maxDaysPerPeriod) * 100}
                          sx={{ mb: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {leave.used} used of {leave.maxDaysPerPeriod} days
                        </Typography>
                        {leave.currentPeriod && (
                          <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                            {leave.currentPeriod.label}
                          </Typography>
                        )}
                        {leave.carriedForwardBalance > 0 && (
                          <Typography variant="caption" color="success.main" display="block">
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

          {/* Upcoming Leaves */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Upcoming Leaves</Typography>
                  <Button
                    size="small"
                    onClick={() => router.push("/user?userPageSelect=leaves")}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loadingUpcomingLeaves ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={30} />
                  </Box>
                ) : upcomingLeaves.length === 0 ? (
                  <Alert severity="info">No upcoming leaves</Alert>
                ) : (
                  <List dense>
                    {upcomingLeaves.map((leave: any) => (
                      <ListItem key={leave._id}>
                        <ListItemIcon>
                          <CalendarToday color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={leave.leaveType.name}
                          secondary={`${new Date(
                            leave.startDate
                          ).toLocaleDateString()} - ${new Date(
                            leave.endDate
                          ).toLocaleDateString()} (${leave.totalDays} day${leave.totalDays > 1 ? "s" : ""
                            })`}
                        />
                        <Chip
                          label={leave.status}
                          size="small"
                          color="success"
                          icon={<CheckCircle />}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Pending Approvals (if manager) */}
          {pendingApprovals.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
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

          {/* Recent Payslips */}
          <Grid item xs={12} md={pendingApprovals.length > 0 ? 12 : 6}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Recent Payslips</Typography>
                  <Button
                    size="small"
                    onClick={() => router.push("/user?userPageSelect=payslips")}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loadingSalaries ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={30} />
                  </Box>
                ) : recentSalaries.length === 0 ? (
                  <Alert severity="info">No payslips available</Alert>
                ) : (
                  <List dense>
                    {recentSalaries.map((salary: any) => (
                      <ListItem key={salary._id}>
                        <ListItemIcon>
                          <Receipt color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={salary.period}
                          secondary={`Final Salary: LKR ${salary.finalSalary?.toLocaleString()}`}
                        />
                        <Button
                          size="small"
                          onClick={() =>
                            router.push("/user?userPageSelect=payslips")
                          }
                        >
                          View
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<EventNote />}
                      onClick={() => router.push("/user?userPageSelect=leaves")}
                    >
                      Apply for Leave
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Receipt />}
                      onClick={() => router.push("/user?userPageSelect=payslips")}
                    >
                      View Payslips
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Person />}
                      onClick={() => router.push("/user?userPageSelect=profile")}
                    >
                      My Profile
                    </Button>
                  </Grid>
                  {pendingApprovals.length > 0 && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<CheckCircle />}
                        onClick={() => router.push("/user?userPageSelect=leaves")}
                      >
                        Approve Leaves ({pendingApprovals.length})
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

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
                  sx={{
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                  }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="body2" color="primary.contrastText">
                          Team Members
                        </Typography>
                        <Typography variant="h3" color="primary.contrastText">
                          {managerData.team.total}
                        </Typography>
                      </Box>
                      <Groups
                        sx={{
                          fontSize: 60,
                          color: "primary.contrastText",
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card
                  sx={{
                    bgcolor: "warning.light",
                    color: "primary.contrastText",
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
                          color="primary.contrastText"
                          sx={{ opacity: 0.9 }}
                        >
                          Pending Approvals
                        </Typography>
                        <Typography variant="h3" color="primary.contrastText">
                          {managerData.leaves.totalPending}
                        </Typography>
                      </Box>
                      <Pending
                        sx={{
                          fontSize: 60,
                          color: "primary.contrastText",
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card
                  sx={{
                    bgcolor: "success.light",
                    color: "primary.contrastText",
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
                          color="primary.contrastText"
                          sx={{ opacity: 0.9 }}
                        >
                          Employee Types
                        </Typography>
                        <Typography variant="h3" color="primary.contrastText">
                          {Object.keys(managerData.team.byType).length}
                        </Typography>
                      </Box>
                      <Work
                        sx={{
                          fontSize: 60,
                          color: "primary.contrastText",
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card
                  sx={{
                    bgcolor: "secondary.light",
                    color: "primary.contrastText",
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
                          color="primary.contrastText"
                          sx={{ opacity: 0.9 }}
                        >
                          Departments
                        </Typography>
                        <Typography variant="h3" color="primary.contrastText">
                          {Object.keys(managerData.team.byDepartment).length}
                        </Typography>
                      </Box>
                      <Work
                        sx={{
                          fontSize: 60,
                          color: "primary.contrastText",
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Team Members with Leave Balance */}
              <Grid item xs={12}>
                <Card>
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
    </Card>
  );
};

export default EmployeeDashboard;
