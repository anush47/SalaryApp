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
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const AddCompanyForm: React.FC<{
  user: { id: string; name: string; email: string };
  handleBackClick: () => void;
}> = ({ user, handleBackClick }) => {
  const [formFields, setFormFields] = useState<Company>({
    _id: "",
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
  const [nameLoading, setNameLoading] = useState<boolean>(false);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<{ name?: string; employerNo?: string }>(
    {}
  );

  const addCompanyMutation = useMutation({
    mutationFn: async (newCompany: any) => {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCompany),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message || "Error saving company. Please try again."
        );
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showSnackbar({
        message: "Company Added successfully!",
        severity: "success",
      });
      handleBackClick();
    },
    onError: (error: Error) => {
      showSnackbar({
        message: error.message,
        severity: "error",
      });
    },
  });

  const formatTime = (value: string) => {
    const [hours, minutes] = value.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>
  ) => {
    let { name, value } = event.target;
    if (name.startsWith("openHours")) {
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

    await addCompanyMutation.mutateAsync({ ...formFields, userId: user.id });
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

      const name = result.name;
      if (!name) {
        showSnackbar({
          message: "Employer number not found. Please try again.",
          severity: "error",
        });
        return;
      }
      setFormFields((prevFields) => ({
        ...prevFields,
        name: name.toUpperCase(),
      }));

      showSnackbar({ message: `Name found: ${name}`, severity: "success" });
    } catch (error) {
      showSnackbar({
        message: "Error fetching company name. Please try again.",
        severity: "error",
      });
    } finally {
      setNameLoading(false);
    }
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
                Add Company
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Add new company" arrow>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Save />}
                  sx={{
                    ml: 2,
                  }}
                  onClick={onSaveClick}
                  disabled={addCompanyMutation.isPending}
                >
                  {addCompanyMutation.isPending ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Add"
                  )}
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
                        disabled={nameLoading}
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
                    disabled={addCompanyMutation.isPending}
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
                    disabled={addCompanyMutation.isPending}
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
                    disabled={addCompanyMutation.isPending}
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
                    disabled={addCompanyMutation.isPending}
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
    </>
  );
};

export default AddCompanyForm;
