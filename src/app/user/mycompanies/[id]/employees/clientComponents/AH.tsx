"use client";
import {
  Button,
  // Snackbar, // Removed
  // Alert, // Removed
  TextField,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControl,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { ArrowBack, ExpandMore, HorizontalRule } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "@/app/contexts/SnackbarContext";

const AH: React.FC<{
  user: { id: string; name: string; email: string };
  handleBackClick: () => void;
  companyId: string;
  employeeId: string | null;
}> = ({ user, handleBackClick, employeeId, companyId }) => {
  const [formDetails, setFormDetails] = useState({
    companyId: companyId,
    fullName: "",
    nameWithInitials: "",
    nic: "",
    employerNo: "",
    memberNo: "",
    startDate: null as dayjs.Dayjs | null, // Changed to null for DatePicker
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

  const fetchEmployeeAndCompanyData = async () => {
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
        startDate: employeeResult.employees[0].startedAt
          ? dayjs(employeeResult.employees[0].startedAt, "DD-MM-YYYY")
          : null,
      };
    }

    const companyResponse = await fetch(
      `/api/companies?companyId=${companyId}`
    );
    const companyResult = await companyResponse.json();
    return {
      ...employeeData,
      employerNo: companyResult.companies[0].employerNo,
      employerName: companyResult.companies[0].employerName,
      employerAddress: companyResult.companies[0].employerAddress,
      date: dayjs().format("DD-MM-YYYY"),
    };
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["employees", companyId, employeeId, "AH"],
    queryFn: fetchEmployeeAndCompanyData,
    enabled: !!companyId, // Only run query if companyId is available
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (data) {
      setFormDetails((prevDetails) => ({
        ...prevDetails,
        ...data,
      }));
    }
  }, [data]);

  const { showSnackbar } = useSnackbar();

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
    if (data) {
      setFormDetails((prevDetails) => ({
        ...prevDetails,
        ...data,
      }));
    }
  }, [data]);

  const handleGenerateAH = async () => {
    try {
      const formattedFormDetails = {
        ...formDetails,
        startDate: formDetails.startDate
          ? dayjs(formDetails.startDate).format("DD-MM-YYYY")
          : "",
      };
      const response = await fetch(`/api/employees/formA`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedFormDetails),
      });
      if (!response.ok) {
        const data = await response.json();
        showSnackbar({
          message: data.message || "Error generating AH",
          severity: "error",
        });
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
      showSnackbar({
        message: "AH generated successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error generating AH:", error);
      showSnackbar({ message: "Error generating AH", severity: "error" });
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
        {isLoading && <CircularProgress sx={{ m: 3 }} />}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <TextField
                label="Full Name"
                name="fullName"
                value={formDetails.fullName}
                onChange={handleChange}
                variant="filled"
                disabled={isLoading}
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
                helperText="Only add . after initials (no spaces)"
                variant="filled"
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                  readOnly={isLoading}
                  label="Start Date"
                  name="startDate"
                  openTo="year"
                  value={formDetails.startDate}
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormDetails((prevDetails) => ({
                      ...prevDetails,
                      startDate: newDate || null,
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                  disabled={isLoading}
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
                  helperText="Only add . after initials (no spaces)"
                  variant="filled"
                  disabled={isLoading || !formDetails.married}
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
                helperText="Only add . after initials (no spaces)"
                onChange={handleChange}
                variant="filled"
                disabled={isLoading}
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
                helperText="Only add . after initials (no spaces)"
                variant="filled"
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                  readOnly={isLoading}
                  label="Date"
                  name="date"
                  openTo="year"
                  value={formDetails.startDate}
                  views={["year", "month", "day"]}
                  onChange={(newDate) => {
                    setFormDetails((prevDetails) => ({
                      ...prevDetails,
                      startDate: newDate || null,
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
                              helperText="Add spaces after . in initials"
                              onChange={handleChange}
                              variant="filled"
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
                              InputProps={{
                                endAdornment: <>{"%"}</>,
                              }}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
                              disabled={isLoading}
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
              onClick={handleGenerateAH}
              disabled={isLoading}
              loading={isLoading}
              loadingPosition="center"
            >
              <span>Generate AH</span>
            </LoadingButton>
          </Grid>
        </Grid>

        {/* Snackbar component removed, global one will be used */}
      </CardContent>
    </Card>
  );
};

export default AH;
