"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
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
  TrendingUp,
  Groups,
  Work,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recentSalaries, setRecentSalaries] = useState<any[]>([]);
  const [managerData, setManagerData] = useState<any>(null);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch employee data
        const empResponse = await fetch(`/api/employees?user=${user.id}`);
        if (!empResponse.ok) throw new Error("Failed to fetch employee data");
        const empData = await empResponse.json();

        if (!empData.employees || empData.employees.length === 0) {
          setError("Employee profile not found. Please contact your employer.");
          setLoading(false);
          return;
        }

        const employee = empData.employees[0];
        setEmployeeData(employee);

        // Fetch leave balance (using the helper function via API)
        try {
          const balanceResponse = await fetch(
            `/api/employees/leave-balance?employeeId=${employee._id}`
          );
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            setLeaveBalance(balanceData.summary || []);
          }
        } catch (err) {
          console.error("Error fetching leave balance:", err);
        }

        // Fetch upcoming leaves
        try {
          const leavesResponse = await fetch(
            `/api/leave-requests?companyId=${employee.company._id}&employeeId=${employee._id}&status=approved`
          );
          if (leavesResponse.ok) {
            const leavesData = await leavesResponse.json();
            const today = new Date();
            const upcoming = leavesData.leaveRequests
              .filter((req: any) => new Date(req.startDate) >= today)
              .slice(0, 5);
            setUpcomingLeaves(upcoming);
          }
        } catch (err) {
          console.error("Error fetching upcoming leaves:", err);
        }

        // Fetch pending approvals (if this employee is a manager)
        try {
          const approvalsResponse = await fetch(
            `/api/leave-requests?companyId=${employee.company._id}&pendingApprovals=true`
          );
          if (approvalsResponse.ok) {
            const approvalsData = await approvalsResponse.json();
            setPendingApprovals(approvalsData.leaveRequests || []);

            // If there are pending approvals, this is a manager
            if (
              approvalsData.leaveRequests &&
              approvalsData.leaveRequests.length > 0
            ) {
              setIsManager(true);

              // Fetch manager dashboard data
              try {
                const managerResponse = await fetch(
                  `/api/dashboard/manager?employeeId=${employee._id}`
                );
                if (managerResponse.ok) {
                  const managerDashboard = await managerResponse.json();
                  setManagerData(managerDashboard);
                }
              } catch (manErr) {
                console.error("Error fetching manager data:", manErr);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching pending approvals:", err);
        }

        // Fetch recent salaries
        try {
          const salariesResponse = await fetch(
            `/api/salaries?employee=${employee._id}&limit=3`
          );
          if (salariesResponse.ok) {
            const salariesData = await salariesResponse.json();
            setRecentSalaries(salariesData.salaries || []);
          }
        } catch (err) {
          console.error("Error fetching salaries:", err);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

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

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!employeeData) {
    return (
      <Box p={3}>
        <Alert severity="warning">Employee data not available</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Welcome Card */}
      <Card
        sx={{ mb: 3, bgcolor: "primary.main", color: "primary.contrastText" }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              src={user.image}
              alt={user.name}
              sx={{ width: 80, height: 80, border: "3px solid white" }}
            />
            <Box flex={1}>
              <Typography
                variant="h4"
                color="primary.contrastText"
                gutterBottom
              >
                Welcome back, {employeeData.name}!
              </Typography>
              <Typography
                variant="body1"
                color="primary.contrastText"
                sx={{ opacity: 0.9 }}
              >
                {employeeData.designation || "Employee"} • Member #
                {employeeData.memberNo}
              </Typography>
              <Typography
                variant="body2"
                color="primary.contrastText"
                sx={{ opacity: 0.8 }}
              >
                {employeeData.company?.name || ""}
              </Typography>
            </Box>
            <Box textAlign="right">
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
            {leaveBalance.length === 0 ? (
              <Grid item xs={12}>
                <Alert severity="info">No leave types available</Alert>
              </Grid>
            ) : (
              leaveBalance.map((leave: any, index: number) => (
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
                        value={(leave.available / leave.maxDaysPerYear) * 100}
                        sx={{ mb: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {leave.used} used of {leave.maxDaysPerYear} days
                      </Typography>
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
              {upcomingLeaves.length === 0 ? (
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
                        ).toLocaleDateString()} (${leave.totalDays} day${
                          leave.totalDays > 1 ? "s" : ""
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
                        secondary={`${request.leaveType.name} - ${
                          request.totalDays
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
              {recentSalaries.length === 0 ? (
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
                      <Typography
                        variant="body2"
                        color="white"
                        sx={{ opacity: 0.9 }}
                      >
                        Team Members
                      </Typography>
                      <Typography variant="h3" color="white">
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
                        color="white"
                        sx={{ opacity: 0.9 }}
                      >
                        Pending Approvals
                      </Typography>
                      <Typography variant="h3" color="white">
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
                  bgcolor: "info.light",
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
                        color="white"
                        sx={{ opacity: 0.9 }}
                      >
                        Avg Team Salary
                      </Typography>
                      <Typography variant="h3" color="white">
                        {(managerData.performance.avgSalary / 1000).toFixed(0)}K
                      </Typography>
                    </Box>
                    <TrendingUp
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
                        color="white"
                        sx={{ opacity: 0.9 }}
                      >
                        Departments
                      </Typography>
                      <Typography variant="h3" color="white">
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
                                            {leave.maxDaysPerYear}
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
    </Box>
  );
};

export default EmployeeDashboard;
