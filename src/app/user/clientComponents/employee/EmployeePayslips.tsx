"use client";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
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
} from "@mui/material";
import {
  Download,
  ExpandMore,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { InOutTable } from "../../mycompanies/[id]/salaries/inOutTable";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
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

const EmployeePayslips: React.FC<UserProps> = ({ user }) => {
  const { showSnackbar } = useSnackbar();
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedSalary, setSelectedSalary] = useState<any>(null);

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
  const sortedSalaries = salaries.sort(
    (a: any, b: any) => b.period.localeCompare(a.period)
  );

  // Auto-select latest salary
  useEffect(() => {
    if (sortedSalaries && sortedSalaries.length > 0 && !selectedPeriod) {
      // Only auto-select if nothing is selected yet to prevent overwriting user choice if re-fetched
      const latest = sortedSalaries[0];
      setSelectedPeriod(latest.period);
      setSelectedSalary(latest);
    } else if (sortedSalaries && sortedSalaries.length > 0 && selectedPeriod) {
      // If period is selected, ensure we have the salary object (e.g. after refresh)
      const current = sortedSalaries.find((s: any) => s.period === selectedPeriod);
      if (current) setSelectedSalary(current);
    }
  }, [sortedSalaries, selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const salary = sortedSalaries.find((s: any) => s.period === period);
    setSelectedSalary(salary || null);
  };

  const handleDownloadPDF = async (pdfType: "payslip" | "attendance") => {
    if (!selectedSalary || !employee) {
      showSnackbar({
        message: "No salary selected or employee data missing.",
        severity: "warning",
      });
      return;
    }

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: employee.company._id,
          period: selectedSalary.period,
          salaryIds: [selectedSalary._id],
          pdfType: pdfType,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
    }
  };

  if (loadingEmployee || (loadingSalaries && !selectedPeriod)) {
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
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Payslips</Typography>
        {selectedSalary && (
          <Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleDownloadPDF("payslip")}
              sx={{ mr: 1 }}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleDownloadPDF("attendance")}
            >
              Attendance Report
            </Button>
          </Box>
        )}
      </Box>

      {sortedSalaries.length === 0 ? (
        <Alert severity="info">No payslips available</Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Period Selector */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Select Period"
                  views={["month", "year"]}
                  value={dayjs(selectedPeriod)}
                  onChange={(newValue) => {
                    if (newValue) {
                      handlePeriodChange(newValue.format("YYYY-MM"));
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                  shouldDisableDate={(date) => {
                    // Disable dates that don't have a salary (optional, but good UX if feasible)
                    // Here we can checking if any salary matches the YYYY-MM
                    const dateStr = date.format("YYYY-MM");
                    return !sortedSalaries.some((s: any) => s.period === dateStr);
                  }}
                />
              </LocalizationProvider>
            </FormControl>
          </Grid>

          {selectedSalary && (
            <>
              {/* Salary Summary Card */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    mb: 3,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Typography
                          variant="body2"
                          color="primary.contrastText"
                          sx={{ opacity: 0.9 }}
                        >
                          Period
                        </Typography>
                        <Typography variant="h5" color="primary.contrastText">
                          {selectedSalary.period}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography
                          variant="body2"
                          color="primary.contrastText"
                          sx={{ opacity: 0.9 }}
                        >
                          Basic Salary
                        </Typography>
                        <Typography variant="h5" color="primary.contrastText">
                          LKR {selectedSalary.basic?.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography
                          variant="body2"
                          color="primary.contrastText"
                          sx={{ opacity: 0.9 }}
                        >
                          Final Salary
                        </Typography>
                        <Typography
                          variant="h4"
                          color="primary.contrastText"
                          fontWeight="bold"
                        >
                          LKR {selectedSalary.finalSalary?.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Earnings */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <TrendingUp color="success" />
                      <Typography variant="h6">Earnings</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Basic Salary</TableCell>
                            <TableCell align="right">
                              LKR {selectedSalary.basic?.toLocaleString()}
                            </TableCell>
                          </TableRow>
                          {selectedSalary.holidayPay > 0 && (
                            <TableRow>
                              <TableCell>Holiday Pay</TableCell>
                              <TableCell align="right">
                                LKR{" "}
                                {selectedSalary.holidayPay?.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )}
                          {selectedSalary.ot?.amount > 0 && (
                            <TableRow>
                              <TableCell>
                                Overtime
                                {selectedSalary.ot.reason && (
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                  >
                                    {selectedSalary.ot.reason}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                LKR {selectedSalary.ot.amount?.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )}
                          {selectedSalary.paymentStructure?.additions?.map(
                            (addition: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{addition.name}</TableCell>
                                <TableCell align="right">
                                  LKR {addition.amount?.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                          <TableRow sx={{ backgroundColor: "success.light" }}>
                            <TableCell>
                              <strong>Total Earnings</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>
                                LKR{" "}
                                {(
                                  selectedSalary.basic +
                                  (selectedSalary.holidayPay || 0) +
                                  (selectedSalary.ot?.amount || 0) +
                                  (selectedSalary.paymentStructure?.additions?.reduce(
                                    (sum: number, a: any) => sum + a.amount,
                                    0
                                  ) || 0)
                                ).toLocaleString()}
                              </strong>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Deductions */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <TrendingDown color="error" />
                      <Typography variant="h6">Deductions</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {selectedSalary.paymentStructure?.deductions?.map(
                            (deduction: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{deduction.name}</TableCell>
                                <TableCell align="right">
                                  LKR {deduction.amount?.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                          {selectedSalary.noPay?.amount > 0 && (
                            <TableRow>
                              <TableCell>
                                No Pay
                                {selectedSalary.noPay.reason && (
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                  >
                                    {selectedSalary.noPay.reason}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                LKR{" "}
                                {selectedSalary.noPay.amount?.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )}
                          {selectedSalary.advanceAmount > 0 && (
                            <TableRow>
                              <TableCell>Advance</TableCell>
                              <TableCell align="right">
                                LKR{" "}
                                {selectedSalary.advanceAmount?.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow sx={{ backgroundColor: "error.light" }}>
                            <TableCell>
                              <strong>Total Deductions</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>
                                LKR{" "}
                                {(
                                  (selectedSalary.paymentStructure?.deductions?.reduce(
                                    (sum: number, d: any) => sum + d.amount,
                                    0
                                  ) || 0) +
                                  (selectedSalary.noPay?.amount || 0) +
                                  (selectedSalary.advanceAmount || 0)
                                ).toLocaleString()}
                              </strong>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Leave Deductions (if any) */}
              {selectedSalary.leaveDeductions &&
                selectedSalary.leaveDeductions.length > 0 && (
                  <Grid item xs={12}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="h6">
                          Leave Deductions (
                          {selectedSalary.leaveDeductions.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Leave Type</TableCell>
                                <TableCell align="center">Days</TableCell>
                                <TableCell align="right">Amount</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedSalary.leaveDeductions.map(
                                (ld: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>{ld.leaveType}</TableCell>
                                    <TableCell align="center">
                                      {ld.days}
                                    </TableCell>
                                    <TableCell align="right">
                                      LKR {ld.amount?.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                              <TableRow sx={{ backgroundColor: "grey.100" }}>
                                <TableCell>
                                  <strong>Total Leave Deductions</strong>
                                </TableCell>
                                <TableCell align="center">
                                  <strong>
                                    {selectedSalary.leaveDeductions.reduce(
                                      (sum: number, ld: any) => sum + ld.days,
                                      0
                                    )}
                                  </strong>
                                </TableCell>
                                <TableCell align="right">
                                  <strong>
                                    LKR{" "}
                                    {selectedSalary.leaveDeductions
                                      .reduce(
                                        (sum: number, ld: any) =>
                                          sum + ld.amount,
                                        0
                                      )
                                      .toLocaleString()}
                                  </strong>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                )}

              {/* Attendance Details (if any) */}
              {selectedSalary.inOut && selectedSalary.inOut.length > 0 && (
                <Grid item xs={12}>
                  <InOutTable
                    inOuts={selectedSalary.inOut.map(
                      (record: any, index: number) => ({
                        ...record,
                        id: index,
                        employeeName: employee?.name,
                        employeeNIC: employee?.nic,
                        basic: selectedSalary.basic,
                        divideBy: selectedSalary.divideBy,
                      })
                    )}
                    setInOuts={() => { }}
                    fetchSalary={() => { }}
                    editable={false}
                    isDynamicHolidays={false}
                  />
                </Grid>
              )}
            </>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default EmployeePayslips;
