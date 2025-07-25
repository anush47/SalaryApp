"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  Box,
  CircularProgress,
  TextField,
  Grid,
  Tooltip,
  Button,
  IconButton,
  Typography,
  CardHeader,
  CardContent,
  InputAdornment,
  FormControl,
  FormHelperText,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import {
  Add,
  ArrowBack,
  Cancel,
  CheckBox,
  ExpandMore,
  Save,
  Search,
} from "@mui/icons-material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { defaultEmployee, Employee } from "./employeesDataGrid";
import { LoadingButton } from "@mui/lab";
import "dayjs/locale/en-gb";
import {
  PaymentStructure,
  validateAmountNumberString,
} from "../../companyDetails/paymentStructure";
import { Company } from "../../../clientComponents/companiesDataGrid";
import { Shifts } from "../../companyDetails/shifts";
import { WorkingDays } from "../../companyDetails/workingDays";

const AddEmployeeForm: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
  handleBackClick: () => void;
}> = ({ user, companyId, handleBackClick }) => {
  const [formFields, setFormFields] = useState<Employee>(defaultEmployee);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});

  const fetchCompanyData = async (): Promise<Company> => {
    const response = await fetch(`/api/companies?companyId=${companyId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch company");
    }
    const data = await response.json();
    return data.companies[0];
  };

  const { data: companyData, isLoading: isLoadingCompany } = useQuery<
    Company,
    Error
  >({
    queryKey: ["company", companyId],
    queryFn: fetchCompanyData,
    enabled: !!companyId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const fetchEmployeesForMemberNo = async (): Promise<Employee[]> => {
    const response = await fetch(`/api/employees?companyId=${companyId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch employees");
    }
    const data = await response.json();
    return data.employees;
  };

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<
    Employee[],
    Error
  >({
    queryKey: ["employees", companyId],
    queryFn: fetchEmployeesForMemberNo,
    enabled: !!companyId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (companyData) {
      setFormFields((prev) => ({
        ...prev,
        company: companyData._id,
        otMethod: user.role === "admin" ? "random" : "noOt",
        shifts:
          companyData.shifts && companyData.shifts.length > 0
            ? companyData.shifts
            : [{ start: "08:00", end: "17:00", break: 1 }],
        workingDays: companyData.workingDays
          ? companyData.workingDays
          : {
              mon: "full",
              tue: "full",
              wed: "full",
              thu: "full",
              fri: "full",
              sat: "half",
              sun: "off",
            },
        paymentStructure:
          companyData.paymentStructure &&
          companyData.paymentStructure.additions.length > 0 &&
          companyData.paymentStructure.deductions.length > 0
            ? companyData.paymentStructure
            : {
                additions: [
                  { name: "incentive", amount: "", affectTotalEarnings: true },
                  {
                    name: "performance allowance",
                    amount: "",
                    affectTotalEarnings: true,
                  },
                ],
                deductions: [],
              },
        probabilities: companyData.probabilities
          ? companyData.probabilities
          : {
              workOnOff: 1,
              workOnHoliday: 1,
              absent: 5,
              late: 2,
              ot: 75,
            },
      }));
    }
  }, [companyData, user]);

  useEffect(() => {
    if (employeesData) {
      const sortedEmployees = [...employeesData].sort(
        (a: Employee, b: Employee) => a.memberNo - b.memberNo
      );
      const lastEmployee = sortedEmployees[sortedEmployees.length - 1];
      const newMemberNo = lastEmployee ? lastEmployee.memberNo + 1 : 1;
      setFormFields((prevFields) => ({ ...prevFields, memberNo: newMemberNo }));
      showSnackbar({
        message: `New Member No. - ${newMemberNo}`,
        severity: "success",
      });
    }
  }, [employeesData]);

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: Employee) => {
      const body = { ...employeeData, userId: user.id };
      const fieldsToCheck = [
        "shifts",
        "workingDays",
        "paymentStructure",
        "probabilities",
      ];

      fieldsToCheck.forEach((field) => {
        if (
          !employeeData.overrides?.[
            field as keyof typeof employeeData.overrides
          ]
        ) {
          delete body[field as keyof typeof body];
        }
      });

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add employee");
      }
      return response.json();
    },
    onSuccess: () => {
      const queryKey = [
        "employees",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      showSnackbar({
        message: "Employee saved successfully!",
        severity: "success",
      });
      handleBackClick();
    },
    onError: (error) => {
      showSnackbar({ message: error.message, severity: "error" });
    },
  });

  const loading =
    isLoadingCompany || isLoadingEmployees || addEmployeeMutation.isPending;

  // Unified handle change for all fields
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    let { name, value } = event.target;
    if (name === "active" || name.startsWith("overrides")) {
      // Handle checkbox state changes
      value = event.target.checked;
    } else if (name.startsWith("probabilities")) {
      // Handle probability changes
      value = parseInt(value);
    } else if (name === "totalSalary") {
      // Validate
      if (!validateAmountNumberString(value)) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          totalSalary: "Invalid salary format",
        }));
      } else {
        setErrors((prevErrors) => {
          const { totalSalary, ...rest } = prevErrors;
          return rest;
        });
      }
    }

    if (name.includes(".")) {
      const parts = name.split("."); // Split the name by '.' to get the field name and
      const field = parts[0]; // the subfield name
      const subField = parts[1]; // the subfield name
      setFormFields((prevFields) => ({
        ...prevFields,
        [field]: {
          ...(prevFields[field as keyof Employee] as Record<string, any>),
          [subField]: value,
        },
      }));
      return;
    }

    setFormFields((prevFields) => ({ ...prevFields, [name]: value }));
  };

  const onSaveClick = () => {
    if (Object.keys(errors).length > 0) {
      return;
    }
    addEmployeeMutation.mutate(formFields);
  };

  const onFetchMemberNoClick = () => {
    if (employeesData) {
      const sortedEmployees = [...employeesData].sort(
        (a, b) => a.memberNo - b.memberNo
      );
      const lastEmployee = sortedEmployees[sortedEmployees.length - 1];
      const newMemberNo = lastEmployee ? lastEmployee.memberNo + 1 : 1;
      setFormFields((prevFields) => ({ ...prevFields, memberNo: newMemberNo }));
      showSnackbar({
        message: `New Member No. - ${newMemberNo}`,
        severity: "success",
      });
    }
  };

  // const handleSnackbarClose = ( // Removed
  //   event?: React.SyntheticEvent | Event,
  //   reason?: string
  // ) => {
  //   if (reason === "clickaway") {
  //     return;
  //   }
  //   setSnackbarOpen(false);
  // };

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
              <Tooltip title="Discard and go back to my companies" arrow>
                <IconButton onClick={handleBackClick}>
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Typography variant="h4" component="h1">
                Add Employee
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Add new employee" arrow>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Save />}
                  sx={{
                    ml: 2,
                  }}
                  onClick={onSaveClick}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Add"}
                </Button>
              </Tooltip>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.name}>
              <TextField
                label="Name"
                name="name"
                value={formFields.name}
                onChange={handleChange}
                variant="filled"
              />
              {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.memberNo}>
              <TextField
                label="Member Number"
                name="memberNo"
                type="number"
                value={formFields.memberNo}
                onChange={handleChange}
                variant="filled"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <LoadingButton
                        variant="text"
                        color="inherit"
                        endIcon={<Search />}
                        loading={isLoadingEmployees}
                        loadingPosition="end"
                        onClick={onFetchMemberNoClick}
                        disabled={isLoadingEmployees} // Disable button while loading
                        sx={{ marginTop: 1 }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              {errors.memberNo && (
                <FormHelperText>{errors.memberNo}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.nic}>
              <TextField
                label="NIC"
                name="nic"
                value={formFields.nic}
                onChange={handleChange}
                variant="filled"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.basic}>
              <TextField
                label="Basic"
                name="basic"
                type="number"
                value={formFields.basic}
                onChange={handleChange}
                variant="filled"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.divideBy}>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                label="Category"
                name="divideBy"
                value={formFields.divideBy}
                onChange={handleChange}
                variant="outlined"
              >
                {categories}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.divideBy}>
              <InputLabel id="otMethod-label">OT-Method</InputLabel>
              <Select
                labelId="otMethod-label"
                label="OT Method"
                name="otMethod"
                value={formFields.otMethod}
                onChange={handleChange}
                variant="outlined"
              >
                {otMethods}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.designation}>
              <TextField
                label="Designation"
                name="designation"
                value={formFields.designation}
                onChange={handleChange}
                variant="filled"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.startedAt}>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en-gb"
              >
                <DatePicker
                  label="Started At"
                  name="startedAt"
                  openTo="year"
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormFields((prevFields) => ({
                      ...prevFields,
                      startedAt:
                        newDate !== null
                          ? (newDate?.format("DD-MM-YYYY") as string)
                          : "",
                    }));
                  }}
                  slotProps={{
                    field: { clearable: true },
                  }}
                />
              </LocalizationProvider>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Total Salary"
                name="totalSalary"
                variant="filled"
                value={formFields.totalSalary}
                onChange={handleChange}
                helperText={errors.totalSalary}
                error={!!errors.totalSalary}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">LKR</InputAdornment>
                  ),
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    defaultChecked
                    size="large"
                    name="active"
                    color="success"
                    value={formFields.active}
                    onChange={handleChange}
                  />
                }
                label="Is Active ?"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.remark}>
              <TextField
                label="Remark"
                name="remark"
                value={formFields.remark}
                onChange={handleChange}
                variant="filled"
                multiline
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <TextField
                label="Address"
                name="address"
                variant="filled"
                value={formFields.address}
                onChange={handleChange}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Phone Number"
                name="phoneNumber"
                variant="filled"
                value={formFields.phoneNumber}
                onChange={handleChange}
              />
            </FormControl>
          </Grid>
          <div className="my-5" />
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Email"
                name="email"
                type="email"
                variant="filled"
                value={formFields.email}
                onChange={handleChange}
              />
            </FormControl>
          </Grid>
        </Grid>
        <div className="my-5" />
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <Typography variant="h5">Overrides</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          formFields.overrides?.paymentStructure || false
                        }
                        name="overrides.paymentStructure"
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Payment Structure"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formFields.overrides?.shifts || false}
                        name="overrides.shifts"
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Shifts"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formFields.overrides?.workingDays || false}
                        name="overrides.workingDays"
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Working Days"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formFields.overrides?.calendar || false}
                        name="overrides.calendar"
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Calendar"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formFields.overrides?.probabilities || false}
                        name="overrides.probabilities"
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Probabilities"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {formFields.overrides?.paymentStructure && (
          <>
            <div className="my-5" />
            <Grid item xs={12}>
              <PaymentStructure
                isEditing={true}
                handleChange={handleChange}
                paymentStructure={formFields.paymentStructure}
                setPaymentStructure={(paymentStructure) => {
                  //console.log("Setting payment structure:", paymentStructure); // Debugging
                  setFormFields((prev) => ({
                    ...prev,
                    paymentStructure,
                  }));
                }}
              />
            </Grid>
          </>
        )}

        {formFields.overrides?.shifts && (
          <>
            <div className="my-5" />
            <Grid item xs={12}>
              <Shifts
                isEditing={true}
                handleChange={handleChange}
                shifts={formFields.shifts}
                setShifts={(shifts) => {
                  //console.log("Setting shifts:", shifts); // Debugging
                  setFormFields((prev) => ({
                    ...prev,
                    shifts,
                  }));
                }}
              />
            </Grid>
          </>
        )}

        {formFields.overrides?.workingDays && (
          <>
            <div className="my-5" />
            <Grid item xs={12}>
              <WorkingDays
                isEditing={true}
                workingDays={formFields.workingDays}
                setWorkingDays={(workingDays) => {
                  setFormFields((prev) => ({
                    ...prev,
                    workingDays,
                  }));
                  //console.log("Setting working days:", formFields); // Debugging
                }}
              />
            </Grid>
          </>
        )}

        {formFields.overrides?.calendar && (
          <>
            <div className="my-5" />
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h5">Calendar</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="calendar-label">Calendar</InputLabel>
                    <Select
                      labelId="calendar-label"
                      label="Calendar"
                      name="calendar"
                      value={formFields.calendar || "default"}
                      onChange={handleChange}
                      variant="outlined"
                    >
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </>
        )}

        {
          //if admin
          user.role === "admin" &&
            formFields.overrides.probabilities &&
            (formFields.otMethod === "random" ||
              formFields.otMethod === "noOt") && (
              <>
                <div className="my-5" />
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h5">Probabilities</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3} mt={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Work on Off Days (%)"
                              name="probabilities.workOnOff"
                              type="number"
                              value={formFields.probabilities?.workOnOff}
                              onChange={handleChange}
                              variant="filled"
                              InputProps={{}}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Work on Holidays (%)"
                              name="probabilities.workOnHoliday"
                              type="number"
                              value={formFields.probabilities?.workOnHoliday}
                              onChange={handleChange}
                              variant="filled"
                              InputProps={{}}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Absent (%)"
                              name="probabilities.absent"
                              type="number"
                              value={formFields.probabilities?.absent}
                              onChange={handleChange}
                              variant="filled"
                              InputProps={{}}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Late (%)"
                              name="probabilities.late"
                              type="number"
                              value={formFields.probabilities?.late}
                              onChange={handleChange}
                              variant="filled"
                              InputProps={{}}
                            />
                          </FormControl>
                        </Grid>
                        {formFields.otMethod !== "noOt" && (
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <TextField
                                label="OT (%)"
                                name="probabilities.ot"
                                type="number"
                                value={formFields.probabilities?.ot}
                                onChange={handleChange}
                                variant="filled"
                                InputProps={{}}
                              />
                            </FormControl>
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </>
            )
        }
      </CardContent>

      {/* Snackbar component removed, global one will be used */}
    </>
  );
};

export const categories = [
  { value: 240, label: "Shop & Office Act" },
  { value: 200, label: "Wages Board (Common)" },
  { value: 240, label: "Wages Board - 240" },
].map((category) => (
  <MenuItem key={category.label} value={category.value}>
    {category.label}
  </MenuItem>
));

export const otMethods = [
  { value: "random", label: "Randomly Generated" },
  { value: "noOt", label: "No Overtime" },
  { value: "calc", label: "Calculate from In-Out" },
].map((method) => (
  <MenuItem key={method.label} value={method.value}>
    {method.label}
  </MenuItem>
));

export default AddEmployeeForm;
