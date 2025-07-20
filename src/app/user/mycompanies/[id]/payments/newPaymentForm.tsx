import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  // Alert, // Removed if only for snackbar
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Slide, // Keep if used for other transitions
  // Snackbar, // Removed
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  ArrowBack,
  ExpandMore,
  Refresh,
  Save,
  Search,
  ShoppingBag,
  Sync,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import Link from "next/link";
import SalariesDataGrid from "../salaries/salariesDataGrid";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar
import { useQueryClient } from "@tanstack/react-query";

const NewPaymentForm = ({
  handleBackClick,
  user,
  companyId,
}: {
  handleBackClick: () => void;
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
}) => {
  const [company, setCompany] = useState<any>();
  const [purchased, setPurchased] = useState<boolean>(true);
  const [period, setPeriod] = useState<string>(
    dayjs().subtract(1, "month").format("YYYY-MM")
  );
  const [loading, setLoading] = useState(false);
  const [ReferenceLoading, setReferenceLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [formFields, setFormFields] = useState<{
    _id: string;
    company: string;
    period: string;
    epfAmount: number;
    epfSurcharges: number;
    epfPaymentMethod: string;
    epfChequeNo: string;
    epfPayDay: string;
    epfReferenceNo: string;
    etfAmount: number;
    etfSurcharges: number;
    etfPaymentMethod: string;
    etfChequeNo: string;
    etfPayDay: string;
    remark: string;
  }>({
    _id: "",
    company: "",
    period: "",
    epfAmount: 0,
    epfSurcharges: 0,
    epfPaymentMethod: "",
    epfChequeNo: "",
    epfPayDay: "",
    epfReferenceNo: "",
    etfAmount: 0,
    etfSurcharges: 0,
    etfPaymentMethod: "",
    etfChequeNo: "",
    etfPayDay: "",
    remark: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch company
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/companies?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch Company");
        }
        const data = await response.json();
        setCompany(data.companies[0]);
        setFormFields({
          ...formFields,
          epfPaymentMethod: data.companies[0].paymentMethod,
          etfPaymentMethod: data.companies[0].paymentMethod,
        });
      } catch (error) {
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
    } else {
      showSnackbar({ message: "Invalid Company ID", severity: "error" });
    }
  }, [companyId]); // Added formFields, showSnackbar to dependencies

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

  // generate payment function
  const generatePayment = async () => {
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
          period: period,
          update: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error("Failed to generate payment :" + data.message);
      }
      const paymentNew = data.payment;
      if (!paymentNew) {
        showSnackbar({
          message: "Payment generation failed. Please try again.",
          severity: "error",
        });
        return;
      }

      setFormFields({
        ...formFields,
        epfAmount: paymentNew.epfAmount,
        etfAmount: paymentNew.etfAmount,
      });
      showSnackbar({
        message: "Payment calculated successfully!",
        severity: "success",
      });
      //wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay
      await fetchReferenceNo();
    } catch (error) {
      console.error("Error fetching payments:", error);
      showSnackbar({
        message:
          error instanceof Error ? error.message : "Error fetching payments.",
        severity: "error",
      });
    } finally {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
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
          employerNo: company.employerNo,
          period: period,
        }),
      });
      const result = await response.json();

      // Simulate fetching company name
      //const name = await fetchCompanyName(formFields.employerNo);
      const referenceNo = result.referenceNo;
      if (!referenceNo) {
        // setSnackbarMessage("Reference number not found. Please try again."); // Removed
        // setSnackbarSeverity("error"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({
          message: "Reference number not found. Please try again.",
          severity: "error",
        });
        return;
      }
      //show in snackbar
      // setSnackbarMessage(` Found EPF Reference No: ${referenceNo}`); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: `Found EPF Reference No: ${referenceNo}`,
        severity: "success",
      });
      setFormFields((prevFields) => ({
        ...prevFields,
        epfReferenceNo: referenceNo,
      }));
    } catch (error) {
      console.error("Error fetching EPF Reference No:", error);
      // setSnackbarMessage("Error fetching EPF Reference No. Please try again."); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Error fetching EPF Reference No. Please try again.",
        severity: "error",
      });
    } finally {
      setReferenceLoading(false);
    }
  };

  const onSaveClick = async () => {
    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      // Perform POST request to add a new payment record
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: {
            ...formFields, // The form data becomes the first element of the array
            company: companyId,
            period: period,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar({
          message: "Payment record saved successfully!",
          severity: "success",
        });

        const queryKey = [
          "payments",
          ...(user.role === "admin" ? [companyId] : []),
        ];
        queryClient.invalidateQueries({ queryKey });
        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay

        // Clear the form after successful save
        setErrors({});
      } else {
        showSnackbar({
          message: result.message || "Error saving payment. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      showSnackbar({
        message: "Error saving payment. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
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
                  New EPF/ETF Payment
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
                    {loading ? <CircularProgress size={24} /> : "Save"}
                  </Button>
                </Tooltip>
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
                    Company: {company?.name}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Employer No: {company?.employerNo}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.period}>
                <Box
                  display={purchased ? "grid" : "flex"}
                  alignItems="center"
                  gap={2}
                >
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
                  {errors.period && (
                    <FormHelperText>{errors.period}</FormHelperText>
                  )}
                </Box>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <TextField
                  label="Company Payment Method"
                  name="companyPaymentMethod"
                  value={company?.paymentMethod || ""}
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
                      {`Salary Details of ${period}`}
                    </Typography>
                  )}
                </AccordionSummary>
                <AccordionDetails>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      {period && (
                        <SalariesDataGrid
                          companyId={companyId}
                          key={period} // Adding key to force re-render when period changes
                          user={user}
                          isEditing={false}
                          period={period}
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
                onClick={generatePayment}
                disabled={loading}
                endIcon={loading ? <CircularProgress size={20} /> : <Sync />}
              >
                Calculate
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
                  //readonly
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
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Get EPF Reference No."
                          onClick={fetchReferenceNo}
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
                  value={formFields.epfPaymentMethod}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    endAdornment: (
                      //set company default
                      <InputAdornment position="end">
                        <Tooltip title="Set Company Default" arrow>
                          <IconButton
                            aria-label="Set Company Default"
                            onClick={() => {
                              setFormFields((prevFields) => ({
                                ...prevFields,
                                epfPaymentMethod: company?.paymentMethod || "",
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
                    endAdornment: (
                      //set company default
                      <InputAdornment position="end">
                        <Tooltip title="Set Company Default" arrow>
                          <IconButton
                            aria-label="Set Company Default"
                            onClick={() => {
                              setFormFields((prevFields) => ({
                                ...prevFields,
                                etfPaymentMethod: company.paymentMethod,
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
                  value={formFields.etfSurcharges || 0}
                  type="number"
                  onChange={handleChange}
                  variant="filled"
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
        </CardContent>
      </Card>
      {/* Snackbar component removed, global one will be used */}
    </>
  );
};

export default NewPaymentForm;
