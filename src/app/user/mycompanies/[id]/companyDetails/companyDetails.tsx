"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  TextField,
  Typography,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  AccordionDetails,
  Accordion,
  AccordionSummary,
  Alert,
} from "@mui/material";
import {
  Save,
  Cancel,
  Edit,
  Delete,
  Search,
  ExpandMore,
  Done,
} from "@mui/icons-material";
import { Company } from "../../clientComponents/companiesDataGrid";
import { CompanyValidation } from "../../clientComponents/companyValidation";
import { PaymentStructure } from "./paymentStructure";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ddmmyyyy_to_mmddyyyy } from "../employees/clientComponents/employeesDataGrid";
import dayjs from "dayjs";
import { Shifts } from "./shifts";
import { WorkingDays } from "./workingDays";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

const ChangeUser = React.lazy(() => import("./ChangeUser"));

const fetchCompany = async (companyId: string) => {
  const companyResponse = await fetch(`/api/companies?companyId=${companyId}`);
  if (!companyResponse.ok) {
    throw new Error("Failed to fetch company");
  }
  const companyData = await companyResponse.json();
  const companyWithId = {
    ...companyData.companies[0],
    id: companyData.companies[0]._id,
  };
  return companyWithId;
};

const fetchUser = async (userId: string) => {
  if (!userId) return null;
  const userResponse = await fetch(`/api/users?userId=${userId}`);
  if (!userResponse.ok) {
    throw new Error("Failed to fetch user details");
  }
  const userData = await userResponse.json();
  if (userData.users[0]) {
    return {
      userName: userData.users[0].name,
      userEmail: userData.users[0].email,
    };
  }
  return null;
};

const CompanyDetails = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const {
    data: company,
    isLoading: isCompanyLoading,
    isError: isCompanyError,
    error: companyError,
  } = useQuery<Company, Error>({
    queryKey: ["companies", companyId],
    queryFn: () => fetchCompany(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!companyId && companyId.length === 24,
  });

  const {
    data: companyUser,
    isLoading: isUserLoading,
    isError: isUserError,
    error: userError,
  } = useQuery<any, Error>({
    queryKey: ["users", company?.user],
    queryFn: () => fetchUser(company?.user as string),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!company?.user && user.role === "admin",
  });

  const [formFields, setFormFields] = useState<Company | undefined>(company);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameLoading, setNameLoading] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; employerNo?: string }>(
    {}
  );

  useEffect(() => {
    if (company) {
      setFormFields(company);
    }
  }, [company]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (updatedCompany: Company) => {
      const response = await fetch(`/api/companies`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedCompany),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.message || "Error updating company. Please try again."
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showSnackbar({
        message: "Company updated successfully!",
        severity: "success",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      showSnackbar({
        message: error.message,
        severity: "error",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/companies`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: companyId }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.message || "Error deleting company. Please try again."
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showSnackbar({
        message: "Company deleted successfully!",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      window.location.href = "/user?userPageSelect=mycompanies";
    },
    onError: (error: Error) => {
      showSnackbar({
        message: error.message,
        severity: "error",
      });
    },
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any> | any
  ) => {
    let { name, value } = event.target;
    if (name === "active" || name === "monthlyPriceOverride") {
      value = event.target.checked;
    } else if (name.startsWith("requiredDocs")) {
      const requiredDocs = {
        ...formFields?.requiredDocs,
        [name.split(".")[1]]: event.target.checked,
      };
      setFormFields(
        (prevFields) =>
          ({
            ...prevFields,
            requiredDocs: requiredDocs,
          } as Company)
      );
      return;
    } else if (name.startsWith("probabilities")) {
      setFormFields(
        (prevFields) =>
          ({
            ...prevFields,
            probabilities: {
              ...prevFields?.probabilities,
              [name.split(".")[1]]: parseInt(value),
            },
          } as Company)
      );
      return;
    } else if (name.startsWith("openHours")) {
      const [_, subName] = name.split(".");
      if (subName === "allDay") {
        value = event.target.checked;
      } else {
        value = formatTime(value);
      }
      setFormFields(
        (prevFields) =>
          ({
            ...prevFields,
            openHours: {
              ...prevFields?.openHours,
              [subName]: value,
            },
          } as Company)
      );
      return;
    }

    setFormFields(
      (prevFields) => ({ ...prevFields, [name]: value } as Company)
    );
  };

  const handleSaveClick = async () => {
    if (!formFields) return;
    const newErrors = CompanyValidation(formFields);
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    if (!isValid) {
      return;
    }
    await updateCompanyMutation.mutateAsync(formFields);
  };

  const handleDeleteConfirmation = async () => {
    await deleteCompanyMutation.mutateAsync();
  };

  const handleDeleteCancelation = () => {
    showSnackbar({ message: "Delete canceled", severity: "info" });
    setDeleteDialogOpen(false);
  };

  const onDeleteClick = async () => {
    setDeleteDialogOpen(true);
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
          employerNo: formFields?.employerNo,
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
      setFormFields(
        (prevFields) =>
          ({
            ...prevFields,
            name: name.toUpperCase(),
          } as Company)
      );

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

  const modeTexts = {
    self: "Self",
    visit: "Visit",
    aided: "Aided",
  };
  const modes = [
    { label: modeTexts.self, value: "self" },
    { label: modeTexts.visit, value: "visit" },
    { label: modeTexts.aided, value: "aided" },
  ].map((category) => (
    <MenuItem key={category.label} value={category.value}>
      {category.label}
    </MenuItem>
  ));

  const formatTime = (value: string) => {
    const [hours, minutes] = value.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  if (isCompanyLoading || isUserLoading) {
    return <CircularProgress />;
  }

  if (isCompanyError) {
    return <Alert severity="error">{companyError.message}</Alert>;
  }

  if (isUserError) {
    return <Alert severity="error">{userError.message}</Alert>;
  }

  return (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
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
            <Typography variant="h4" component="h1">
              Company Details
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isEditing ? (
                <Tooltip title="Save changes" arrow>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Save />}
                    onClick={handleSaveClick}
                    disabled={updateCompanyMutation.isPending}
                  >
                    {updateCompanyMutation.isPending ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  disabled={isCompanyLoading}
                  onClick={() => setIsEditing(true)}
                >
                  {isCompanyLoading ? <CircularProgress size={24} /> : "Edit"}
                </Button>
              )}
            </Box>
          </Box>
        }
      />
      <CardContent
        sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
      >
        {formFields && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={8}>
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth error={!!errors.employerNo}>
                <TextField
                  label="Employer Number"
                  name="employerNo"
                  value={formFields.employerNo}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                    endAdornment: isEditing && (
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
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <TextField
                  label="Payment Method"
                  name="paymentMethod"
                  value={formFields.paymentMethod}
                  onChange={handleChange}
                  variant="filled"
                  size="small"
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
              </FormControl>
              <FormHelperText>
                Bank name, branch EPF/ETF is paid. you may use &quot;Cash&quot;
                as well
              </FormHelperText>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl>
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
                      setFormFields(
                        (prevFields) =>
                          ({
                            ...prevFields,
                            startedAt: newDate?.format("DD-MM-YYYY"),
                          } as Company)
                      );
                    }}
                    slotProps={{
                      field: { clearable: true },
                    }}
                  />
                </LocalizationProvider>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    readOnly={!isEditing}
                    label="Ended At"
                    name="endedAt"
                    openTo="year"
                    value={
                      formFields.endedAt
                        ? dayjs(
                            ddmmyyyy_to_mmddyyyy(formFields.endedAt as string)
                          )
                        : null
                    }
                    views={["year", "month", "day"]}
                    onChange={(newDate) => {
                      setFormFields(
                        (prevFields) =>
                          ({
                            ...prevFields,
                            endedAt: newDate?.format("DD-MM-YYYY"),
                          } as Company)
                      );
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formFields.active}
                      size="large"
                      name="active"
                      color="success"
                      value={formFields.active}
                      onChange={handleChange}
                      disabled={!isEditing || isCompanyLoading}
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
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formFields?.openHours?.allDay}
                      size="large"
                      name="openHours.allDay"
                      color="success"
                      value={formFields?.openHours?.allDay}
                      onChange={handleChange}
                      disabled={!isEditing || isCompanyLoading}
                    />
                  }
                  label="Open 24h ?"
                />
              </FormControl>
            </Grid>
            {formFields?.openHours?.allDay ? null : (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <TextField
                      label="Start Time"
                      type="time"
                      variant="filled"
                      name="openHours.start"
                      value={formFields?.openHours?.start}
                      onChange={handleChange}
                      InputProps={{
                        readOnly: !isEditing || isCompanyLoading,
                      }}
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
                      value={formFields?.openHours?.end}
                      onChange={handleChange}
                      InputProps={{
                        readOnly: !isEditing || isCompanyLoading,
                      }}
                    />
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <PaymentStructure
                isEditing={isEditing}
                handleChange={handleChange}
                paymentStructure={formFields.paymentStructure}
                setPaymentStructure={(paymentStructure) => {
                  setFormFields(
                    (prev) =>
                      ({
                        ...prev,
                        paymentStructure,
                      } as Company)
                  );
                }}
              />
            </Grid>

            <div className="my-5" />

            <Grid item xs={12}>
              <WorkingDays
                isEditing={isEditing}
                workingDays={formFields.workingDays}
                setWorkingDays={(workingDays) => {
                  setFormFields(
                    (prev) =>
                      ({
                        ...prev,
                        workingDays,
                      } as Company)
                  );
                }}
              />
            </Grid>
            <div className="my-5" />

            <Grid item xs={12}>
              <Shifts
                isEditing={isEditing}
                handleChange={handleChange}
                shifts={formFields.shifts}
                setShifts={(shifts: any) => {
                  setFormFields(
                    (prev) =>
                      ({
                        ...prev,
                        shifts,
                      } as Company)
                  );
                }}
              />
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
                  InputProps={{
                    readOnly: !isEditing,
                  }}
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
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12}>
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

              <hr className="my-5" />

              <Typography variant="h5">User Info</Typography>
              <br />

              {user.role === "admin" ? (
                <Grid item xs={12}>
                  {companyUser && (
                    <>
                      <Typography>Name: {companyUser.userName}</Typography>
                      <Typography>Email: {companyUser.userEmail}</Typography>
                    </>
                  )}
                  <div className="my-5" />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h5">Change User</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box mt={2}>
                        <FormControl fullWidth>
                          {isEditing && (
                            <React.Suspense fallback={<CircularProgress />}>
                              <ChangeUser
                                isEditing={isEditing}
                                user={formFields.user}
                                setUser={(user) => {
                                  setFormFields(
                                    (prevFields) =>
                                      ({
                                        ...prevFields,
                                        user,
                                      } as Company)
                                  );
                                }}
                              />
                            </React.Suspense>
                          )}
                        </FormControl>
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <div className="my-5" />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h5">Mode</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box mt={2}>
                        <FormControl fullWidth>
                          <InputLabel id="mode-label">Mode</InputLabel>
                          <Select
                            labelId="mode-label"
                            label="Mode"
                            name="mode"
                            value={formFields.mode}
                            onChange={handleChange}
                            variant="outlined"
                            readOnly={!isEditing}
                          >
                            {modes}
                          </Select>
                        </FormControl>
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <div className="my-5" />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h5">Monthly Price</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box mt={2}>
                        <FormControl fullWidth>
                          <TextField
                            label="Monthly Price"
                            name="monthlyPrice"
                            type="number"
                            value={formFields.monthlyPrice}
                            onChange={handleChange}
                            variant="filled"
                            InputProps={{
                              readOnly:
                                !isEditing || !formFields.monthlyPriceOverride,
                            }}
                          />
                        </FormControl>
                      </Box>
                      <Box mt={2}>
                        <FormControl>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formFields.monthlyPriceOverride}
                                name="monthlyPriceOverride"
                                onChange={handleChange}
                                disabled={!isEditing}
                              />
                            }
                            label="Monthly Price Override"
                          />
                        </FormControl>
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <div className="my-5" />

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
                              InputProps={{
                                readOnly: !isEditing,
                              }}
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
                              InputProps={{
                                readOnly: !isEditing,
                              }}
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
                              InputProps={{
                                readOnly: !isEditing,
                              }}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="OT (%)"
                              name="probabilities.ot"
                              type="number"
                              value={formFields.probabilities?.ot}
                              onChange={handleChange}
                              variant="filled"
                              InputProps={{
                                readOnly: !isEditing,
                              }}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>

                  <div className="my-5" />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h5">Required Documents</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box mt={2}>
                        <FormControl>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formFields.requiredDocs?.epf || false}
                                name="requiredDocs.epf"
                                onChange={handleChange}
                                disabled={!isEditing}
                              />
                            }
                            label="EPF"
                          />
                        </FormControl>
                        <FormControl>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formFields.requiredDocs?.etf || false}
                                name="requiredDocs.etf"
                                onChange={handleChange}
                                disabled={!isEditing}
                              />
                            }
                            label="ETF"
                          />
                        </FormControl>
                        <FormControl>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={
                                  formFields.requiredDocs?.salary || false
                                }
                                name="requiredDocs.salary"
                                onChange={handleChange}
                                disabled={!isEditing}
                              />
                            }
                            label="Salary"
                          />
                        </FormControl>
                        <FormControl>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={
                                  formFields.requiredDocs?.paySlip || false
                                }
                                name="requiredDocs.paySlip"
                                onChange={handleChange}
                                disabled={!isEditing}
                              />
                            }
                            label="Pay Slip"
                          />
                        </FormControl>
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <div className="my-5" />
                </Grid>
              ) : (
                <>
                  <Typography>
                    Mode:{" "}
                    {company &&
                      modeTexts[company.mode as keyof typeof modeTexts]}
                  </Typography>
                  <Typography variant="h6" mt={3}>
                    Monthly Price: LKR{" "}
                    {company?.monthlyPrice
                      ? company?.monthlyPrice.toLocaleString()
                      : "N/A"}
                  </Typography>
                </>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={onDeleteClick}
                disabled={!isEditing || isCompanyLoading}
              >
                Delete Company
              </Button>
              <Dialog
                open={deleteDialogOpen}
                keepMounted
                onClose={handleDeleteCancelation}
                aria-describedby="alert-dialog-slide-description"
              >
                <DialogTitle>{"Delete Employee?"}</DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-slide-description">
                    Are you sure you want to delete this company
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
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyDetails;
