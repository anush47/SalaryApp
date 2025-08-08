import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  Grid,
  Typography,
  CircularProgress,
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
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AutoAwesome,
  Delete,
  Done,
  Edit,
  ExpandMore,
  ShoppingBag,
} from "@mui/icons-material";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { LoadingButton } from "@mui/lab";
import {
  UploadInOutBtn,
  ViewUploadedInOutBtn,
  transformInOutCsv,
} from "../salaries/csvUpload";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Company } from "../../clientComponents/companiesDataGrid";
import SalariesDataGrid, { Salary } from "../salaries/salariesDataGrid";
import PaymentsDataGrid from "../payments/paymentsDataGrid";
import GeneratedSalaries from "../salaries/generatedSalaries";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

const fetchCompany = async (companyId: string) => {
  const response = await fetch(`/api/companies?companyId=${companyId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const companyData = await response.json();
  if (!companyData.companies[0]) {
    throw new Error("Company data not found in the response");
  }
  return companyData.companies[0];
};

const fetchEmployees = async (companyId: string) => {
  const response = await fetch(`/api/employees?companyId=${companyId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.employees.map((employee: { _id: string }) => ({
    ...employee,
    id: employee._id,
  }));
};

const fetchPurchased = async (companyId: string, period: string) => {
  const response = await fetch(
    `/api/purchases/check?companyId=${companyId}&month=${period}`
  );
  const result = await response.json();
  return result?.purchased === "approved";
};

const QuickTools = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const [period, setPeriod] = useState<string>(
    dayjs().subtract(1, "month").format("YYYY-MM")
  );
  const [isEditingInHome, setIsEditingInHome] = useState<boolean>(false);
  const [inOut, setInOut] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [generatedSalaries, setGeneratedSalaries] = useState<Salary[]>([]);
  const [autoGenProgress, setAutoGenProgress] = useState<number>(0);
  const [autoGenStatus, setAutoGenStatus] = useState<string>("");
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isAutoGenInProgress, setIsAutoGenInProgress] = useState(false);

  const { data: company, isLoading: companyLoading } = useQuery<Company, Error>(
    {
      queryKey: ["companies", companyId],
      queryFn: () => fetchCompany(companyId),
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    }
  );

  const { data: employees, isLoading: employeesLoading } = useQuery<
    Employee[],
    Error
  >({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const { data: purchased, isLoading: purchasedLoading } = useQuery<
    boolean,
    Error
  >({
    queryKey: ["purchases", "check", companyId, period],
    queryFn: () => fetchPurchased(companyId, period),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const handleGenerateSalariesForPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const transformedInOut = employees
        ? transformInOutCsv(inOut, employees)
        : inOut;
      const response = await fetch(`/api/salaries/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, period, inOut: transformedInOut }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }
      if (data.salaries.length === 0) {
        showSnackbar({
          message: data.message || "No salaries to generate",
          severity: "warning",
        });
      } else {
        const formattedSalaries = data.salaries.map((salary: Salary) => ({
          ...salary,
          id: salary._id,
          memberNo: employees?.find((e) => e.id === salary.employee)?.memberNo,
          name: employees?.find((e) => e.id === salary.employee)?.name,
          nic: employees?.find((e) => e.id === salary.employee)?.nic,
        }));
        setGeneratedSalaries(formattedSalaries);
        showSnackbar({
          message:
            data.message || "Salaries generated successfully for preview",
          severity: "success",
        });
      }
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while generating salaries",
        severity: "error",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const saveSalariesMutation = useMutation({
    mutationFn: async (salariesToSave: Salary[]) => {
      const response = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaries: salariesToSave }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to save salaries");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["salaries", companyId],
      });
      showSnackbar({
        message: "Salaries saved successfully",
        severity: "success",
      });
      setGeneratedSalaries([]);
    },
    onError: (error: Error) => {
      showSnackbar({
        message: error.message || "Failed to save salaries",
        severity: "error",
      });
    },
  });

  const generateAndSaveSalariesMutation = useMutation({
    mutationFn: async () => {
      const transformedInOut = employees
        ? transformInOutCsv(inOut, employees)
        : inOut;
      const response = await fetch(`/api/salaries/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, period, inOut: transformedInOut }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }
      if (data.salaries.length === 0) {
        throw new Error(data.message || "No salaries to generate");
      }
      const formattedSalaries = data.salaries.map((salary: Salary) => ({
        ...salary,
        id: salary._id,
      }));

      const saveResponse = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaries: formattedSalaries }),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Failed to save salaries");
      }
      return saveData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["salaries", companyId],
      });
      showSnackbar({
        message: "Salaries generated and saved successfully",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      showSnackbar({
        message:
          error.message ||
          "An error occurred while generating and saving salaries",
        severity: "error",
      });
    },
  });

  const generatePaymentsMutation = useMutation({
    mutationFn: async () => {
      const fetchReferenceNo = async () => {
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
            throw new Error("Reference number not found. Please try again.");
          }
          return referenceNo;
        } catch (error) {
          throw new Error("Error fetching EPF Reference No. Please try again.");
        }
      };

      const generateResponse = await fetch(`/api/payments/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, period }),
      });
      const generateData = await generateResponse.json();
      if (!generateResponse.ok) {
        throw new Error(generateData.message || "Failed to generate payments");
      }

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

      const saveResponse = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment: payment }),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Failed to save payments");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payments", companyId],
      });
      showSnackbar({
        message: "Payments generated and saved successfully",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      showSnackbar({
        message: error.message || "An error occurred while handling payments",
        severity: "error",
      });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: async (
      pdfType: "salary" | "epf" | "etf" | "payslip" | "all" | "print"
    ) => {
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
        if (data.message) {
          if (data.message.includes("data not found for")) {
            throw new Error(data.message);
          } else if (data.message.includes("not Purchased")) {
            throw new Error(data.message);
          }
        }
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${company?.name} ${pdfType} ${period}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      showSnackbar({
        message: "PDF generated successfully",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      showSnackbar({
        message: error.message || "Error generating pdf",
        severity: "error",
      });
    },
  });

  const handleGenerateAll = async () => {
    setIsAutoGenInProgress(true);
    setAutoGenProgress(0);
    setAutoGenStatus("Starting generation process...");

    const steps = [
      {
        name: "Generating Salaries",
        progress: 5,
        mutation: () => generateAndSaveSalariesMutation.mutateAsync(),
      },
      {
        name: "Generating Payments",
        progress: 33,
        mutation: () => generatePaymentsMutation.mutateAsync(),
      },
      {
        name: "Generating Documents",
        progress: 70,
        mutation: () => generatePdfMutation.mutateAsync("print"),
      },
    ];

    try {
      for (const step of steps) {
        setAutoGenStatus(step.name);
        setAutoGenProgress(step.progress);
        await step.mutation();
      }

      setAutoGenStatus("Generation Complete!");
      setAutoGenProgress(100);
      showSnackbar({
        message: "All documents generated successfully",
        severity: "success",
      });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? `Generation failed: ${error.message}`
            : "Generation failed: Unknown error",
        severity: "error",
      });
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsAutoGenInProgress(false);
      setAutoGenProgress(0);
      setAutoGenStatus("");
    }
  };

  const loading =
    companyLoading ||
    employeesLoading ||
    purchasedLoading ||
    saveSalariesMutation.isPending ||
    generatePaymentsMutation.isPending ||
    generatePdfMutation.isPending ||
    isPreviewLoading ||
    isAutoGenInProgress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        minHeight: "calc(100vh - 64px)",
        overflowY: "auto",
      }}
    >
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
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
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
                    </FormControl>

                    <FormControl fullWidth>
                      <UploadInOutBtn inOut={inOut} setInOut={setInOut} />
                    </FormControl>
                    <FormControl fullWidth>
                      <ViewUploadedInOutBtn
                        inOut={inOut}
                        openDialog={openDialog}
                        setOpenDialog={setOpenDialog}
                        companyId={companyId}
                      />
                    </FormControl>
                  </Stack>
                </Paper>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
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
                      Auto Generate
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
                          Step by Step Generation
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
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
                                    onClick={() =>
                                      saveSalariesMutation.mutate(
                                        generatedSalaries
                                      )
                                    }
                                    sx={{ flexGrow: 1, borderRadius: 1 }}
                                    disabled={loading}
                                    size="medium"
                                  >
                                    Save Salaries
                                  </LoadingButton>
                                </Tooltip>
                                <Tooltip
                                  title="Delete generated salaries"
                                  arrow
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => setGeneratedSalaries([])}
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
                                    onClick={handleGenerateSalariesForPreview}
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
                          <FormControl fullWidth>
                            <LoadingButton
                              loading={loading}
                              loadingPosition="start"
                              variant="outlined"
                              color="primary"
                              onClick={() => generatePaymentsMutation.mutate()}
                              disabled={loading}
                              fullWidth
                              size="medium"
                              sx={{ borderRadius: 1 }}
                            >
                              Generate Payments
                            </LoadingButton>
                          </FormControl>
                          <FormControl fullWidth>
                            <LoadingButton
                              loading={loading}
                              loadingPosition="start"
                              variant="outlined"
                              color="primary"
                              onClick={() => {
                                generatePdfMutation.mutate("print");
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
              </motion.div>
            </Grid>

            <hr className="my-4" />

            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Box>
                  <Stack spacing={3}>
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
                              setLoading={() => {}}
                            />
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )}
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
                    <Accordion defaultExpanded>
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        aria-controls="payments-content"
                        id="payments-header"
                      >
                        <Typography variant="h6" component="h2">
                          EPF/ETF Payments for {period}
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
              </motion.div>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickTools;
