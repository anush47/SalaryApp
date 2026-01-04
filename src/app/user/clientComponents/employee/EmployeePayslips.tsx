"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  TableHead,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Download,
  ExpandMore,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { InOutTable } from "../../mycompanies/[id]/salaries/inOutTable";
import dayjs from "dayjs";
import { fetchSalaries } from "@/app/lib/api/salaryApi";
import { formatPeriodLabel } from "@/app/lib/formatUtils";
import { SalaryDetailView } from "./SalaryDetailView";
import EmployeePaymentsTab from "./EmployeePaymentsTab";


interface UserProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
}



const EmployeePayslips: React.FC<UserProps> = ({ user }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const { showSnackbar } = useSnackbar();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Update URL on tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const tabName = newValue === 0 ? "payslips" : "payments";
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabName);
    router.replace(`/user?${params.toString()}`);
  };

  // Set initial tab from URL and handle backward/forward navigation
  useEffect(() => {
    if (currentTab === "payments") {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [currentTab]);

  // 1. Fetch Employee Data
  const {
    data: employee,
    isLoading: loadingEmployee,
    error: employeeError,
  } = useQuery({
    queryKey: ["employee", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/employees?user=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch employee data");
      const data = await response.json();
      const employees = data.employees || data.data?.employees || [];
      if (employees.length === 0) {
        throw new Error("Employee profile not found");
      }
      return employees[0];
    },
    staleTime: 5 * 60 * 1000,
  });

  const employeeId = employee?._id;

  // 2. Fetch Salaries
  const { data: salariesData, isLoading: loadingSalaries } = useQuery({
    queryKey: ["salaries", employeeId],
    queryFn: () => fetchSalaries({ employeeId: employeeId }),
    enabled: !!employeeId,
  });

  const rawSalaries = salariesData?.salaries || salariesData?.data?.salaries || (Array.isArray(salariesData) ? salariesData : []);
  const salaries = Array.isArray(rawSalaries) ? rawSalaries.filter((s: any) => s.period) : [];

  // Group by Month (YYYY-MM)
  const groupedSalaries = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    salaries.forEach((salary: any) => {
      // Extract YYYY-MM from period (handles YYYY-MM-DD and YYYY-MM)
      // For Weekly (YYYY-Www), we might need to approximate or just list them.
      // Assuming period string format, let's try to extract YYYY-MM
      let monthKey = "";
      if (/^\d{4}-\d{2}/.test(salary.period)) {
        monthKey = salary.period.substring(0, 7);
      } else {
        // Fallback for weekly/bi-weekly if they don't match standard YYYY-MM prefix
        // or handle separately. For now, try to group by prefix
        monthKey = salary.period.substring(0, 7);
      }

      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(salary);
    });
    return groups;
  }, [salaries]);

  // Sorted Months
  const sortedMonths = Object.keys(groupedSalaries).sort((a, b) => b.localeCompare(a));

  // Auto-select latest month
  useEffect(() => {
    if (sortedMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(sortedMonths[0]);
    }
  }, [sortedMonths, selectedMonth]);

  // Calculate Monthly Totals for the selected month
  const monthlyTotals = useMemo(() => {
    if (!selectedMonth || !groupedSalaries[selectedMonth]) return null;
    const records = groupedSalaries[selectedMonth];

    return records.reduce(
      (acc, curr) => ({
        basic: acc.basic + (curr.basic || 0),
        finalSalary: acc.finalSalary + (curr.finalSalary || 0),
        otAmount: acc.otAmount + (curr.ot?.amount || 0),
        totalAdditions: acc.totalAdditions + (curr.paymentStructure?.additions?.reduce((sum: number, a: any) => sum + (a.amount || 0), 0) || 0),
        totalDeductions: acc.totalDeductions + (curr.paymentStructure?.deductions?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0) + (curr.noPay?.amount || 0) + (curr.advanceAmount || 0),
      }),
      { basic: 0, finalSalary: 0, otAmount: 0, totalAdditions: 0, totalDeductions: 0 }
    );
  }, [selectedMonth, groupedSalaries]);

  // Aggregate Attendance for the selected month
  const monthlyAttendance = useMemo(() => {
    if (!selectedMonth || !groupedSalaries[selectedMonth]) return [];
    const records = groupedSalaries[selectedMonth];

    // Flat map all inOut arrays and sort by date/time
    const allInOuts = records.flatMap((record: any) =>
      (record.inOut || []).map((io: any) => ({
        ...io,
        // Tag with source record info if needed, or just display raw
        sourcePeriod: record.period,
        employeeName: employee?.name,
        employeeNIC: employee?.nic,
        // We might need salary specifics for calculations if InOutTable uses them,
        // but for view-only it usually needs the IO data.
        // InOutTable expects basics.
        basic: record.basic,
        divideBy: record.divideBy,
      }))
    );

    // Sort by date (inTime)
    return allInOuts.sort((a: any, b: any) => new Date(a.inTime).getTime() - new Date(b.inTime).getTime());
  }, [selectedMonth, groupedSalaries, employee]);


  const handleDownloadPDF = async (type: "payslip" | "attendance") => {
    const targetSalary = selectedSalary; // Must have selected a salary for specific download
    if (!targetSalary || !employee) {
      // If mostly summary is viewed, maybe download ALL for that month?
      // Currently backend supports array of salaryIds
      if (!selectedSalary && selectedMonth) {
        // Download all for month
        try {
          const response = await fetch("/api/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId: employee.company._id,
              period: selectedMonth, // Passing the month (YYYY-MM) might trigger "all" logic if backend supports it or we pass specific IDs
              salaryIds: groupedSalaries[selectedMonth].map(s => s._id),
              pdfType: type === 'attendance' ? 'attendance' : 'payslip',
            }),
          });
          if (!response.ok) throw new Error("Failed to generate PDF");
          const blob = await response.blob();
          window.open(URL.createObjectURL(blob), "_blank");
        } catch (error: any) {
          showSnackbar({ message: error.message, severity: "error" });
        }
        return;
      }

      showSnackbar({
        message: "No salary selected.",
        severity: "warning",
      });
      return;
    }

    // Individual Download
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: employee.company._id,
          period: targetSalary.period,
          salaryIds: [targetSalary._id],
          pdfType: type,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
    }
  };

  if (loadingEmployee || (loadingSalaries && !selectedMonth)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
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

  return (
    <Card sx={{ minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" }, overflowY: "auto" }}>
      <CardHeader
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
            <Typography variant="h4" component="h1">
              Payslips
            </Typography>
            {selectedSalary && (
              <Button variant="text" onClick={() => setSelectedSalary(null)}>
                Back to Monthly Summary
              </Button>
            )}
          </Box>
        }
      />
      <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Payslips" />
            <Tab label="Payments" />
          </Tabs>
        </Box>
        <Grid container spacing={3}>
          {/* Month Selector */}
          {!selectedSalary && (
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Select Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {sortedMonths.map((month) => (
                  <MenuItem key={month} value={month}>
                    {dayjs(month).format("MMMM YYYY")}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {/* Tab Content */}
          {activeTab === 0 && (
            <>
              {/* Content Switcher */}
              {selectedSalary ? (
                // Detailed View
                <SalaryDetailView
                  salary={selectedSalary}
                  employee={employee}
                  onDownload={handleDownloadPDF}
                />
              ) : (
                // Monthly Summary View
                <>
                  {/* Monthly Totals Card */}
                  {monthlyTotals && (
                    <Grid item xs={12}>
                      <Card
                        variant="outlined"
                        sx={{
                          mb: 3,
                          borderLeft: "6px solid",
                          borderLeftColor: "secondary.main",
                          boxShadow: "none",
                        }}
                      >
                        <CardContent>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={2}
                          >
                            <Typography variant="h6">
                              Monthly Summary: {dayjs(selectedMonth).format("MMMM YYYY")}
                            </Typography>
                            <Button
                              variant="outlined"
                              color="inherit"
                              startIcon={<Download />}
                              onClick={() => handleDownloadPDF("payslip")}
                              size="small"
                            >
                              Download All
                            </Button>
                          </Box>
                          <Divider sx={{ mb: 2 }} />
                          <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                Net Pay
                              </Typography>
                              <Typography variant="h4" fontWeight="bold">
                                LKR {monthlyTotals.finalSalary.toLocaleString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                Total Earnings
                              </Typography>
                              <Typography variant="h6">
                                LKR {(
                                  monthlyTotals.basic +
                                  monthlyTotals.otAmount +
                                  monthlyTotals.totalAdditions
                                ).toLocaleString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                Total Deductions
                              </Typography>
                              <Typography variant="h6">
                                LKR {monthlyTotals.totalDeductions.toLocaleString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                Total Basic
                              </Typography>
                              <Typography variant="h6">
                                LKR {monthlyTotals.basic.toLocaleString()}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Monthly Attendance Table */}
                  {monthlyAttendance.length > 0 && (
                    <Grid item xs={12}>
                      <Card sx={{ mb: 3 }}>
                        <CardHeader
                          title="Monthly Attendance Detail"
                          subheader={`${monthlyAttendance.length} records found`}
                          action={
                            <Button
                              variant="outlined"
                              startIcon={<Download />}
                              onClick={() => handleDownloadPDF("attendance")}
                              size="small"
                            >
                              PDF Report
                            </Button>
                          }
                        />
                        <CardContent>
                          <Box sx={{ overflowX: "auto" }}>
                            <InOutTable
                              inOuts={monthlyAttendance.map(
                                (record: any, index: number) => ({
                                  ...record,
                                  id: index, // Frontend ID for table
                                })
                              )}
                              setInOuts={() => { }}
                              fetchSalary={() => { }}
                              editable={false}
                              isDynamicHolidays={false}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* List of Payslips */}
                  <Grid item xs={12}>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Period</TableCell>
                            <TableCell align="right">Basic</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="right">Net Salary</TableCell>
                            <TableCell align="right">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupedSalaries[selectedMonth]?.map((salary: any) => (
                            <TableRow key={salary._id} hover>
                              <TableCell>{formatPeriodLabel(salary.period)}</TableCell>
                              <TableCell align="right">
                                LKR {salary.basic?.toLocaleString()}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={(salary.paymentStatus || "unpaid").replace(
                                    "_",
                                    " "
                                  )}
                                  color={
                                    salary.paymentStatus === "fully_paid"
                                      ? "success"
                                      : salary.paymentStatus === "partially_paid"
                                        ? "warning"
                                        : salary.paymentStatus === "overpaid"
                                          ? "info"
                                          : "error"
                                  }
                                  size="small"
                                  sx={{ textTransform: "capitalize" }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                                LKR {salary.finalSalary?.toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => setSelectedSalary(salary)}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!groupedSalaries[selectedMonth] ||
                            groupedSalaries[selectedMonth].length === 0) && (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  No records found for this month.
                                </TableCell>
                              </TableRow>
                            )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </>
              )}
            </>
          )}

          {/* Tab 2: Payments */}
          {activeTab === 1 && (
            <Grid item xs={12}>
              <EmployeePaymentsTab employeeId={employeeId} />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EmployeePayslips;
