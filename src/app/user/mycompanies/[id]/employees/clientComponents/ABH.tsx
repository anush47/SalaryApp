"use client";
import {
  Button,
  Snackbar,
  Alert,
  TextField,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  FormHelperText,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  IconButton,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { companyId } from "../../clientComponents/NavContainer";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { ArrowBack, ExpandMore, HorizontalRule } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";

const ABH: React.FC<{
  user: { id: string; name: string; email: string };
  handleBackClick: () => void;
  employeeId: string | null;
}> = ({ user, handleBackClick, employeeId }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [formDetails, setFormDetails] = useState({
    companyId: companyId,
    fullName: "",
    nameWithInitials: "",
    nic: "",
    employerNo: "",
    memberNo: "",
    startDate: "",
    designation: "",
    address: "",
    birthPlace: "",
    nationality: "",
    married: true,
    spouseName: "",
    motherName: "",
    fatherName: "",
    mobileNumber: "",
    email: "",
    employerName: "",
    employerAddress: "",
    date: "",
    nominees: {
      0: {
        name: "",
        nic: "",
        relationship: "",
        proportion: "100",
      },
      1: {
        name: "",
        nic: "",
        relationship: "",
        proportion: "",
      },
      2: {
        name: "",
        nic: "",
        relationship: "",
        proportion: "",
      },
      3: {
        name: "",
        nic: "",
        relationship: "",
        proportion: "",
      },
      4: {
        name: "",
        nic: "",
        relationship: "",
        proportion: "",
      },
    },
  });

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

  function formatName(input: string) {
    // Normalize input to uppercase and trim whitespace
    const trimmedInput = input.trim().toUpperCase();

    // Split the input into words
    const words = trimmedInput.split(/\s+/);

    // Check if initials are at the beginning or the end
    const initials = words.filter(
      (word: string) => /^[A-Z]\.?$/.test(word) || /^[A-Z]$/.test(word)
    );
    const fullNames = words.filter((word: any) => !initials.includes(word));

    if (initials.length > 0 && fullNames.length > 0) {
      // Normalize initials to have dots and reassemble
      const formattedInitials = initials
        .map((initial: string) =>
          initial.endsWith(".") ? initial : `${initial}.`
        )
        .join("");

      // Return the formatted name
      if (/^[A-Z]\.?$/.test(fullNames[0])) {
        // Case: Initials at the beginning
        return `${formattedInitials}${fullNames.join(" ")}`;
      } else {
        // Case: Full names at the beginning
        return `${formattedInitials}${fullNames.join(" ")}`;
      }
    }

    // Return input unchanged if format doesn't match expected patterns
    return input;
  }

  useEffect(() => {
    if (companyId) {
      setLoading(true);

      const fetchEmployeeData = async () => {
        try {
          let employeeData = {};
          if (employeeId) {
            const employeeResponse = await fetch(
              `/api/employees?employeeId=${employeeId}`
            );
            const employeeResult = await employeeResponse.json();
            employeeData = {
              fullName: employeeResult.employees[0].name,
              nameWithInitials: formatName(employeeResult.employees[0].name),
              nic: employeeResult.employees[0].nic,
              memberNo: employeeResult.employees[0].memberNo,
              designation: employeeResult.employees[0].designation,
              mobileNumber: employeeResult.employees[0].phoneNumber,
              email: employeeResult.employees[0].email,
              address: employeeResult.employees[0].address,
              nationality: "SRI LANKAN",
              startDate: employeeResult.employees[0].startedAt,
            };
          }

          const companyResponse = await fetch(
            `/api/companies?companyId=${companyId}`
          );
          const companyResult = await companyResponse.json();
          setFormDetails((prevDetails) => ({
            ...prevDetails,
            ...employeeData,
            employerNo: companyResult.companies[0].employerNo,
            employerName: companyResult.companies[0].employerName,
            employerAddress: companyResult.companies[0].employerAddress,
            date: dayjs().format("DD-MM-YYYY"),
          }));

          setSnackbarMessage("Data fetched successfully");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        } catch (error) {
          console.error("Error fetching data:", error);
          setSnackbarMessage("Error fetching data");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        } finally {
          setLoading(false);
        }
      };

      fetchEmployeeData();
    }
  }, [employeeId, companyId]);

  const handleGenerateABH = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/formA`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDetails),
      });
      if (!response.ok) {
        const data = await response.json();
        setSnackbarMessage(data.message || "Error generating ABH");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      //set download name
      const filename = `formA_${formDetails.nic}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      setSnackbarMessage("ABH generated successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error generating ABH:", error);
      setSnackbarMessage("Error generating ABH");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    //nominees
    if (name.startsWith("nominees")) {
      //get the index and field
      const [_, indexStr, nomineeField] = name.split(".");
      const index = parseInt(indexStr) as 0 | 1 | 2 | 3 | 4;
      setFormDetails((prevDetails) => {
        return {
          ...prevDetails,
          nominees: {
            ...prevDetails.nominees,
            [index]: {
              ...prevDetails.nominees[index],
              [nomineeField]: value,
            },
          },
        };
      });

      return;
    }
    setFormDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormDetails((prevDetails) => ({ ...prevDetails, [name]: checked }));
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant={"h5"}>
              <Tooltip title="Discard and go back" arrow>
                <IconButton
                  sx={{
                    mr: 2,
                  }}
                  onClick={handleBackClick}
                >
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              Employee Details For AH
            </Typography>
          </Box>
        }
      />
      <CardContent>
        {loading && <CircularProgress sx={{ m: 3 }} />}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Full Name"
                name="fullName"
                value={formDetails.fullName}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Name with Initials"
                name="nameWithInitials"
                value={formDetails.nameWithInitials}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="NIC"
                name="nic"
                value={formDetails.nic}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Employer Number"
                name="employerNo"
                value={formDetails.employerNo}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Member Number"
                name="memberNo"
                value={formDetails.memberNo}
                onChange={handleChange}
                type="number"
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en-gb"
              >
                <DatePicker
                  readOnly={loading}
                  label="Start Date"
                  name="startDate"
                  openTo="year"
                  value={dayjs(formDetails.startDate, "DD-MM-YYYY")}
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormDetails((prevDetails) => ({
                      ...prevDetails,
                      startDate: newDate?.format("DD-MM-YYYY") as string,
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
                label="Designation"
                name="designation"
                value={formDetails.designation}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Address"
                name="address"
                value={formDetails.address}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Birth Place"
                name="birthPlace"
                value={formDetails.birthPlace}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Nationality"
                name="nationality"
                value={formDetails.nationality}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formDetails.married}
                  name="married"
                  onChange={handleCheckboxChange}
                  disabled={loading}
                />
              }
              label="Married"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {formDetails.married && (
              <FormControl fullWidth>
                <TextField
                  label="Spouse Name"
                  name="spouseName"
                  value={formDetails.spouseName}
                  onChange={handleChange}
                  variant="filled"
                  disabled={loading || !formDetails.married}
                />
              </FormControl>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Mother's Name"
                name="motherName"
                value={formDetails.motherName}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Father's Name"
                name="fatherName"
                value={formDetails.fatherName}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Mobile Number"
                name="mobileNumber"
                value={formDetails.mobileNumber}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Email"
                name="email"
                value={formDetails.email}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Employer Name"
                name="employerName"
                value={formDetails.employerName}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Employer Address"
                name="employerAddress"
                value={formDetails.employerAddress}
                onChange={handleChange}
                variant="filled"
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en-gb"
              >
                <DatePicker
                  readOnly={loading}
                  label="Date"
                  name="date"
                  openTo="year"
                  value={dayjs(formDetails.date, "DD-MM-YYYY")}
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormDetails((prevDetails) => ({
                      ...prevDetails,
                      date: newDate?.format("DD-MM-YYYY") as string,
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
            {/* nominations */}
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="panel1-content"
                id="panel1-header"
              >
                <Typography variant="h6">Nominations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* 1 */}
                <FormControl fullWidth>
                  <hr className="my-2" />
                  <Accordion defaultExpanded>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      <Typography variant="h6">{`Nominee ${0 + 1}`}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Name"
                              name={`nominees.${0}.name`}
                              value={formDetails.nominees[0].name}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="NIC"
                              name={`nominees.${0}.nic`}
                              value={formDetails.nominees[0].nic}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Relationship"
                              name={`nominees.${0}.relationship`}
                              value={formDetails.nominees[0].relationship}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Propotion"
                              name={`nominees.${0}.proportion`}
                              value={formDetails.nominees[0].proportion}
                              onChange={handleChange}
                              type="number"
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </FormControl>
                {/* 2 */}
                <FormControl fullWidth>
                  <hr className="my-2" />
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      <Typography variant="h6">{`Nominee ${1 + 1}`}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Name"
                              name={`nominees.${1}.name`}
                              value={formDetails.nominees[1].name}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="NIC"
                              name={`nominees.${1}.nic`}
                              value={formDetails.nominees[1].nic}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Relationship"
                              name={`nominees.${1}.relationship`}
                              value={formDetails.nominees[1].relationship}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Propotion"
                              name={`nominees.${1}.proportion`}
                              value={formDetails.nominees[1].proportion}
                              onChange={handleChange}
                              type="number"
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </FormControl>
                {/* 3 */}
                <FormControl fullWidth>
                  <hr className="my-2" />
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      <Typography variant="h6">{`Nominee ${2 + 1}`}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Name"
                              name={`nominees.${2}.name`}
                              value={formDetails.nominees[2].name}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="NIC"
                              name={`nominees.${2}.nic`}
                              value={formDetails.nominees[2].nic}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Relationship"
                              name={`nominees.${2}.relationship`}
                              value={formDetails.nominees[2].relationship}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Propotion"
                              name={`nominees.${2}.proportion`}
                              value={formDetails.nominees[2].proportion}
                              onChange={handleChange}
                              type="number"
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </FormControl>
                {/* 4 */}
                <FormControl fullWidth>
                  <hr className="my-2" />
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      <Typography variant="h6">{`Nominee ${3 + 1}`}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Name"
                              name={`nominees.${3}.name`}
                              value={formDetails.nominees[3].name}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="NIC"
                              name={`nominees.${3}.nic`}
                              value={formDetails.nominees[3].nic}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Relationship"
                              name={`nominees.${3}.relationship`}
                              value={formDetails.nominees[3].relationship}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Propotion"
                              name={`nominees.${3}.proportion`}
                              value={formDetails.nominees[3].proportion}
                              onChange={handleChange}
                              type="number"
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </FormControl>
                {/* 5 */}
                <FormControl fullWidth>
                  <hr className="my-2" />
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      <Typography variant="h6">{`Nominee ${4 + 1}`}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Name"
                              name={`nominees.${4}.name`}
                              value={formDetails.nominees[4].name}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="NIC"
                              name={`nominees.${4}.nic`}
                              value={formDetails.nominees[4].nic}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Relationship"
                              name={`nominees.${4}.relationship`}
                              value={formDetails.nominees[4].relationship}
                              onChange={handleChange}
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <TextField
                              label="Propotion"
                              name={`nominees.${4}.proportion`}
                              value={formDetails.nominees[4].proportion}
                              onChange={handleChange}
                              type="number"
                              variant="filled"
                              disabled={loading}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </FormControl>
              </AccordionDetails>
            </Accordion>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              Note: This form is generated based on the data provided above.
              Make sure the data is correct before generating the form.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <LoadingButton
              variant="contained"
              color="primary"
              onClick={handleGenerateABH}
              disabled={loading}
              loading={loading}
              loadingPosition="center"
            >
              <span>Generate ABH</span>
            </LoadingButton>
          </Grid>
        </Grid>

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
      </CardContent>
    </Card>
  );
};

export default ABH;
