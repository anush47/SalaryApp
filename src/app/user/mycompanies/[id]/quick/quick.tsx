"use client";
import {
  Box,
  Button,
  FormControl,
  Grid,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Card,
  CardHeader,
  CardContent,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AutoAwesome,
  Delete,
  Done,
  Edit,
  ExpandMore,
  ShoppingBag,
  Upload,
} from "@mui/icons-material";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { LoadingButton } from "@mui/lab";
import { handleCsvUpload } from "../salaries/csvUpload";
import { SimpleDialog } from "../salaries/inOutTable";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Company } from "../../clientComponents/companiesDataGrid";
import SalariesDataGrid, { Salary } from "../salaries/salariesDataGrid";
import PaymentsDataGrid from "../payments/paymentsDataGrid";
import GeneratedSalaries from "../salaries/generatedSalaries";
import { Employee } from "../employees/clientComponents/employeesDataGrid";

const QuickTools = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string };
  companyId: string;
}) => {
  const [period, setPeriod] = useState<string>(
    dayjs().subtract(1, "month").format("YYYY-MM")
  );
  const [purchased, setPurchased] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditingInHome, setIsEditingInHome] = useState<boolean>(false);
  const [inOut, setInOut] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [generatedSalaries, setGeneratedSalaries] = useState<Salary[]>([]);
  const [autoGenProgress, setAutoGenProgress] = useState<number>(0);
  const [autoGenStatus, setAutoGenStatus] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "warning" | "error"
  >("success");

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  //fetch company & employees
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const companyData = await response.json();
        if (!companyData.companies[0]) {
          throw new Error("Company data not found in the response");
        }
        setCompany(companyData.companies[0]);
      } catch (error) {
        console.error("Error fetching company:", error);
        setSnackbarMessage("Failed to fetch company data");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setCompany(null);
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await fetch(`/api/employees?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEmployees(
          data.employees.map((employee: { _id: string }) => ({
            ...employee,
            id: employee._id,
          }))
        );
      } catch (error) {
        console.error("Error fetching employees:", error);
        setSnackbarMessage("Failed to fetch employee data");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setEmployees([]);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchCompany(), fetchEmployees()]);
      setLoading(false);
    };

    fetchData();
  }, [companyId]);

  //check purchased salaries,payments
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
        const result = await response.json();
        setPurchased(result?.purchased === "approved");
      } catch (error) {
        console.error("Error fetching purchase status:", error);
      } finally {
        setLoading(false);
      }
    };

    //clear generated salaries and payments
    checkPurchased();
    setGeneratedSalaries([]);
  }, [period]);

  const handleSalaries = async (save: boolean = false): Promise<boolean> => {
    setLoading(true);
    try {
      if (
        save &&
        generatedSalaries.length > 0 &&
        generatedSalaries[0].period === period
      ) {
        // If saving and salaries are already generated for this period, proceed to save
        await saveSalaries(generatedSalaries);
      } else {
        // Generate new salaries
        const response = await fetch(`/api/salaries/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, period, inOut }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.salaries.length === 0) {
          setSnackbarMessage(data.message || "No salaries to generate");
          setSnackbarSeverity("warning");
          throw new Error("No salaries to generate");
        } else {
          const formattedSalaries = data.salaries.map((salary: Salary) => ({
            ...salary,
            id: salary._id,
            memberNo: employees.find((e) => e.id === salary.employee)?.memberNo,
            name: employees.find((e) => e.id === salary.employee)?.name,
            nic: employees.find((e) => e.id === salary.employee)?.nic,
          }));

          if (save) {
            await saveSalaries(formattedSalaries);
          } else {
            setGeneratedSalaries(formattedSalaries);
            setSnackbarMessage(
              data.message || "Salaries generated successfully"
            );
            setSnackbarSeverity("success");
          }
        }
      }
      return true; // Return true if successful
    } catch (error) {
      console.error("Error handling salaries:", error);
      setSnackbarMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while handling salaries"
      );
      setSnackbarSeverity("error");
      return false; // Return false if an error occurs
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  const saveSalaries = async (salariesToSave: Salary[]) => {
    const response = await fetch("/api/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salaries: salariesToSave }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to save salaries");
    setSnackbarMessage(data.message || "Salaries saved successfully");
    setSnackbarSeverity("success");
    setGeneratedSalaries([]);
  };

  const handleDeleteSalaries = () => {
    setGeneratedSalaries([]);
    setSnackbarMessage("Salaries deleted successfully");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  };

  const handlePayments = async () => {
    //get reference number from api call
    const fetchReferenceNo = async () => {
      //fetch epf reference no
      try {
        const response = await fetch("/api/companies/getReferenceNoName", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employerNo: company?.employerNo,
            period: period,
          }),
        });
        const result = await response.json();
        const referenceNo = result.referenceNo;
        if (!referenceNo) {
          setSnackbarMessage("Reference number not found. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
        return referenceNo;
      } catch (error) {
        console.error("Error fetching EPF Reference No:", error);
        setSnackbarMessage(
          "Error fetching EPF Reference No. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    };
    setLoading(true);
    try {
      // Generate payments
      const generateResponse = await fetch(`/api/payments/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, period }),
      });
      const generateData = await generateResponse.json();
      if (!generateResponse.ok) {
        throw new Error(generateData.message || "Failed to generate payments");
      }

      // Prepare payment data
      const referenceNo = await fetchReferenceNo();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const payment = {
        ...generateData.payment,
        period,
        company: companyId,
        epfReferenceNo: referenceNo,
        epfPaymentMethod: company?.paymentMethod,
        etfPaymentMethod: company?.paymentMethod,
      };

      // Save payments
      const saveResponse = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment: payment }),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Failed to save payments");
      }

      setSnackbarMessage("Payments generated and saved successfully");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error handling payments:", error);
      setSnackbarMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while handling payments"
      );
      setSnackbarSeverity("error");
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  //handle generate Pdf
  const handleGetPDF = async (
    pdfType: "salary" | "epf" | "etf" | "payslip" | "all" | "print",
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | undefined
  ) => {
    //preventdefault
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const salaryIds = undefined;
      const response = await fetch("/api/pdf/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: companyId,
          period: period,
          pdfType,
          salaryIds,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        console.log(data.message);
        //if data . message and starts with payment data not found show it in snack bar
        if (data.message) {
          if (data.message.includes("data not found for")) {
            setSnackbarMessage(data.message);
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
          } else if (data.message.includes("not Purchased")) {
            setSnackbarMessage(data.message);
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
          }
        }
        throw new Error("Failed to generate PDF");
      }
      //response is a pdf
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${company?.name} ${pdfType} ${period}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbarMessage("PDF generated successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error generating pdf:", error);
      setSnackbarMessage("Error generating pdf");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
    setTimeout(() => {
      setLoading(false);
    }, 5000);
  };

  const handleGenerateAll = async () => {
    setLoading(true);
    setAutoGenProgress(0);
    setAutoGenStatus("Starting generation process...");

    const steps = [
      { name: "Generating Salaries", progress: 5 },
      { name: "Generating Payments", progress: 33 },
      { name: "Generating Documents", progress: 70 },
    ];

    try {
      for (const step of steps) {
        setAutoGenStatus(step.name);
        setAutoGenProgress(step.progress);

        switch (step.name) {
          case "Generating Salaries":
            const success = await handleSalaries(true);
            if (!success) {
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Allow UI update
              throw new Error("Failed to generate salaries");
            }
            break;
          case "Generating Payments":
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Allow UI update
            await handlePayments();
            break;
          case "Generating Documents":
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Allow UI update
            await handleGetPDF("print", undefined);
            break;
        }
      }

      setAutoGenStatus("Generation Complete!");
      setAutoGenProgress(100);
      setSnackbarMessage("All documents generated successfully");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error in GenerateAll:", error);
      setSnackbarMessage(
        error instanceof Error
          ? `Generation failed: ${error.message}`
          : "Generation failed: Unknown error"
      );
      setSnackbarSeverity("error");
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Show completion state
      setLoading(false);
      setAutoGenProgress(0);
      setAutoGenStatus("");
      setSnackbarOpen(true);
    }
  };

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
              Quick Tools
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isEditingInHome ? (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Done />}
                  disabled={loading}
                  onClick={() => setIsEditingInHome(false)}
                >
                  {loading ? <CircularProgress size={24} /> : "Done"}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  disabled={loading}
                  onClick={() => setIsEditingInHome(true)}
                >
                  {loading ? <CircularProgress size={24} /> : "Edit"}
                </Button>
              )}
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={4}>
          {/* Period Selection & Data Upload Card */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Period & Data Upload
              </Typography>
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DatePicker
                      label={"Select Period"}
                      views={["month", "year"]}
                      value={period ? dayjs(period) : dayjs()}
                      onChange={(newValue) => {
                        setPeriod(dayjs(newValue).format("YYYY-MM"));
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          variant: "outlined",
                        },
                      }}
                    />
                  </LocalizationProvider>
                </FormControl>
                {!purchased && (
                  <Link
                    href={`/user/mycompanies/${companyId}?companyPageSelect=purchases&newPurchase=true&periods=${
                      period.split("-")[1]
                    }-${period.split("-")[0]}`}
                    passHref
                  >
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ShoppingBag />}
                      fullWidth
                      size="large"
                      sx={{ borderRadius: 1 }}
                    >
                      Purchase Access
                    </Button>
                  </Link>
                )}
                <FormControl fullWidth>
                  <Button
                    variant="outlined"
                    color="primary"
                    component="label"
                    startIcon={<Upload />}
                    fullWidth
                    size="large"
                    sx={{ borderRadius: 1 }}
                  >
                    Upload In-Out CSV
                    <input
                      type="file"
                      accept=".csv"
                      hidden
                      onChange={async (event) => {
                        if (event.target.files && event.target.files[0]) {
                          const _inOut = await handleCsvUpload(
                            event.target.files[0]
                          );
                          setInOut(_inOut);
                        }
                      }}
                    />
                  </Button>
                </FormControl>
                <FormControl fullWidth>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => setOpenDialog(true)}
                    disabled={!inOut || inOut === ""}
                    fullWidth
                    size="large"
                    sx={{ borderRadius: 1 }}
                  >
                    View In-Out Data
                  </Button>
                  {inOut && (
                    <SimpleDialog
                      inOutFetched={inOut}
                      openDialog={openDialog}
                      setOpenDialog={setOpenDialog}
                    />
                  )}
                </FormControl>
              </Stack>
            </Paper>
          </Grid>

          {/* Generation & Documents Card */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Generation & Documents
              </Typography>
              <Stack spacing={3}>
                <LoadingButton
                  loading={loading}
                  loadingPosition="start"
                  variant="contained"
                  color="primary"
                  startIcon={<AutoAwesome />}
                  onClick={handleGenerateAll}
                  fullWidth
                  size="large"
                  sx={{ borderRadius: 1 }}
                >
                  Generate All Documents
                </LoadingButton>
                {autoGenProgress > 0 && (
                  <Box sx={{ width: "100%", mr: 1 }}>
                    <LinearProgress
                      sx={{ height: "0.5rem", borderRadius: 1 }}
                      value={autoGenProgress}
                      variant="determinate"
                      color="success"
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {autoGenStatus}
                    </Typography>
                  </Box>
                )}

                <Accordion
                  sx={{
                    boxShadow: "none",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls="individual-generation-content"
                    id="individual-generation-header"
                  >
                    <Typography variant="subtitle1">
                      Individual Generation Options
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {/* Salaries */}
                      <FormControl fullWidth>
                        {generatedSalaries.length > 0 ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Tooltip
                              title="Save generated salaries to the database"
                              arrow
                            >
                              <LoadingButton
                                loading={loading}
                                loadingPosition="start"
                                variant="contained"
                                color="primary"
                                onClick={() => handleSalaries(true)}
                                sx={{ flexGrow: 1, borderRadius: 1 }}
                                disabled={loading}
                                size="medium"
                              >
                                Save Salaries
                              </LoadingButton>
                            </Tooltip>
                            <Tooltip title="Delete generated salaries" arrow>
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={handleDeleteSalaries}
                                  disabled={loading}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Tooltip title="Generate salaries for the selected period">
                            <span>
                              <LoadingButton
                                loading={loading}
                                loadingPosition="start"
                                variant="outlined"
                                color="primary"
                                onClick={() => handleSalaries(false)}
                                fullWidth
                                disabled={loading}
                                size="medium"
                                sx={{ borderRadius: 1 }}
                              >
                                Generate Salaries
                              </LoadingButton>
                            </span>
                          </Tooltip>
                        )}
                      </FormControl>
                      {/* Payments */}
                      <FormControl fullWidth>
                        <LoadingButton
                          loading={loading}
                          loadingPosition="start"
                          variant="outlined"
                          color="primary"
                          onClick={handlePayments}
                          disabled={loading}
                          fullWidth
                          size="medium"
                          sx={{ borderRadius: 1 }}
                        >
                          Generate Payments
                        </LoadingButton>
                      </FormControl>
                      {/* Documents */}
                      <FormControl fullWidth>
                        <LoadingButton
                          loading={loading}
                          loadingPosition="start"
                          variant="outlined"
                          color="primary"
                          onClick={(e) => {
                            handleGetPDF("print", e);
                          }}
                          disabled={loading}
                          fullWidth
                          size="medium"
                          sx={{ borderRadius: 1 }}
                        >
                          Generate Documents
                        </LoadingButton>
                      </FormControl>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            </Paper>
          </Grid>

          <hr className="my-4" />

          {/* Data Grids Section */}
          <Grid item xs={12}>
            <Box>
              <Stack spacing={3}>
                {/* Generated Salaries */}
                {generatedSalaries.length > 0 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="generated-salaries-content"
                      id="generated-salaries-header"
                    >
                      <Typography variant="h6" component="h2">
                        {loading ? (
                          <>
                            Generated Salaries for{" "}
                            <CircularProgress
                              size={20}
                              sx={{ ml: 1, verticalAlign: "middle" }}
                            />
                          </>
                        ) : (
                          `Generated Salaries for ${period}`
                        )}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {loading ? (
                        <CircularProgress />
                      ) : (
                        <GeneratedSalaries
                          generatedSalaries={generatedSalaries}
                          setGeneratedSalaries={setGeneratedSalaries}
                          error={null}
                          loading={loading}
                          setLoading={setLoading}
                        />
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}
                {/* Salaries */}
                <Accordion defaultExpanded={generatedSalaries.length === 0}>
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls="salaries-content"
                    id="salaries-header"
                  >
                    <Typography variant="h6" component="h2">
                      {loading ? (
                        <>
                          Salaries for{" "}
                          <CircularProgress
                            size={20}
                            sx={{ ml: 1, verticalAlign: "middle" }}
                          />
                        </>
                      ) : (
                        `Salaries for ${period}`
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {loading ? (
                      <CircularProgress />
                    ) : (
                      <SalariesDataGrid
                        companyId={companyId}
                        user={user}
                        period={period}
                        isEditing={isEditingInHome}
                      />
                    )}
                  </AccordionDetails>
                </Accordion>
                {/* Payments */}
                <Accordion defaultExpanded>
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls="payments-content"
                    id="payments-header"
                  >
                    <Typography variant="h6" component="h2">
                      Payments for {period}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {loading ? (
                      <CircularProgress />
                    ) : (
                      <PaymentsDataGrid
                        companyId={companyId}
                        user={user}
                        period={period}
                        isEditing={isEditingInHome}
                      />
                    )}
                  </AccordionDetails>
                </Accordion>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
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
    </Card>
  );
};

export default QuickTools;
