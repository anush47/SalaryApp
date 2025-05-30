import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Slide,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  ArrowBack,
  Edit,
  ExpandMore,
  Refresh,
  Save,
  Search,
  Sync,
} from "@mui/icons-material";
import { paymentId } from "./payments";
import { LoadingButton } from "@mui/lab";
import { Payment } from "./paymentsDataGrid";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import SalariesDataGrid from "../salaries/salariesDataGrid";
import "dayjs/locale/en-gb";

const EditPaymentForm: React.FC<{
  user: { id: string; name: string; email: string };
  handleBackClick: () => void;
  companyId: string;
}> = ({ user, handleBackClick, companyId }) => {
  const [loading, setLoading] = useState(false);
  const [ReferenceLoading, setReferenceLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning" | "info"
  >("success");
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [formFields, setFormFields] = useState<Payment>({
    _id: "",
    id: "",
    company: "",
    period: "",
    companyName: "",
    companyEmployerNo: "",
    companyPaymentMethod: "",
    epfReferenceNo: "",
    epfAmount: 0,
    epfSurcharges: 0,
    epfPaymentMethod: "",
    epfChequeNo: "",
    epfPayDay: "",
    etfAmount: 0,
    etfSurcharges: 0,
    etfPaymentMethod: "",
    etfChequeNo: "",
    etfPayDay: "",
    remark: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch salary
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/payments/?paymentId=${paymentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch Payment");
        }
        const data = await response.json();
        //if not payment
        if (!data.payments || data.payments.length === 0) {
          throw new Error("Invalid Payment Data");
        }
        const paymentData = data.payments[0];
        // Set all nulls to empty string
        Object.keys(paymentData).forEach((key) => {
          if (paymentData[key] === null) {
            paymentData[key] = "";
          }
        });
        setFormFields(paymentData);
      } catch (error) {
        setSnackbarMessage(
          error instanceof Error ? error.message : "Error fetching Payment."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };

    if (companyId?.length === 24) {
      fetchPayment();
    } else {
      setSnackbarMessage("Invalid Payment ID");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [paymentId]);

  //gen salary
  const generatePaymentUpdate = async () => {
    try {
      setLoading(true);
      //post with period body
      const response = await fetch("/api/payments/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: companyId,
          period: formFields.period,
          regenerate: true,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }
      const data = await response.json();
      const paymentNew = data.payment;
      if (!paymentNew) {
        setSnackbarMessage("Payment not found. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      setFormFields({
        ...formFields,
        epfAmount: paymentNew.epfAmount,
        etfAmount: paymentNew.etfAmount,
      });
      await fetchReferenceNo();
    } catch (error) {
      setSnackbarMessage(
        error instanceof Error ? error.message : "Error fetching payments."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
  };

  const onSaveClick = async () => {
    //const newErrors = SalaryValidation(formFields);
    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      return;
    }

    console.log(formFields);

    setLoading(true);
    try {
      // Perform POST request to add a new payment record
      const response = await fetch("/api/payments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: { ...formFields },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbarMessage("Payment saved successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsEditing(false);

        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Clear the form after successful save
        // setFormFields({
        // });
        setErrors({});
      } else {
        // Handle validation or other errors returned by the API
        setSnackbarMessage(
          result.message || "Error saving payment. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error saving payment:", error);

      setSnackbarMessage("Error saving payment. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const [dialogOpenDelete, setDialogOpenDelete] = useState(false);
  const handleDeleteClick = () => {
    setDialogOpenDelete(true);
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      // Perform the delete action here
      console.log(`Deleting payment record for ${formFields.period}`);
      await onDeleteClick();
    }
    setDialogOpenDelete(false);
  };

  interface ConfirmationDialogProps {
    open: boolean;
    onClose: (confirmed: boolean) => void;
    title: string;
    message: string;
  }

  const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onClose,
    title,
    message,
  }) => {
    const handleConfirm = () => {
      onClose(true);
    };

    const handleCancel = () => {
      onClose(false);
    };

    return (
      <Dialog open={open} onClose={() => onClose(false)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="primary">
            Cancel
          </Button>
          <LoadingButton
            onClick={handleConfirm}
            color="primary"
            autoFocus
            loading={loading}
          >
            Confirm
          </LoadingButton>
        </DialogActions>
      </Dialog>
    );
  };

  const onDeleteClick = async () => {
    setLoading(true);
    try {
      // Perform DELETE request to delete the salary record
      const response = await fetch(`/api/payments/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIds: [formFields._id],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbarMessage("Payment deleted successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Clear the form after successful save
        // setFormFields({
        // });
        setErrors({});
        window.history.back();
      } else {
        // Handle validation or other errors returned by the API
        setSnackbarMessage(
          result.message || "Error deleting payment. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error deleting payment:", error);

      setSnackbarMessage("Error deleting payment. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceNo = async () => {
    //wait 1 seconds
    setReferenceLoading(true);
    //fetch epf reference no
    try {
      const response = await fetch("/api/companies/getReferenceNoName", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employerNo: formFields.companyEmployerNo,
          period: formFields.period,
        }),
      });
      const result = await response.json();

      // Simulate fetching company name
      //const name = await fetchCompanyName(formFields.employerNo);
      const referenceNo = result.referenceNo;
      if (!referenceNo) {
        setSnackbarMessage("Reference number not found. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      //show in snackbar
      setSnackbarMessage(` Found EPF Reference No: ${referenceNo}`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setFormFields((prevFields) => ({
        ...prevFields,
        epfReferenceNo: referenceNo,
      }));
    } catch (error) {
      console.error("Error fetching EPF Reference No:", error);
      setSnackbarMessage("Error fetching EPF Reference No. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setReferenceLoading(false);
    }
  };

  return (
    <>
      <Card
        sx={{
          minHeight: "91vh",
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title="Discard and go back to my companies" arrow>
                  <IconButton onClick={handleBackClick}>
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
                <Typography variant="h4" component="h1">
                  Payment Details
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

        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                  >
                    Company: {formFields?.companyName} -{" "}
                    {formFields?.companyEmployerNo}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Period: {formFields?.period}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.period}>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    label={"Period"}
                    views={["month", "year"]}
                    value={formFields.period ? dayjs(formFields.period) : null}
                    readOnly
                  />
                </LocalizationProvider>
                {errors.period && (
                  <FormHelperText>{errors.period}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <TextField
                  label="Company Payment Method"
                  name="companyPaymentMethod"
                  value={formFields.companyPaymentMethod || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <FormHelperText>
                  The company&apos;s default payment method
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                >
                  {loading ? (
                    <Typography variant="h6">
                      {`Salary Details loading...`}
                    </Typography>
                  ) : (
                    <Typography variant="h6">
                      {`Salary Details of ${formFields.period}`}
                    </Typography>
                  )}
                </AccordionSummary>
                <AccordionDetails>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      {formFields.period && (
                        <SalariesDataGrid
                          companyId={companyId}
                          user={user}
                          isEditing={false}
                          period={formFields.period}
                        />
                      )}
                    </FormControl>
                  </Grid>
                </AccordionDetails>
              </Accordion>
              <Button
                sx={{
                  mt: 2,
                }}
                variant="contained"
                color="success"
                onClick={generatePaymentUpdate}
                disabled={loading || !isEditing}
                endIcon={loading ? <CircularProgress size={20} /> : <Sync />}
              >
                Re-calculate
              </Button>
            </Grid>
            <Grid item xs={12}>
              <hr className="mb-3" />
              <Typography variant="h6">EPF Details</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.epfAmount}>
                <TextField
                  label="EPF Amount"
                  name="epfAmount"
                  type="number"
                  value={formFields.epfAmount || 0}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {errors.epfAmount && (
                  <FormHelperText>{errors.epfAmount}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.epfReferenceNo}>
                <TextField
                  label="EPF Reference No"
                  name="epfReferenceNo"
                  value={formFields.epfReferenceNo || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Get EPF Reference No."
                          onClick={fetchReferenceNo}
                          disabled={!isEditing}
                        >
                          {ReferenceLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Search />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {errors.epfReferenceNo && (
                  <FormHelperText>{errors.epfReferenceNo}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.epfPaymentMethod}>
                <TextField
                  label="EPF Payment Method"
                  name="epfPaymentMethod"
                  value={formFields.epfPaymentMethod || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                    endAdornment: isEditing && (
                      //set company default
                      <InputAdornment position="end">
                        <Tooltip title="Set Company Default" arrow>
                          <IconButton
                            aria-label="Set Company Default"
                            onClick={() => {
                              setFormFields((prevFields) => ({
                                ...prevFields,
                                epfPaymentMethod:
                                  formFields.companyPaymentMethod,
                              }));
                            }}
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                {errors.epfPaymentMethod && (
                  <FormHelperText>{errors.epfPaymentMethod}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.epfChequeNo}>
                <TextField
                  label="EPF Cheque No."
                  name="epfChequeNo"
                  value={formFields.epfChequeNo || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
                {errors.epfChequeNo && (
                  <FormHelperText>{errors.epfChequeNo}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.epfSurcharges}>
                <TextField
                  label="EPF Surcharges"
                  name="epfSurcharges"
                  type="number"
                  value={formFields.epfSurcharges || 0}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
                {errors.epfSurcharges && (
                  <FormHelperText>{errors.epfSurcharges}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.epfPayDay}>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    readOnly={!isEditing}
                    label="EPF Paid Day"
                    name="epfPayDay"
                    openTo="day"
                    value={
                      formFields.epfPayDay
                        ? dayjs(formFields.epfPayDay as string)
                        : null
                    }
                    views={["year", "month", "day"]}
                    onChange={(newDate) => {
                      setFormFields((prevFields) => ({
                        ...prevFields,
                        epfPayDay:
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
            <Grid item xs={12}>
              <hr className="mb-3" />
              <Typography variant="h6">ETF Details</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.etfAmount}>
                <TextField
                  label="ETF Amount"
                  name="etfAmount"
                  type="number"
                  value={formFields.etfAmount || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {errors.etfAmount && (
                  <FormHelperText>{errors.etfAmount}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.etfPaymentMethod}>
                <TextField
                  label="ETF Payment Method"
                  name="etfPaymentMethod"
                  value={formFields.etfPaymentMethod || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                    endAdornment: isEditing && (
                      //set company default
                      <InputAdornment position="end">
                        <Tooltip title="Set Company Default" arrow>
                          <IconButton
                            aria-label="Set Company Default"
                            onClick={() => {
                              setFormFields((prevFields) => ({
                                ...prevFields,
                                etfPaymentMethod:
                                  formFields.companyPaymentMethod,
                              }));
                            }}
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                {errors.etfPaymentMethod && (
                  <FormHelperText>{errors.etfPaymentMethod}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.etfChequeNo}>
                <TextField
                  label="ETF Cheque No."
                  name="etfChequeNo"
                  value={formFields.etfChequeNo || ""}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
                {errors.etfChequeNo && (
                  <FormHelperText>{errors.etfChequeNo}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.etfSurcharges}>
                <TextField
                  label="ETF Surcharges"
                  name="etfSurcharges"
                  type="number"
                  value={formFields.etfSurcharges || 0}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: !isEditing,
                  }}
                />
                {errors.etfSurcharges && (
                  <FormHelperText>{errors.etfSurcharges}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.etfPayDay}>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    readOnly={!isEditing}
                    label="ETF Paid Day"
                    name="etfPayDay"
                    openTo="day"
                    value={
                      formFields.etfPayDay
                        ? dayjs(formFields.etfPayDay as string)
                        : null
                    }
                    views={["year", "month", "day"]}
                    onChange={(newDate) => {
                      setFormFields((prevFields) => ({
                        ...prevFields,
                        etfPayDay:
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
            <Grid item xs={12}>
              <hr className="mb-3" />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.remark}>
                <TextField
                  label="Remark"
                  name="remark"
                  value={formFields.remark}
                  onChange={handleChange}
                  variant="filled"
                  multiline
                  InputProps={{
                    readOnly: loading,
                  }}
                />
                {errors.remark && (
                  <FormHelperText>{errors.remark}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
          <Grid item xs={12} sm={6}>
            <hr className="my-3" />
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleDeleteClick()}
                disabled={loading || !isEditing}
              >
                Delete
              </Button>
            </Box>
          </Grid>
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={dialogOpenDelete}
        onClose={handleDialogClose}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the payment for ${formFields.period}?`}
      />
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

export default EditPaymentForm;
