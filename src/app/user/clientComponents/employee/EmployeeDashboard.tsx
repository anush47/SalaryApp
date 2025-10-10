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
      <Card sx={{ mb: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              src={user.image}
              alt={user.name}
              sx={{ width: 80, height: 80, border: "3px solid white" }}
            />
            <Box flex={1}>
              <Typography variant="h4" color="white" gutterBottom>
                Welcome back, {employeeData.name}!
              </Typography>
              <Typography variant="body1" color="white" sx={{ opacity: 0.9 }}>
                {employeeData.designation || "Employee"} • Member #{employeeData.memberNo}
              </Typography>
              <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
                {employeeData.company?.name || ""}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2" color="white" sx={{ opacity: 0.9 }}>
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
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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
                      <Typography variant="body2" color="text.secondary" gutterBottom>
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
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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
                        secondary={`${new Date(leave.startDate).toLocaleDateString()} - ${new Date(
                          leave.endDate
                        ).toLocaleDateString()} (${leave.totalDays} day${leave.totalDays > 1 ? "s" : ""})`}
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
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Pending Approvals</Typography>
                  <Chip label={pendingApprovals.length} color="warning" size="small" />
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
                        secondary={`${request.leaveType.name} - ${request.totalDays} day${
                          request.totalDays > 1 ? "s" : ""
                        }`}
                      />
                      <Button
                        size="small"
                        onClick={() => router.push("/user?userPageSelect=leaves")}
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
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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
                        onClick={() => router.push("/user?userPageSelect=payslips")}
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
      </Grid>
    </Box>
  );
};

export default EmployeeDashboard;
