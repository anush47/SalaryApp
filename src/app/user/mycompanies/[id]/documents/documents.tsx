"use client";
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
  FormControl,
  FormControlLabel,
  Grid,
  // Snackbar, // Removed
  Switch,
  Typography,
  Paper,
  Stack,
  Tooltip,
  FormLabel,
  RadioGroup,
  Radio,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExpandMore, ShoppingBag } from "@mui/icons-material";
import dayjs from "dayjs";
import { LoadingButton } from "@mui/lab";
import SalariesIncludeDataGrid from "./salariesIncludeDataGrid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import PaymentsDataGrid from "../payments/paymentsDataGrid";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { Company } from "../../clientComponents/companiesDataGrid";
import { useSnackbar } from "@/app/contexts/SnackbarContext";

const Documents = ({
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
  const [company, setCompany] = useState<Company>();
  const [loading, setLoading] = useState<boolean>(false);
  const [customSalaries, setCustomSalaries] = useState<boolean>(false);
  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);
  const { showSnackbar } = useSnackbar();

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

  useEffect(() => {
    const getCompany = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/companies?companyId=${companyId}`, {
          method: "GET",
        });
        try {
          const result = await response.json();
          setCompany(result.companies[0]);
        } catch (error) {
          console.error("Error parsing JSON or updating state:", error);
          setCompany(undefined); // or handle the error state as needed
          showSnackbar({
            message: "Error parsing company data",
            severity: "error",
          });
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        showSnackbar({ message: "Error fetching company", severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    getCompany();
  }, [companyId]);

  //handle pdf generation
  const handleGetPDF = async (
    pdfType:
      | "salary"
      | "epf"
      | "etf"
      | "payslip"
      | "attendance"
      | "all"
      | "print",
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    //preventdefault
    e.preventDefault();
    setLoading(true);
    try {
      let salaryIds;
      if (customSalaries) {
        if (rowSelectionModel.length === 0) {
          //show snackbar error saying select at least one salary
          showSnackbar({
            message: "Select at least one salary",
            severity: "warning",
          });
          return;
        }
        salaryIds = rowSelectionModel;
      } else {
        salaryIds = undefined;
      }
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
            showSnackbar({ message: data.message, severity: "error" });
            return;
          } else if (data.message.includes("not Purchased")) {
            showSnackbar({ message: data.message, severity: "error" });
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
      showSnackbar({
        message: "PDF generated successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error generating pdf:", error);
      showSnackbar({ message: "Error generating pdf", severity: "error" });
    } finally {
      setLoading(false);
    }
    if (customSalaries) {
    }
    setTimeout(() => {
      setLoading(false);
    }, 5000);
  };

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
                Documents
              </Typography>
            </Box>
          }
        />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          <Grid container spacing={4}>
            {/* Company Info Card */}
            <Grid item xs={12}>
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
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: "bold", color: "primary.main" }}
                      >
                        {company?.name} - {company?.employerNo}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </motion.div>
            </Grid>

            {/* Period Selection & Options Card */}
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
                  <Stack spacing={3}>
                    <FormControl fullWidth>
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
                      </Box>
                    </FormControl>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">
                        Generate Documents for:
                      </FormLabel>
                      <RadioGroup
                        row
                        aria-label="salary-selection"
                        name="salary-selection"
                        value={customSalaries ? "selected" : "all"}
                        onChange={(event) => {
                          setCustomSalaries(event.target.value === "selected");
                        }}
                      >
                        <FormControlLabel
                          value="all"
                          control={<Radio />}
                          label="All Salaries"
                        />
                        <FormControlLabel
                          value="selected"
                          control={<Radio />}
                          label="Selected Salaries"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Stack>
                </Paper>
              </motion.div>
            </Grid>

            {/* Generate Options Card */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
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
                  <Stack spacing={3}>
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        aria-controls="panel1-content"
                        id="panel1-header"
                      >
                        <Typography variant="h6">
                          Individual Generate Options
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={3}>
                          {[
                            { label: "Salary", type: "salary" as const },
                            { label: "EPF", type: "epf" as const },
                            { label: "ETF", type: "etf" as const },
                            { label: "Payslips", type: "payslip" as const },
                            {
                              label: "Attendance",
                              type: "attendance" as const,
                            },
                            { label: "All", type: "all" as const },
                          ].map((item) => (
                            <Grid item xs={12} sm={6} md={4} key={item.type}>
                              <FormControl fullWidth>
                                <Tooltip
                                  title={`Generate ${item.label} PDF`}
                                  arrow
                                >
                                  <Button
                                    disabled={loading}
                                    variant="outlined"
                                    onClick={(e) => handleGetPDF(item.type, e)}
                                    fullWidth
                                  >
                                    {item.label}
                                  </Button>
                                </Tooltip>
                              </FormControl>
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                    <FormControl fullWidth>
                      <Tooltip title="Generate All Documents as Print" arrow>
                        <LoadingButton
                          loading={loading}
                          loadingPosition="start"
                          variant="contained"
                          onClick={(e) => handleGetPDF("print", e)}
                          fullWidth
                        >
                          <span>Generate All Documents</span>
                        </LoadingButton>
                      </Tooltip>
                    </FormControl>
                  </Stack>
                </Paper>
              </motion.div>
            </Grid>

            {/* Data Grids */}
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {period && (
                  <Accordion defaultExpanded>
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
                          <SalariesIncludeDataGrid
                            companyId={companyId}
                            key={period}
                            user={user}
                            period={period}
                            isEditing={customSalaries}
                            rowSelectionModel={rowSelectionModel}
                            setRowSelectionModel={setRowSelectionModel}
                          />
                        </FormControl>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </motion.div>
            </Grid>
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {period && (
                  <Accordion defaultExpanded>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      {loading ? (
                        <Typography variant="h6">
                          {`Payment Details loading...`}
                        </Typography>
                      ) : (
                        <Typography variant="h6">
                          {`Payment Details of ${period}`}
                        </Typography>
                      )}
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <PaymentsDataGrid
                            companyId={companyId}
                            key={period}
                            user={user}
                            period={period}
                            isEditing={customSalaries}
                          />
                        </FormControl>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </motion.div>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {/* Snackbar component removed, global one will be used */}
    </motion.div>
  );
};

export default Documents;
