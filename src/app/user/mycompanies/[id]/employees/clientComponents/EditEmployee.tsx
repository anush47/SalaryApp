"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  fetchEmployee,
  fetchCompany,
  fetchDepartments,
  fetchEmployees,
} from "@/app/lib/api";
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
  InputLabel,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  Delete,
  Edit,
  ExpandMore,
  FormatAlignJustify,
  Save,
} from "@mui/icons-material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ddmmyyyy_to_mmddyyyy,
  defaultEmployee,
  Employee,
} from "./employeesDataGrid";
import "dayjs/locale/en-gb";
import {
  PaymentStructure,
  validateAmountNumberString,
} from "../../companyDetails/paymentStructure";
import dayjs from "dayjs";
//import { Company } from "./companiesDataGrid";
//import { CompanyValidation } from "./companyValidation";
import Dialog from "@mui/material/Dialog";
import UserCreationDialog from "./UserCreationDialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { categories, otMethods } from "./AddEmployee";
import { Shifts } from "../../companyDetails/shifts";
import { WorkingDays } from "../../companyDetails/workingDays";
import Link from "next/link";
import { Company } from "../../../clientComponents/companiesDataGrid";
import { MenuItem } from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext"; // Import useSnackbar
import Documents from "../../../../clientComponents/employee/Documents";

const EditEmployeeForm: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  handleBackClick: () => void;
  companyId: string | null;
  employeeId: string | null;
}> = ({ user, handleBackClick, employeeId, companyId }) => {
  const [formFields, setFormFields] = useState<Employee>(defaultEmployee);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string | any>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchEmployeeData = async (): Promise<Employee> => {
    return fetchEmployee(employeeId!);
  };

  const fetchCompanyData = async (): Promise<Company> => {
    return fetchCompany(companyId!);
  };

  const fetchDepartmentsData = async () => {
    return fetchDepartments(companyId!);
  };

  const fetchEmployeesData = async () => {
    return fetchEmployees({ companyId: companyId || undefined });
  };

  const {
    data: employeeData,
    isLoading: isLoadingEmployee,
    isError: isErrorEmployee,
    error: errorEmployee,
  } = useQuery<Employee, Error>({
    queryKey: ["employees", companyId, employeeId],
    queryFn: fetchEmployeeData,
    enabled: !!employeeId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const {
    data: companyData,
    isLoading: isLoadingCompany,
    isError: isErrorCompany,
    error: errorCompany,
  } = useQuery<Company, Error>({
    queryKey: ["company", companyId],
    queryFn: fetchCompanyData,
    enabled: !!companyId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const { data: departments, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: fetchDepartmentsData,
    enabled: !!companyId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: fetchEmployeesData,
    enabled: !!companyId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (employeeData) {
      const employee = { ...employeeData };
      if (!employee.workingDays) {
        employee.workingDays = {
          mon: "off",
          tue: "off",
          wed: "off",
          thu: "off",
          fri: "off",
          sat: "off",
          sun: "off",
          isDynamicHolidays: false,
        };
      }

      const overrides = employee.overrides || {};
      if (
        !overrides.shifts ||
        !overrides.workingDays ||
        !overrides.paymentStructure ||
        !overrides.probabilities
      ) {
        if (companyData) {
          const companyDefaults = companyData;
          employee.shifts = overrides.shifts
            ? employee.shifts
            : companyDefaults.shifts;
          employee.workingDays = overrides.workingDays
            ? employee.workingDays
            : companyDefaults.workingDays;
          employee.paymentStructure = overrides.paymentStructure
            ? employee.paymentStructure
            : companyDefaults.paymentStructure;
          employee.probabilities = overrides.probabilities
            ? employee.probabilities
            : companyDefaults.probabilities;
        }
      }
      setFormFields(employee);
    }
  }, [employeeData, companyData]);

  useEffect(() => {
    if (isErrorEmployee) {
      showSnackbar({
        message: errorEmployee?.message || "Error fetching employee.",
        severity: "error",
      });
    }
    if (isErrorCompany) {
      console.log(errorCompany, "gfhvfgfch");
      showSnackbar({
        message: errorCompany?.message || "Error fetching company.",
        severity: "error",
      });
    }
  }, [
    isErrorEmployee,
    errorEmployee,
    isErrorCompany,
    errorCompany,
    showSnackbar,
  ]);

  const loading = isLoadingEmployee || isLoadingCompany || isLoading || isLoadingDepartments;

  // Unified handle change for all fields
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    let { name, value } = event.target;
    if (
      name === "active" ||
      name === "canLogin" ||
      name === "isMarried" ||
      name === "editable" ||
      name.startsWith("overrides")
    ) {
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

  const updateEmployeeMutation = useMutation({
    mutationFn: async (employeeData: Employee) => {
      const body = { ...employeeData, userId: user.id };
      if (body.name) {
        body.name = body.name.toUpperCase();
      }
      if (body.nic) {
        body.nic = body.nic.toUpperCase();
      }
      setIsLoading(true);
      const response = await fetch("/api/employees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.error?.message ||
          result.message ||
          "Failed to update employee";
        throw new Error(errorMessage);
      }

      // Handle the new API response structure
      if (result.success) {
        return result;
      } else {
        const errorMessage =
          result.error?.message || "Failed to update employee";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      const queryKey = [
        "employees",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      showSnackbar({
        message: "Employee updated successfully!",
        severity: "success",
      });
      handleBackClick();
    },
    onError: (error) => {
      showSnackbar({ message: error.message, severity: "error" });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const response = await fetch("/api/employees", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeId,
          userId: user.id,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.error?.message ||
          result.message ||
          "Failed to delete employee";
        throw new Error(errorMessage);
      }

      // Handle the new API response structure
      if (result.success) {
        return result;
      } else {
        const errorMessage =
          result.error?.message || "Failed to delete employee";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      const queryKey = [
        "employees",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      showSnackbar({
        message: "Employee deleted successfully!",
        severity: "success",
      });
      handleBackClick();
    },
    onError: (error) => {
      showSnackbar({ message: error.message, severity: "error" });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSaveClick = () => {
    if (Object.keys(errors).length > 0) {
      showSnackbar({
        message: `Please fix the errors in ${Object.keys(
          errors
        )} before saving.`,
        severity: "error",
      });
      return;
    }
    updateEmployeeMutation.mutate(formFields);
  };

  const handleDeleteConfirmation = () => {
    deleteEmployeeMutation.mutate();
  };

  const handleDeleteCancelation = () => {
    showSnackbar({ message: "Delete canceled", severity: "info" });
    setDeleteDialogOpen(false);
  };

  const onDeleteClick = async () => {
    setDeleteDialogOpen(true);
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

  const handleDeleteUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/employees/enable-login?employeeId=${employeeId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user account");
      }
      showSnackbar({
        message: "User account deleted successfully",
        severity: "success",
      });
      queryClient.invalidateQueries({
        queryKey: ["employees"],
      });
      setFormFields((prev) => ({ ...prev, user: undefined, canLogin: false }));
      setDeleteUserDialogOpen(false);
    } catch (error: any) {
      showSnackbar({
        message: error.message,
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const DeleteUserDialog = () => {
    return (
      <Dialog
        open={deleteUserDialogOpen}
        onClose={() => setDeleteUserDialogOpen(false)}
      >
        <DialogTitle>Delete User Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user account for this employee?
            They will no longer be able to log in.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteUser}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Delete"}
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
                Employee Details
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isEditing ? (
                <Tooltip title="Save changes" arrow>
                  <span>
                    <Button
                      variant="contained"
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
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  sx={{ mx: 0.25 }}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
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
            <FormControl fullWidth error={!!errors.department}>
              <InputLabel id="department-label">Department</InputLabel>
              <Select
                labelId="department-label"
                label="Department"
                name="department"
                value={formFields.department || ""}
                onChange={handleChange}
                variant="outlined"
                readOnly={!isEditing}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {departments?.map((dept: any) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formFields.canLogin || false}
                    size="large"
                    name="canLogin"
                    color="primary"
                    value={formFields.canLogin}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                  />
                }
                label="Can Login ?"
              />
              {formFields.user && (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ ml: 4 }}
                >
                  User account exists
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formFields.editable || false}
                    size="large"
                    name="editable"
                    color="primary"
                    value={formFields.editable}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                  />
                }
                label="Employee Can Edit Details ?"
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

          {/* Personal Details Section */}
          <Grid item xs={12}>
            <div className="my-5" />
            <Typography variant="h5" component="h2" gutterBottom>
              Personal Details
            </Typography>
            <Divider />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Full Name"
                name="fullName"
                variant="filled"
                value={formFields.fullName || ""}
                onChange={handleChange}
                InputProps={{
                  readOnly: !isEditing,
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Mother's Name"
                name="motherName"
                variant="filled"
                value={formFields.motherName || ""}
                onChange={handleChange}
                InputProps={{
                  readOnly: !isEditing,
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Father's Name"
                name="fatherName"
                variant="filled"
                value={formFields.fatherName || ""}
                onChange={handleChange}
                InputProps={{
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
                    checked={formFields.isMarried || false}
                    name="isMarried"
                    color="primary"
                    value={formFields.isMarried}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                  />
                }
                label="Is Married?"
              />
            </FormControl>
          </Grid>
          {formFields.isMarried && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <TextField
                  label="Spouse's Name"
                  name="spouseName"
                  variant="filled"
                  value={formFields.spouseName || ""}
                  onChange={handleChange}
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                  disabled={!isEditing}
                />
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Nationality"
                name="nationality"
                variant="filled"
                value={formFields.nationality || ""}
                onChange={handleChange}
                InputProps={{
                  readOnly: !isEditing,
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Emergency Contact"
                name="emergencyContact"
                variant="filled"
                value={formFields.emergencyContact || ""}
                onChange={handleChange}
                InputProps={{
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
                    checked={formFields.editable || false}
                    size="large"
                    name="editable"
                    color="primary"
                    value={formFields.editable}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                  />
                }
                label="Employee Can Edit Details ?"
              />
            </FormControl>
          </Grid>

          {/* Documents Section */}
          <Grid item xs={12}>
            <div className="my-5" />
            <Typography variant="h5" component="h2" gutterBottom>
              Documents
            </Typography>
            <Divider />
            <Documents
              documents={formFields.documents}
              setDocuments={(docs: any) =>
                setFormFields({ ...formFields, documents: docs })
              }
              editable={isEditing}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="department-label">Department</InputLabel>
              <Select
                labelId="department-label"
                label="Department"
                name="department"
                value={
                  typeof formFields.department === "object"
                    ? (formFields.department as any)?._id || ""
                    : formFields.department || ""
                }
                onChange={(e) => {
                  setFormFields((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }));
                }}
                variant="outlined"
                readOnly={!isEditing}
              >
                <MenuItem value="">None</MenuItem>
                {departments?.map((dept: any) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="manager-label">Manager</InputLabel>
              <Select
                labelId="manager-label"
                label="Manager"
                name="manager"
                value={
                  typeof formFields.manager === "object"
                    ? (formFields.manager as any)?._id || ""
                    : formFields.manager || ""
                }
                onChange={(e) => {
                  setFormFields((prev) => ({
                    ...prev,
                    manager: e.target.value,
                  }));
                }}
                variant="outlined"
                readOnly={!isEditing}
              >
                <MenuItem value="">None</MenuItem>
                {employees
                  ?.filter((emp: any) => emp._id !== employeeId)
                  .map((emp: any) => (
                    <MenuItem key={emp._id} value={emp._id}>
                      {emp.name} ({emp.memberNo}) - {emp.designation}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="employeeType-label">Employee Type</InputLabel>
              <Select
                labelId="employeeType-label"
                label="Employee Type"
                name="employeeType"
                value={formFields.employeeType || "permanent"}
                onChange={handleChange}
                variant="outlined"
                readOnly={!isEditing}
              >
                <MenuItem value="permanent">Permanent</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
                <MenuItem value="temporary">Temporary</MenuItem>
              </Select>
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
                        checked={formFields.overrides?.calendar || false}
                        name="overrides.calendar"
                        onChange={handleChange}
                        disabled={!isEditing || loading}
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

        {formFields.overrides?.paymentStructure && (
          <>
            <div className="my-5" />
            <Grid item xs={12}>
              <PaymentStructure
                isEditing={isEditing}
                handleChange={handleChange}
                paymentStructure={formFields.paymentStructure}
                setPaymentStructure={(paymentStructure) => {
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
                isEditing={isEditing}
                handleChange={handleChange}
                shifts={formFields.shifts}
                setShifts={(shifts) => {
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
                isEditing={isEditing}
                workingDays={formFields.workingDays}
                setWorkingDays={(workingDays) => {
                  setFormFields((prev) => ({
                    ...prev,
                    workingDays,
                  }));
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
                      readOnly={!isEditing}
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
          formFields.overrides?.probabilities &&
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
            href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${employeeId}&ah=true`}
          >
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FormatAlignJustify />}
              disabled={loading} // Disable button while loading
            >
              {loading ? <CircularProgress size={24} /> : "Generate AH"}
            </Button>
          </Link>
        </Grid>

        <Grid mt={3} item xs={12}>
          {formFields.user ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteUserDialogOpen(true)}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                "Delete User Account"
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setCreateUserDialogOpen(true)}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  "Create User Account"
                )}
              </Button>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ ml: 2, display: "block", mt: 1 }}
              >
                Note: Employee must have an email address to create a login
                account.
              </Typography>
            </>
          )}
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

      <DeleteDialog />
      <DeleteUserDialog />

      <UserCreationDialog
        open={createUserDialogOpen}
        onClose={() => setCreateUserDialogOpen(false)}
        defaultEmail={formFields.email || ""}
        employeeId={employeeId}
        userId={user.id}
      />
    </>
  );
};

export default EditEmployeeForm;
