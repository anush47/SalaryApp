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
  Snackbar,
  Alert,
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
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [errors, setErrors] = useState<{
    employee?: string;
    basic?: string;
  }>({});
  const [purchased, setPurchased] = useState<boolean>(true);

  // Fetch employees from the API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees?companyId=${companyId}`, {
          method: "GET",
        });
        const result = await response.json();

        setEmployees([
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
          { memberNo: "all", _id: "all", name: "ALL", nic: "all" }, // add all option
        ]);
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const checkPurchased = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/purchases/check?companyId=${companyId}&month=${period}`,
          {
            method: "GET",
          }
        );
        try {
          const result = await response.json();
          setPurchased(result?.purchased === "approved");
        } catch (error) {
          console.error("Error parsing JSON or updating state:", error);
          setPurchased(false); // or handle the error state as needed
        }
      } catch (error) {
        console.error("Error fetching salaries:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPurchased();
  }, [period]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

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
                                      Purchase Access
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        //TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AddSalaryForm;
