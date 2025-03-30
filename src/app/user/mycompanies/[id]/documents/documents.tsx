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
  InputAdornment,
  Slide,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { companyId } from "../clientComponents/companySideBar";
import Link from "next/link";
import {
  AutoAwesome,
  ExpandMore,
  ShoppingBag,
  Upload,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { LoadingButton } from "@mui/lab";
import { handleCsvUpload } from "../salaries/csvUpload";
import { SimpleDialog } from "../salaries/inOutTable";
import SalariesIncludeDataGrid from "./salariesIncludeDataGrid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import PaymentsDataGrid from "../payments/paymentsDataGrid";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { Company } from "../../clientComponents/companiesDataGrid";

const Documents = ({
  user,
}: {
  user: { name: string; email: string; id: string };
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
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "warning" | "error"
  >("success");

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
          setSnackbarMessage("Error parsing company data");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        setSnackbarMessage("Error fetching company");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };

    getCompany();
  }, [companyId]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

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
          setSnackbarMessage("Select at least one salary");
          setSnackbarSeverity("warning");
          setSnackbarOpen(true);
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
    if (customSalaries) {
    }
    setTimeout(() => {
      setLoading(false);
    }, 5000);
  };

  return (
    <>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        <CardHeader
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Typography variant="h4">Documents</Typography>
            </div>
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
                    {company?.name} - {company?.employerNo}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
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
                    />
                    {!purchased && (
                      <Link
                        href={`/user/mycompanies/${companyId}?companyPageSelect=purchases&newPurchase=true&periods=${
                          period?.split("-")[1] || ""
                        }-${period ? period.split("-")[0] : ""}`}
                      >
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ShoppingBag />}
                        >
                          Purchase
                        </Button>
                      </Link>
                    )}
                  </LocalizationProvider>
                </Box>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                {/* custom salaries switch */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={customSalaries}
                      onChange={(event) =>
                        setCustomSalaries(event.target.checked)
                      }
                    />
                  }
                  label="For Selected Salaries"
                />
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                >
                  <Typography variant="h6">More Generate Options</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {[
                      { label: "Salary", type: "salary" as const },
                      { label: "EPF", type: "epf" as const },
                      { label: "ETF", type: "etf" as const },
                      { label: "Payslips", type: "payslip" as const },
                      { label: "Attendance", type: "attendance" as const },
                      { label: "All", type: "all" as const },
                    ].map((item) => (
                      <Grid item xs={6} sm={2} key={item.type}>
                        <FormControl fullWidth>
                          <LoadingButton
                            loading={loading}
                            loadingPosition="start"
                            variant="outlined"
                            color="success"
                            onClick={(e) => handleGetPDF(item.type, e)}
                          >
                            <span>{item.label}</span>
                          </LoadingButton>
                        </FormControl>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth>
                <LoadingButton
                  loading={loading}
                  loadingPosition="start"
                  color="success"
                  variant="contained"
                  onClick={(e) => handleGetPDF("print", e)}
                >
                  <span>Generate Print</span>
                </LoadingButton>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
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
            </Grid>
            <Grid item xs={12}>
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        //TransitionComponent={(props) => <Slide {...props} direction="up" />}
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

export default Documents;
