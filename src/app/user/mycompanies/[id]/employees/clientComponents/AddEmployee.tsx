"use client";
import React, { useEffect, useState } from "react";
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
  useMediaQuery,
  useTheme,
  InputAdornment,
  FormControl,
  FormHelperText,
  // Snackbar, // Removed
  // Alert, // Removed (ensure it's not used for other purposes)
  Slide, // Keep if used for other transitions
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
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar
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
  const [loading, setLoading] = useState<boolean>(false);
  const [memberNoLoading, setNameLoading] = useState<boolean>(false);
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  // const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false); // Removed
  // const [snackbarMessage, setSnackbarMessage] = useState<string>(""); // Removed
  // const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success"); // Removed
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/companies?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch company");
        }
        const data = await response.json();
        setCompany(data.companies[0]);
        // Set default payment structure to payments from company
        setFormFields((prev) => ({
          ...prev,
          company: data.companies[0]._id,
          otMethod: user.role === "admin" ? "random" : "noOt",
          shifts:
            data.companies[0].shifts && data.companies[0].shifts.length > 0
              ? data.companies[0].shifts
              : [{ start: "08:00", end: "17:00", break: 1 }],
          workingDays: data.companies[0].workingDays
            ? data.companies[0].workingDays
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
            data.companies[0].paymentStructure &&
            data.companies[0].paymentStructure.additions.length > 0 &&
            data.companies[0].paymentStructure.deductions.length > 0
              ? data.companies[0].paymentStructure
              : {
                  additions: [
                    { name: "incentive", amount: "" },
                    { name: "performance allowance", amount: "" },
                  ],
                  deductions: [],
                },
          probabilities: data.companies[0].probabilities
            ? data.companies[0].probabilities
            : {
                workOnOff: 1,
                workOnHoliday: 1,
                absent: 5,
                late: 2,
                ot: 75,
              },
        }));
      } catch (error) {
        // setSnackbarMessage(error instanceof Error ? error.message : "Error fetching company."); // Removed
        // setSnackbarSeverity("error"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({
          message:
            error instanceof Error ? error.message : "Error fetching company.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    if (companyId?.length === 24) {
      fetchCompany();
      onFetchMemberNoClick();
    } else {
      // setSnackbarMessage("Invalid Company ID"); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({ message: "Invalid Company ID", severity: "error" });
    }
  }, [companyId, user, showSnackbar]); // Added showSnackbar

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
        setErrors((prevErrors) => ({
          ...prevErrors,
          totalSalary: "",
        }));
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

  const onSaveClick = async () => {
    if (!true) {
      // Placeholder for validation logic
      return;
    }
    setLoading(true);
    try {
      // Perform POST request to add a new employee

      const body = { ...formFields, userId: user.id }; // Include user ID
      const fieldsToCheck = [
        "shifts",
        "workingDays",
        "paymentStructure",
        "probabilities",
      ];

      fieldsToCheck.forEach((field) => {
        if (
          !formFields.overrides?.[field as keyof typeof formFields.overrides]
        ) {
          delete body[field as keyof typeof body]; // Explicitly cast field to match the object keys
        }
      });

      console.log(body);
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        // setSnackbarMessage("Employee saved successfully!"); // Removed
        // setSnackbarSeverity("success"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({
          message: "Employee saved successfully!",
          severity: "success",
        });

        // Wait for 2 seconds before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Keep or adjust delay

        // Clear the form after successful save
        setErrors({});
        handleBackClick();
      } else {
        // Handle validation or other errors returned by the API
        // setSnackbarMessage(result.message || "Error saving employee. Please try again."); // Removed
        // setSnackbarSeverity("error"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({
          message: result.message || "Error saving employee. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      // setSnackbarMessage("Error saving employee. Please try again."); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Error saving employee. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onFetchMemberNoClick = async () => {
    setNameLoading(true);
    try {
      setLoading(true);
      const response = await fetch(`/api/employees?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }
      const data = await response.json();
      const employees = data.employees;

      //sort employees from memberno and get last memberno
      employees.sort((a: Employee, b: Employee) => a.memberNo - b.memberNo);
      const lastEmployee = employees[employees.length - 1];
      const newMemberNo = lastEmployee ? lastEmployee.memberNo + 1 : 1;

      setFormFields((prevFields) => ({ ...prevFields, memberNo: newMemberNo }));

      // Show success snackbar with the fetched name
      // setSnackbarMessage(`New Member No. - ${newMemberNo}`); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: `New Member No. - ${newMemberNo}`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error fetching Member No:", error);
      // setSnackbarMessage("Error fetching Member No. Please try again."); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Error fetching Member No. Please try again.",
        severity: "error",
      });
    } finally {
      setNameLoading(false);
      setLoading(false);
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
                        loading={memberNoLoading}
                        loadingPosition="end"
                        onClick={onFetchMemberNoClick}
                        disabled={memberNoLoading} // Disable button while loading
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
