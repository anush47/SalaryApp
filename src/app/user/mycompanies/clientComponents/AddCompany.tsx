"use client";
import React, { useState } from "react";
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
  Snackbar,
  Alert,
  Slide,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { ArrowBack, Save, Search } from "@mui/icons-material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LoadingButton } from "@mui/lab";
import { Company } from "./companiesDataGrid";
import { CompanyValidation } from "./companyValidation";
import dayjs from "dayjs";
import { ddmmyyyy_to_mmddyyyy } from "../[id]/employees/clientComponents/employeesDataGrid";

const AddCompanyForm: React.FC<{
  user: { id: string; name: string; email: string };
  handleBackClick: () => void;
}> = ({ user, handleBackClick }) => {
  const [formFields, setFormFields] = useState<Company>({
    id: "",
    name: "",
    employerNo: "",
    address: "",
    user: "",
    startedAt: "",
    endedAt: "",
    active: true,
    monthlyPrice: "",
    monthlyPriceOverride: false,
    employerAddress: "",
    employerName: "",
    mode: "",
    workingDays: {},
    paymentMethod: "",
    openHours: {
      start: "",
      end: "",
      allDay: true,
    },
    paymentStructure: {
      additions: [],
      deductions: [],
    },
    requiredDocs: {
      epf: true,
      etf: true,
      salary: true,
      paySlip: true,
    },
    probabilities: {
      workOnOff: 1,
      workOnHoliday: 1,
      absent: 5,
      late: 2,
      ot: 75,
    },
    shifts: [],
    calendar: "default",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [nameLoading, setNameLoading] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [errors, setErrors] = useState<{ name?: string; employerNo?: string }>(
    {}
  );

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const formatTime = (value: string) => {
    // Format time to HH:MM if necessary
    const [hours, minutes] = value.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  // Unified handle change for all fields
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>
  ) => {
    let { name, value } = event.target;
    if (name.startsWith("openHours")) {
      //split
      const [_, subName] = name.split(".");
      if (subName === "allDay") {
        value = event.target.checked;
      } else {
        value = formatTime(value);
      }
      setFormFields((prevFields) => ({
        ...prevFields,
        openHours: {
          ...prevFields.openHours,
          [subName]: value,
        },
      }));
    } else {
      //capitalize name
      if (name === "name" || name === "employerNo") {
        value = value.toUpperCase();
      }
      if (name === "active") {
        value = event.target.checked;
      }
      setFormFields((prevFields) => ({ ...prevFields, [name]: value }));
    }
  };

  const onSaveClick = async () => {
    const newErrors = CompanyValidation(formFields);
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      // Perform POST request to add a new company
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formFields,
          userId: user.id, // Include user ID
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbarMessage("Company Added successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        //wait
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Clear the form after successful save
        setFormFields({
          id: "",
          name: "",
          user: "",
          employerNo: "",
          address: "",
          startedAt: "",
          active: true,
          endedAt: "",
          paymentMethod: "",
          monthlyPrice: "",
          monthlyPriceOverride: false,
          mode: "",
          workingDays: {},
          employerName: "",
          employerAddress: "",
          openHours: {
            start: "09:00",
            end: "17:00",
            allDay: true,
          },
          probabilities: {
            workOnOff: 1,
            workOnHoliday: 1,
            absent: 5,
            late: 2,
            ot: 75,
          },
          shifts: [],
          paymentStructure: {
            additions: [],
            deductions: [],
          },
          requiredDocs: {
            epf: true,
            etf: true,
            salary: true,
            paySlip: true,
          },
          calendar: "default",
        });
        setErrors({});
        handleBackClick();
      } else {
        // Handle validation or other errors returned by the API
        setSnackbarMessage(
          result.message || "Error saving company. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error saving company:", error);

      setSnackbarMessage("Error saving company. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const onFetchNameClick = async () => {
    setNameLoading(true);
    try {
      const response = await fetch("/api/companies/getReferenceNoName", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employerNo: formFields.employerNo,
        }),
      });
      const result = await response.json();

      // Simulate fetching company name
      //const name = await fetchCompanyName(formFields.employerNo);
      const name = result.name;
      if (!name) {
        setSnackbarMessage("Employer number not found. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      setFormFields((prevFields) => ({
        ...prevFields,
        name: name.toUpperCase(),
      }));

      // Show success snackbar with the fetched name
      setSnackbarMessage(`Name found: ${name}`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error fetching company name:", error);

      setSnackbarMessage("Error fetching company name. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setNameLoading(false);
    }
  };

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
              gap: 2,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Discard and go back to my companies" arrow>
                <IconButton onClick={handleBackClick}>
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Typography variant={isSmallScreen ? "h5" : "h4"} mr={3}>
                Add Company
              </Typography>
              <Tooltip title="Save new company" arrow>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Save />}
                  onClick={onSaveClick}
                  disabled={loading} // Disable button while loading
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
          <Grid item xs={12} sm={8}>
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
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth error={!!errors.employerNo}>
              <TextField
                label="Employer Number"
                placeholder="A/12345"
                name="employerNo"
                value={formFields.employerNo}
                onChange={handleChange}
                variant="filled"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <LoadingButton
                        variant="text"
                        color="inherit"
                        endIcon={<Search />}
                        loading={nameLoading}
                        loadingPosition="end"
                        onClick={onFetchNameClick}
                        disabled={nameLoading} // Disable button while loading
                        sx={{ marginTop: 1 }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              {errors.employerNo && (
                <FormHelperText>{errors.employerNo}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <TextField
                label="Company Address"
                name="address"
                value={formFields.address}
                onChange={handleChange}
                variant="filled"
                size="small"
                multiline
                minRows={2}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en-gb"
              >
                <DatePicker
                  label="Started At"
                  name="startedAt"
                  openTo="year"
                  value={
                    formFields.startedAt
                      ? dayjs(
                          ddmmyyyy_to_mmddyyyy(formFields.startedAt as string)
                        )
                      : null
                  }
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormFields((prevFields) => ({
                      ...prevFields,
                      startedAt: newDate?.format("DD-MM-YYYY") as string | Date,
                    }));
                  }}
                  slotProps={{
                    field: { clearable: true },
                  }}
                />
              </LocalizationProvider>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formFields.active}
                    size="large"
                    name="active"
                    color="success"
                    value={formFields.active}
                    onChange={handleChange}
                    disabled={loading}
                  />
                }
                label="Is Active ?"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formFields.openHours.allDay}
                    size="large"
                    name="openHours.allDay"
                    color="success"
                    value={formFields.openHours.allDay}
                    onChange={handleChange}
                    disabled={loading}
                  />
                }
                label="Open 24h ?"
              />
            </FormControl>
          </Grid>
          {formFields.openHours.allDay ? null : (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <TextField
                    label="Start Time"
                    type="time"
                    variant="filled"
                    name="openHours.start"
                    value={formFields.openHours.start}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <TextField
                    label="Close Time"
                    type="time"
                    variant="filled"
                    name="openHours.end"
                    value={formFields.openHours.end}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </FormControl>
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <TextField
                label="Payment Method"
                name="paymentMethod"
                value={formFields.paymentMethod}
                onChange={handleChange}
                variant="filled"
                size="small"
              />
            </FormControl>
            <FormHelperText>
              Bank name, branch EPF/ETF is paid. you may use &quot;Cash&quot; as
              well
            </FormHelperText>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Employer Name"
                name="employerName"
                value={formFields.employerName}
                onChange={handleChange}
                variant="filled"
                size="small"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Employer Address"
                name="employerAddress"
                value={formFields.employerAddress}
                onChange={handleChange}
                variant="filled"
                multiline
                size="small"
              />
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        //TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AddCompanyForm;
