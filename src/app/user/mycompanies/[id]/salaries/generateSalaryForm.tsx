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
  // Snackbar, // Removed
  // Alert, // Removed
  Autocomplete,
  Stack, // Add Stack import
} from "@mui/material";
import { ArrowBack, ShoppingBag } from "@mui/icons-material";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import "dayjs/locale/en-gb";
import GenerateSalaryAll from "./generateSalaryAll";
import GenerateSalaryOne from "./generateSalaryOne";
import Link from "next/link";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import { useQuery } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

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
  user: { id: string; name: string; email: string };
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

  //salary interface
  const [loading, setLoading] = useState<boolean>(false);
  const [employees, setEmployees] = useState<
    {
      _id: string;
      memberNo: string;
      name: string;
      nic: string;
    }[]
  >([]);
  const [employeeSelection, setEmployeeSelection] = useState<string>("all");
  const [period, setPeriod] = useState<string>(
    dayjs().subtract(1, "month").format("YYYY-MM")
  );
  const { showSnackbar } = useSnackbar();
  const [errors, setErrors] = useState<{
    employee?: string;
    basic?: string;
  }>({});
  const [purchased, setPurchased] = useState<boolean>(true);

  const fetchEmployees = async (): Promise<
    {
      _id: string;
      memberNo: string;
      name: string;
      nic: string;
    }[]
  > => {
    const response = await fetch(`/api/employees?companyId=${companyId}`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch employees");
    }
    const result = await response.json();
    return [
      ...result.employees.map(
        (employee: {
          _id: string;
          memberNo: string;
          name: string;
          nic: string;
        }) => ({
          _id: employee._id,
          memberNo: employee.memberNo,
          name: employee.name,
          nic: employee.nic,
        })
      ),
    ];
  };

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: fetchEmployees,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (employeesData) {
      setEmployees([
        ...employeesData,
        { memberNo: "all", _id: "all", name: "ALL", nic: "all" },
      ]);
    }
  }, [employeesData]);

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
    queryKey: ["purchasedStatus", companyId, period],
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
                  getOptionLabel={(option) =>
                    option._id === "all"
                      ? `${option.name}`
                      : `${option.memberNo} - ${option.name} - ${option.nic}`
                  }
                  onChange={(_, newValue) => {
                    // Removed 'event' parameter
                    if (newValue) {
                      setFormFields((prevFields) => ({
                        ...prevFields,
                        employeeNo: newValue._id,
                        employeeName: newValue.name,
                      }));
                      setEmployeeSelection(newValue._id);
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
                      variant="outlined" // Changed to outlined for consistency
                      fullWidth
                    />
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option._id === value._id
                  }
                />
              </FormControl>
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
                        // Added slotProps for consistency
                        textField: {
                          fullWidth: true,
                          variant: "outlined",
                          InputProps: {
                            endAdornment: (
                              <>
                                {!purchased && (
                                  <Link
                                    href={`/user/mycompanies/${companyId}?companyPageSelect=purchases&newPurchase=true&periods=${
                                      period.split("-")[1]
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
            {employeeSelection === "all" ? (
              <GenerateSalaryAll companyId={companyId} period={period} />
            ) : (
              <GenerateSalaryOne
                companyId={companyId}
                employeeId={employeeSelection}
                period={period}
              />
            )}
          </Grid>
        </Grid>
      </CardContent>

      {/* Snackbar component removed, global one will be used */}
    </>
  );
};

export default AddSalaryForm;
