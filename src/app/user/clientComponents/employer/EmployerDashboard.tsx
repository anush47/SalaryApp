"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  LinearProgress,
  Paper,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  Groups,
  Business,
  EventBusy,
  CheckCircle,
  AttachMoney,
  WorkOff,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UserProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
];

const EmployerDashboard: React.FC<UserProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [aggregatedData, setAggregatedData] = useState<any>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        if (!response.ok) throw new Error("Failed to fetch companies");
        const data = await response.json();
        setCompanies(data.companies || []);
      } catch (err: any) {
        console.error("Error fetching companies:", err);
        setError(err.message || "Failed to load companies");
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (companies.length === 0 && selectedCompany !== "all") return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/dashboard/employer?companyId=${selectedCompany}`
        );
        if (!response.ok) throw new Error("Failed to fetch dashboard data");

        const data = await response.json();

        if (selectedCompany === "all") {
          setDashboardData(data.dashboard);
          setAggregatedData(data.aggregated);
        } else {
          setDashboardData(data.dashboard);
          setAggregatedData(null);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
        setLoading(false);
      }
    };

    if (companies.length > 0 || selectedCompany === "all") {
      fetchDashboardData();
    }
  }, [selectedCompany, companies]);

  if (loading && companies.length === 0) {
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

  if (error && companies.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (companies.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No companies found. Create a company to get started.
        </Alert>
      </Box>
    );
  }

  const renderMetricCard = (
    title: string,
    value: any,
    icon: any,
    color: string,
    trend?: number
  ) => (
    <Card
      sx={{ bgcolor: color, height: "100%", color: "primary.contrastText" }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography
              variant="body2"
              color="primary.contrastText"
              sx={{ opacity: 0.9 }}
              gutterBottom
            >
              {title}
            </Typography>
            <Typography variant="h3" color="primary.contrastText">
              {value}
            </Typography>
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend >= 0 ? (
                  <TrendingUp sx={{ color: "primary.contrastText", mr: 0.5 }} />
                ) : (
                  <TrendingDown
                    sx={{ color: "primary.contrastText", mr: 0.5 }}
                  />
                )}
                <Typography variant="caption" color="primary.contrastText">
                  {Math.abs(trend)}% from last month
                </Typography>
              </Box>
            )}
          </Box>
          {React.cloneElement(icon, {
            sx: { fontSize: 60, color: "primary.contrastText", opacity: 0.3 },
          })}
        </Box>
      </CardContent>
    </Card>
  );

  const renderSingleCompanyDashboard = (companyData: any) => {
    const employeeTypeData = companyData.employees?.byType
      ? Object.entries(companyData.employees.byType).map(([type, count]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: count,
        }))
      : [];

    return (
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Total Employees",
            companyData.employees?.total || 0,
            <Groups />,
            "primary.light"
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Active Employees",
            companyData.employees?.active || 0,
            <CheckCircle />,
            "primary.main"
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Pending Leaves",
            companyData.leaves?.pending?.count || 0,
            <EventBusy />,
            "warning.main"
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Departments",
            companyData.departments?.total || 0,
            <Business />,
            "info.light"
          )}
        </Grid>

        {/* Salary Trends Chart */}
        {companyData.salaries?.trends?.length > 0 && (
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payroll Trends
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <ResponsiveContainer width="10%" height={300}>
                  <LineChart data={companyData.salaries?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgSalary"
                      stroke="#8884d8"
                      name="Avg Salary (LKR)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalPayroll"
                      stroke="#82ca9d"
                      name="Total Payroll (LKR)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Employee Type Distribution */}
        {employeeTypeData.length > 0 && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Employee Distribution
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={employeeTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {employeeTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Salaries */}
        {companyData.salaries?.recent?.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Salary Stats
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box>
                  {companyData.salaries?.recent
                    ?.slice(0, 3)
                    .map((salary: any, idx: number) => (
                      <Box key={idx} mb={2}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={0.5}
                        >
                          <Typography variant="subtitle2">
                            {salary?.period || "N/A"}
                          </Typography>
                          <Chip
                            label={`${salary?.count || 0} employees`}
                            size="small"
                          />
                        </Box>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Paper sx={{ p: 1, bgcolor: "background.default" }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Average
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                LKR {(salary?.avg || 0).toLocaleString()}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={4}>
                            <Paper sx={{ p: 1, bgcolor: "background.default" }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Minimum
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                LKR {(salary?.min || 0).toLocaleString()}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={4}>
                            <Paper sx={{ p: 1, bgcolor: "background.default" }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Maximum
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                LKR {(salary?.max || 0).toLocaleString()}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Leave Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box>
                <Box mb={2}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.5}
                  >
                    <Typography variant="body2">Pending Requests</Typography>
                    <Typography variant="h6" color="warning.main">
                      {companyData.leaves?.pending?.count || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      ((companyData.leaves?.pending?.count || 0) /
                        (companyData.employees?.total || 1 || 1)) *
                      10
                    }
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {companyData.leaves?.pending?.totalDays || 0} days pending
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.5}
                  >
                    <Typography variant="body2">Approved Leaves</Typography>
                    <Typography variant="h6" color="success.main">
                      {companyData.leaves?.approved?.count || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      ((companyData.leaves?.approved?.count || 0) /
                        (companyData.employees?.total || 1 || 1)) *
                      10
                    }
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {companyData.leaves?.approved?.totalDays || 0} days approved
                  </Typography>
                </Box>

                <Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.5}
                  >
                    <Typography variant="body2">Rejected/Cancelled</Typography>
                    <Typography variant="h6" color="error.main">
                      {(companyData.leaves?.rejected?.count || 0) +
                        (companyData.leaves?.cancelled?.count || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      (((companyData.leaves?.rejected?.count || 0) +
                        (companyData.leaves?.cancelled?.count || 0)) /
                        (companyData.employees?.total || 1 || 1)) *
                      100
                    }
                    color="error"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Overview */}
        {companyData.departments?.list?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Departments
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {companyData.departments?.list?.map(
                    (dept: any, idx: number) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Paper sx={{ p: 2, bgcolor: "background.default" }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {dept?.name || "N/A"}
                          </Typography>
                          <Typography variant="h4" color="primary">
                            {dept?.count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            employees
                          </Typography>
                        </Paper>
                      </Grid>
                    )
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderAllCompaniesDashboard = () => {
    if (!aggregatedData || !dashboardData) return null;

    const companyPayrollData = dashboardData.map((company: any) => ({
      name: company.company.name.substring(0, 15),
      employees: company.employees?.active || 0,
      payroll: company.salaries?.recent?.[0]?.total || 0,
    }));

    return (
      <Grid container spacing={3}>
        {/* Aggregated Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Total Companies",
            aggregatedData.totalCompanies,
            <Business />,
            "primary.light"
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Total Employees",
            aggregatedData.totalEmployees,
            <Groups />,
            "primary.main"
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Active Employees",
            aggregatedData.activeEmployees,
            <CheckCircle />,
            "info.light"
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            "Pending Leaves",
            aggregatedData.pendingLeaves,
            <EventBusy />,
            "warning.main"
          )}
        </Grid>

        {/* Payroll Comparison */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Company Payroll Comparison
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={companyPayrollData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="employees"
                    fill="#8884d8"
                    name="Employees"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="payroll"
                    fill="#82ca9d"
                    name="Payroll (LKR)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Company Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Company Overview
          </Typography>
          <Grid container spacing={2}>
            {dashboardData.map((company: any, idx: number) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom noWrap>
                      {company.company.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      gutterBottom
                    >
                      {company.company.employerNo}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Employees
                        </Typography>
                        <Typography variant="h6">
                          {company.employees?.active || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Departments
                        </Typography>
                        <Typography variant="h6">
                          {company.departments?.total || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Recent Payroll
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          LKR{" "}
                          {(
                            company.salaries?.recent?.[0]?.total || 0
                          ).toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box mt={1}>
                      <Chip
                        label={`${
                          company.leaves?.pending?.count || 0
                        } pending leaves`}
                        size="small"
                        color={
                          (company.leaves?.pending?.count || 0) > 0
                            ? "warning"
                            : "default"
                        }
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h4">Employer Dashboard</Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Company</InputLabel>
            <Select
              value={selectedCompany}
              label="Company"
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <MenuItem value="all">All Companies</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company._id} value={company._id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Divider />
      </Box>

      {/* Loading State */}
      {loading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <>
          {selectedCompany === "all"
            ? renderAllCompaniesDashboard()
            : dashboardData && renderSingleCompanyDashboard(dashboardData)}
        </>
      )}
    </Box>
  );
};

export default EmployerDashboard;
