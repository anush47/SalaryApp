"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Grid,
  Tooltip,
  Button,
  IconButton,
  Typography,
  CardHeader,
  CardContent,
  FormControl,
  Autocomplete,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import { ArrowBack, ShoppingBag } from "@mui/icons-material";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import "dayjs/locale/en-gb";
import GenerateSalaryAll from "./generateSalaryAll";

import Link from "next/link";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { fetchEmployee } from "@/app/lib/api/employeeApi";
import { fetchCompany } from "@/app/lib/api/companyApi";
import { useQuery } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { fetchEmployees } from "@/app/lib/api";

export interface Salary {
  employee: string;
  period: string;
  basic: string;
  nopay: {
    amount: string;
    reason: string;
  };
  ot: {
    amount: string;
    reason: string;
  };
  paymentStructure: {
    additions: {
      name: string;
      amount: string;
    }[];
    deductions: {
      name: string;
      amount: string;
    }[];
  };
  advanceAmount: string;
  finalSalary: string;
}

const AddSalaryForm: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  handleBackClick: () => void;
  companyId: string;
}> = ({ user, handleBackClick, companyId }) => {
  const [formFields, setFormFields] = useState({
    id: "",
    employeeNo: "",
    employeeName: "",
    basicSalary: "",
    additions: [] as string[],
    deductions: [] as string[],
    netSalary: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [employeeSelection, setEmployeeSelection] = useState<string>("all");
  const [period, setPeriod] = useState<string>(
    dayjs().subtract(1, "month").format("YYYY-MM")
  );

  // Flexible period selection state
  const [periodSelectionMode, setPeriodSelectionMode] = useState<"month" | "specific">("month");
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedEmployeeSalaryPeriod, setSelectedEmployeeSalaryPeriod] = useState<string>("monthly");

  const { showSnackbar } = useSnackbar();
  const [errors, setErrors] = useState<{
    employee?: string;
    basic?: string;
  }>({});
  const [purchased, setPurchased] = useState<boolean>(true);

  // Helper function to format period based on selection
  const getFormattedPeriod = (): string => {
    if (periodSelectionMode === "month" || selectedEmployeeSalaryPeriod === "monthly" || employeeSelection === "all") {
      return period; // Return YYYY-MM format
    }

    // For specific period selection
    if (selectedEmployeeSalaryPeriod === "daily" && startDate && endDate) {
      // Return date range format: "YYYY-MM-DD to YYYY-MM-DD"
      return `${startDate.format("YYYY-MM-DD")} to ${endDate.format("YYYY-MM-DD")}`;
    }

    // Fallback to month
    return period;
  };

  const fetchEmployeesData = async (): Promise<any[]> => {
    const response: any = await fetchEmployees({ companyId });
    const employeesData = Array.isArray(response) ? response : (response.employees || response.data || []);
    return employeesData.map((employee: any) => ({
      ...employee,
      active: employee.active !== false
    }));
  };

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: fetchEmployeesData,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const sortedEmployeesData = React.useMemo(() => {
    if (!employeesData) return [];
    const list = Array.isArray(employeesData) ? employeesData : ((employeesData as any).employees || (employeesData as any).data || []);
    return [...list].sort((a: any, b: any) => {
      if (a.active === b.active) return a.name.localeCompare(b.name);
      return a.active ? -1 : 1;
    });
  }, [employeesData]);

  const employees = React.useMemo(() => {
    const allOption = { _id: "all", memberNo: "ALL", name: "ALL Employees", nic: "all", active: true };
    return [allOption, ...sortedEmployeesData];
  }, [sortedEmployeesData]);


  const checkPurchasedStatus = async (): Promise<boolean> => {
    const response = await fetch(
      `/api/purchases/check?companyId=${companyId}&month=${period}`,
      {
        method: "GET",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to check purchase status");
    }
    const result = await response.json();
    return result?.purchased === "approved";
  };

  const { data: purchasedStatus, isLoading: isLoadingPurchased } = useQuery({
    queryKey: ["purchases", "check", companyId, period],
    queryFn: checkPurchasedStatus,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (purchasedStatus !== undefined) {
      setPurchased(purchasedStatus);
    }
  }, [purchasedStatus]);

  useEffect(() => {
    setLoading(isLoadingEmployees || isLoadingPurchased);
  }, [isLoadingEmployees, isLoadingPurchased]);

  return (
    <>
      <CardHeader
        title={
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Discard and go back" arrow>
                <IconButton
                  sx={{
                    mr: 2,
                  }}
                  onClick={handleBackClick}
                >
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Typography variant="h4" component="h1">
                Generate Salaries
              </Typography>
            </Box>
          </Box>
        }
      />
      <CardContent
        sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Stack spacing={3}>
              <FormControl fullWidth error={!!errors.employee}>
                <Autocomplete
                  options={employees}
                  groupBy={(option) => option._id === 'all' ? '' : (option.active ? 'Active Employees' : 'Inactive Employees')}
                  getOptionLabel={(option) => {
                    const statusText = option.active === false ? ' (Inactive)' : '';
                    if (option._id === "all") return option.name;
                    return `${option.memberNo} - ${option.name}${statusText}`;
                  }}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={key} {...optionProps}>
                        <Box sx={{ color: option.active === false ? 'text.disabled' : 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: option.active === false ? 'normal' : '500', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            {option.name}
                          </Typography>
                          {option._id !== 'all' && (
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              ({option.memberNo})
                            </Typography>
                          )}
                          {option.active === false && (
                            <Chip label="Inactive" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                      </li>
                    );
                  }}
                  onChange={async (_, newValue) => {
                    if (newValue) {
                      setFormFields((prevFields) => ({
                        ...prevFields,
                        employeeNo: newValue._id,
                        employeeName: newValue.name,
                      }));
                      setEmployeeSelection(newValue._id);

                      // Fetch employee details using API utility
                      if (newValue._id !== "all") {
                        try {
                          const employee = await fetchEmployee(newValue._id);
                          let salaryPeriod = employee?.salaryPeriod;

                          // If employee doesn't have salary period, check company defaults
                          if (!salaryPeriod) {
                            const company = await fetchCompany(companyId);
                            salaryPeriod = company?.salaryPeriodDefaults?.salaryPeriod || "monthly";
                            console.log(`Employee has no salary period, using company default: ${salaryPeriod}`);
                          }

                          setSelectedEmployeeSalaryPeriod(salaryPeriod);
                          console.log(`🎯 Selected employee salary period: ${salaryPeriod}`);
                        } catch (error) {
                          console.error("Failed to fetch employee details:", error);
                          setSelectedEmployeeSalaryPeriod("monthly");
                        }
                      } else {
                        setSelectedEmployeeSalaryPeriod("monthly");
                      }
                    }
                  }}
                  value={
                    employees.find(
                      (employee) => employee._id === employeeSelection
                    ) || null
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Employee"
                      variant="outlined"
                      fullWidth
                    />
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option._id === value._id
                  }
                />
              </FormControl>

              {/* Period Selection Mode - Only show for non-monthly employees */}
              {selectedEmployeeSalaryPeriod !== "monthly" && employeeSelection !== "all" && (
                <Paper elevation={1} sx={{ p: 2 }}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ mb: 1 }}>
                      Period Selection
                    </FormLabel>
                    <RadioGroup
                      value={periodSelectionMode}
                      onChange={(e) => {
                        setPeriodSelectionMode(e.target.value as "month" | "specific");
                        // Reset date selection when switching modes
                        if (e.target.value === "month") {
                          setStartDate(null);
                          setEndDate(null);
                        }
                      }}
                    >
                      <FormControlLabel
                        value="month"
                        control={<Radio />}
                        label={`Entire month (generates ${selectedEmployeeSalaryPeriod === "daily"
                          ? "~30 daily salaries"
                          : selectedEmployeeSalaryPeriod === "weekly"
                            ? "~4 weekly salaries"
                            : selectedEmployeeSalaryPeriod === "bi-weekly"
                              ? "~2 bi-weekly salaries"
                              : "monthly salary"
                          })`}
                      />
                      <FormControlLabel
                        value="specific"
                        control={<Radio />}
                        label="Specific periods"
                      />
                    </RadioGroup>
                  </FormControl>

                  {/* Specific Period Selection for Daily employees */}
                  {selectedEmployeeSalaryPeriod === "daily" && periodSelectionMode === "specific" && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select date range for daily salary generation
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                          <DatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={(newValue) => setStartDate(newValue)}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                variant: "outlined",
                              },
                            }}
                          />
                          <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={(newValue) => setEndDate(newValue)}
                            minDate={startDate || undefined}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                variant: "outlined",
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </Stack>
                      {startDate && endDate && (
                        <Typography variant="caption" color="primary" sx={{ mt: 1, display: "block" }}>
                          Will generate {endDate.diff(startDate, "day") + 1} daily salary records
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              )}

              <FormControl fullWidth>
                <Box display={"flex"} alignItems="center" gap={2}>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DatePicker
                      label={"Period"}
                      views={["month", "year"]}
                      value={period ? dayjs(period) : dayjs()}
                      onChange={(newValue) => {
                        setPeriod(dayjs(newValue).format("YYYY-MM"));
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          variant: "outlined",
                          InputProps: {
                            endAdornment: (
                              <>
                                {!purchased && (
                                  <Link
                                    href={`/user/mycompanies/${companyId}?companyPageSelect=purchases&newPurchase=true&periods=${period.split("-")[1]
                                      }-${period.split("-")[0]}`}
                                  >
                                    <Button
                                      variant="contained"
                                      color="success"
                                      startIcon={<ShoppingBag />}
                                      sx={{
                                        whiteSpace: "nowrap",
                                        minWidth: 0,
                                      }}
                                    >
                                      Purchase
                                    </Button>
                                  </Link>
                                )}
                              </>
                            ),
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Box>
              </FormControl>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            {/* Unified Salary Generation Component */}
            <GenerateSalaryAll
              companyId={companyId}
              period={getFormattedPeriod()}
              user={user}
              selectedEmployeeId={employeeSelection !== "all" ? employeeSelection : undefined}
              employees={sortedEmployeesData}
              isLoading={isLoadingEmployees}
            />
          </Grid>
        </Grid>
      </CardContent>
    </>
  );
};

export default AddSalaryForm;
