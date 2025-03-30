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
  Snackbar,
  Alert,
  Slide,
  Select,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import {
  ArrowBack,
  Cancel,
  Delete,
  Edit,
  ExpandMore,
  FormatAlignJustify,
  Save,
  Search,
} from "@mui/icons-material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ddmmyyyy_to_mmddyyyy,
  defaultEmployee,
  Employee,
} from "./employeesDataGrid";
import { LoadingButton } from "@mui/lab";
import "dayjs/locale/en-gb";
import {
  PaymentStructure,
  validateAmountNumberString,
} from "../../companyDetails/paymentStructure";
import { companyId } from "../../clientComponents/companySideBar";
import { Company } from "../../../clientComponents/companiesDataGrid";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
//import { Company } from "./companiesDataGrid";
//import { CompanyValidation } from "./companyValidation";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { TransitionProps } from "@mui/material/transitions";
import { categories, otMethods } from "./AddEmployee";
import { Shifts } from "../../companyDetails/shifts";
import { WorkingDays } from "../../companyDetails/workingDays";
import Link from "next/link";

const EditEmployeeForm: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  handleBackClick: () => void;
  employeeId: string | null;
}> = ({ user, handleBackClick, employeeId }) => {
  const [formFields, setFormFields] = useState<Employee>(defaultEmployee);
  const [loading, setLoading] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning" | "info"
  >("success");
  const [errors, setErrors] = useState<Record<string, string | any>>({});
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees?employeeId=${employeeId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch Employee");
        }
        const data = await response.json();
        setEmployee(data.employees[0]);
        //set working days if undefined
        if (!data.employees[0].workingDays) {
          data.employees[0].workingDays = {
            mon: "off",
            tue: "off",
            wed: "off",
            thu: "off",
            fri: "off",
            sat: "off",
            sun: "off",
          };
        }

        setFormFields(data.employees[0]);
      } catch (error) {
        setSnackbarMessage(
          error instanceof Error ? error.message : "Error fetching company."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };

    if (companyId?.length === 24) {
      fetchEmployee();
    } else {
      setSnackbarMessage("Invalid Company ID");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [companyId, user]);

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
      return;
    }

    setLoading(true);
    //capitalize for name,nic
    if (formFields.name) {
      formFields.name = formFields.name.toUpperCase();
    }
    if (formFields.nic) {
      formFields.nic = formFields.nic.toUpperCase();
    }
    try {
      // Perform POST request to update the employee
      const response = await fetch("/api/employees", {
        method: "PUT",
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
        setSnackbarMessage("Employee updated successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setErrors({});
        handleBackClick();
      } else {
        setSnackbarMessage(
          result.message || "Error saving employee. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      setSnackbarMessage("Error saving employee. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmation = async () => {
    try {
      // Perform DELETE request to delete the employee
      const response = await fetch("/api/employees", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeId,
          userId: user.id, // Include user ID
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbarMessage("Employee deleted successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setFormFields(defaultEmployee);
        setErrors({});
        handleBackClick();
      } else {
        setSnackbarMessage(
          result.message || "Error deleting employee. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      setSnackbarMessage("Error deleting employee. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  //delete cancelation
  const handleDeleteCancelation = () => {
    //show snackbar
    setSnackbarMessage("Delete canceled");
    setSnackbarSeverity("info");
    setSnackbarOpen(true);
    setDeleteDialogOpen(false);
  };

  const onDeleteClick = async () => {
    setDeleteDialogOpen(true);
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

  const DeleteDialog = () => {
    return (
      <Dialog
        open={deleteDialogOpen}
        keepMounted
        onClose={handleDeleteCancelation}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>{"Delete Employee?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            Are you sure you want to delete this employee?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancelation}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirmation}
            color="error"
            endIcon={<Delete />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <CardHeader
        title={
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant={isSmallScreen ? "h5" : "h4"}>
              <Tooltip title="Discard and go back to my companies" arrow>
                <IconButton
                  sx={{
                    mr: 2,
                  }}
                  onClick={handleBackClick}
                >
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              Edit Employee
              {isEditing ? (
                <Tooltip title="Save new company" arrow>
                  <span>
                    <Button
                      variant="outlined"
                      sx={{
                        marginLeft: 1,
                      }}
                      color="success"
                      startIcon={<Save />}
                      onClick={onSaveClick}
                      disabled={loading} // Disable button while loading
                    >
                      {loading ? <CircularProgress size={24} /> : "Save"}
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <IconButton
                  sx={{
                    marginLeft: 1,
                  }}
                  color="primary"
                  onClick={() => setIsEditing(true)}
                >
                  {loading ? <CircularProgress size={24} /> : <Edit />}
                </IconButton>
              )}
            </Typography>
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
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                  readOnly: !isEditing,
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
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                readOnly={!isEditing}
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
                readOnly={!isEditing}
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
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                  readOnly={!isEditing}
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
            <FormControl fullWidth error={!!errors.resignedAt}>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en-gb"
              >
                <DatePicker
                  readOnly={!isEditing}
                  label="Resigned At"
                  name="resignedAt"
                  openTo="year"
                  value={
                    formFields.resignedAt
                      ? dayjs(
                          ddmmyyyy_to_mmddyyyy(formFields.resignedAt as string)
                        )
                      : null
                  }
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormFields((prevFields) => ({
                      ...prevFields,
                      resignedAt:
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
                  readOnly: !isEditing,
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
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
                    disabled={!isEditing || loading}
                    //disabled colour fix
                    sx={{
                      "& .MuiSvgIcon-root": {
                        color: formFields.active ? "green" : "red",
                      },
                    }}
                  />
                }
                label="Is Active ?"
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Remark"
                name="remark"
                variant="filled"
                value={formFields.remark}
                multiline
                onChange={handleChange}
                helperText={errors.remark}
                error={!!errors.remark}
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                helperText={errors.phoneNumber}
                error={!!errors.phoneNumber}
                InputProps={{
                  readOnly: !isEditing,
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Email"
                name="email"
                variant="filled"
                value={formFields.email}
                onChange={handleChange}
                helperText={errors.email}
                error={!!errors.email}
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                InputProps={{
                  readOnly: !isEditing,
                }}
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
                        disabled={!isEditing || loading}
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
                        disabled={!isEditing || loading}
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
                        disabled={!isEditing || loading}
                      />
                    }
                    label="Working Days"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formFields.overrides?.probabilities || false}
                        name="overrides.probabilities"
                        onChange={handleChange}
                        disabled={!isEditing || loading}
                      />
                    }
                    label="Probabilities"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {formFields.overrides.paymentStructure && (
          <>
            <div className="my-5" />
            <Grid item xs={12}>
              <PaymentStructure
                isEditing={isEditing}
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

        {formFields.overrides.shifts && (
          <>
            <div className="my-5" />
            <Grid item xs={12}>
              <Shifts
                isEditing={isEditing}
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

        {formFields.overrides.workingDays && (
          <>
            <div className="my-5" />

            <Grid item xs={12}>
              <WorkingDays
                isEditing={isEditing}
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
                              InputProps={{
                                readOnly: !isEditing,
                              }}
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
                              InputProps={{ readOnly: !isEditing }}
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
                              InputProps={{ readOnly: !isEditing }}
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
                              InputProps={{ readOnly: !isEditing }}
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
                                InputProps={{ readOnly: !isEditing }}
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

        <Grid mt={3} item xs={12}>
          <Link
            href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${employeeId}&abh=true`}
          >
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FormatAlignJustify />}
              disabled={loading} // Disable button while loading
            >
              {loading ? <CircularProgress size={24} /> : "Generate ABH"}
            </Button>
          </Link>
        </Grid>

        <Grid mt={3} item xs={12}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={onDeleteClick}
            disabled={!isEditing || loading} // Disable button while loading
          >
            {loading ? <CircularProgress size={24} /> : "Delete Employee"}
          </Button>
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

      <DeleteDialog />
    </>
  );
};

export default EditEmployeeForm;
