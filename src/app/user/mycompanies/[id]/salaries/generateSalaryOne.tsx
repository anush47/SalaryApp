import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  Slide,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import { companyId } from "../clientComponents/NavContainer";
import { Salary } from "./salariesDataGrid";
import { Autorenew, CheckCircle, Save, Upload } from "@mui/icons-material";
import { PaymentStructure } from "../companyDetails/paymentStructure";
import { handleCsvUpload } from "./csvUpload";
import { LoadingButton } from "@mui/lab";
import { InOutTable } from "./inOutTable";

const GenerateSalaryOne = ({
  period,
  employeeId,
}: {
  period: string;
  employeeId: string;
}) => {
  const [employee, setEmployee] = useState<Employee>();
  const [loading, setLoading] = useState(false);
  const [inOut, setInOut] = useState("");
  const [generated, setGenerated] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning" | "info"
  >("success");

  const [formFields, setFormFields] = useState<Salary>({
    id: "",
    _id: "",
    employee: "",
    period: "",
    basic: 0,
    holidayPay: 0,
    inOut: [],
    noPay: {
      amount: 0,
      reason: "",
    },
    ot: {
      amount: 0,
      reason: "",
    },
    paymentStructure: {
      additions: [],
      deductions: [],
    },
    advanceAmount: 0,
    finalSalary: 0,
    remark: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const theme = useTheme();

  // Fetch employee
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees?employeeId=${employeeId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch Employee");
        }
        const data = await response.json();
        setEmployee(data.employees[0]);
        // Set working days if undefined
        if (!data.employees[0].workingDays) {
          data.employees[0].workingDays = {
            mon: "off",
            tue: "off",
            wed: "off",
            thu: "off",
            fri: "off",
            sat: "off",
            sun: "off",
          };
        }
        setGenerated(false);
      } catch (error) {
        setSnackbarMessage(
          error instanceof Error ? error.message : "Error fetching company."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };

    if (companyId?.length === 24) {
      fetchEmployee();
    } else {
      setSnackbarMessage("Invalid Company ID");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [employeeId]);

  //when period or employee changed
  useEffect(() => {
    setFormFields({
      id: "",
      _id: "",
      employee: "",
      period,
      basic: 0,
      holidayPay: 0,
      inOut: [],
      noPay: {
        amount: 0,
        reason: "",
      },
      ot: {
        amount: 0,
        reason: "",
      },
      paymentStructure: {
        additions: [],
        deductions: [],
      },
      advanceAmount: 0,
      finalSalary: 0,
      remark: "",
    });
    setGenerated(false);
  }, [period, employeeId]);

  const generateSalary = async (update = false) => {
    try {
      setLoading(true);
      //if employee otMethod is calc and inOut is not available return error
      if (
        employee?.otMethod === "calc" &&
        !inOut &&
        formFields.inOut.length === 0
      ) {
        setSnackbarMessage(
          `InOut required for calculated OT of ${employee?.name || "employee"}`
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }

      //use post method
      const response = await fetch(`/api/salaries/generate`, {
        method: "POST",
        body: JSON.stringify({
          companyId,
          employees: [employeeId],
          period,
          inOut: update ? formFields.inOut : inOut,
          existingSalaries: update ? [formFields] : undefined,
          update,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormFields((prevFields) => ({
          ...prevFields,
          period,
        }));
        if (
          typeof data?.message === "string" &&
          data.message.startsWith("Month not Purchased")
        ) {
          throw new Error(data.message);
        } else {
          throw new Error("Failed to fetch Salary");
        }
      }

      //if data.exists then show salary for this month already exists
      if (data.exists && data.exists.length > 0) {
        setSnackbarMessage(`Salary for ${period} already exists.`);
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
        return;
      }

      //check if data.salaries[0] is in correct form
      if (
        !data.salaries[0] ||
        !data.salaries[0].employee ||
        !data.salaries[0].period
      ) {
        throw new Error("Invalid Salary Data");
      }

      setFormFields(data.salaries[0]);
      console.log("Generated Salary:", data.salaries[0]);
      if (!update) {
        setGenerated(true);
      }
    } catch (error) {
      setSnackbarMessage(
        error instanceof Error ? error.message : "Error fetching Salary."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  // Fetch salary
  // useEffect(() => {
  //   if (employeeId?.length === 24) {
  //     fetchSalary();
  //   } else {
  //     setSnackbarMessage("Invalid Employee ID");
  //     setSnackbarSeverity("error");
  //     setSnackbarOpen(true);
  //   }
  // }, [employeeId, period, inOut]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const calculateFinalSalary = () => {
    const basic = Number(formFields.basic);
    const otAmount = Number(formFields.ot.amount);

    const additionsForEarnings = formFields.paymentStructure.additions.reduce(
      (acc, addition) => {
        if (addition.affectTotalEarnings) {
          return acc + Number(addition.amount);
        }
        return acc;
      },
      0
    );

    const deductionsForEarnings = formFields.paymentStructure.deductions.reduce(
      (acc, deduction) => {
        if (deduction.affectTotalEarnings) {
          return acc + Number(deduction.amount);
        }
        return acc;
      },
      0
    );

    const noPayAmount = Number(formFields.noPay.amount) || 0;
    const holidayPay = Number(formFields.holidayPay) || 0;

    //set epf
    const epfAmount =
      ((isNaN(basic) ? 0 : basic) +
        (isNaN(holidayPay) ? 0 : holidayPay) +
        (isNaN(additionsForEarnings) ? 0 : additionsForEarnings) -
        (isNaN(deductionsForEarnings) ? 0 : deductionsForEarnings) -
        (isNaN(noPayAmount) ? 0 : noPayAmount)) *
      0.08;

    const epfDeduction = formFields.paymentStructure.deductions.find(
      (deduction) => deduction.name === "EPF 8%"
    );
    if (epfDeduction) {
      epfDeduction.amount = epfAmount.toString();
    }

    const additions = formFields.paymentStructure.additions.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const deductions = formFields.paymentStructure.deductions.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );

    const advanceAmount = Number(formFields.advanceAmount);

    const finalSalary =
      basic + holidayPay + otAmount + additions - deductions - noPayAmount;
    setFormFields((prevFields) => ({
      ...prevFields,
      finalSalary,
    }));
  };

  //calculate final salary when changed
  useEffect(() => {
    calculateFinalSalary();
  }, [
    formFields.basic,
    formFields.ot,
    formFields.holidayPay,
    formFields.paymentStructure,
    formFields.noPay,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("ot-") || name.startsWith("noPay-")) {
      const [prefix, key] = name.split("-");
      setFormFields((prevFields) => ({
        ...prevFields,
        [prefix]: {
          ...(prevFields[prefix as keyof Salary] as Record<string, any>),
          [key]: value,
        },
      }));
      return;
    }

    setFormFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));

    if (name === "basic") {
      formFields.basic = Number(value);
      generateSalary(true);
    }
  };

  const onSaveClick = async () => {
    //const newErrors = SalaryValidation(formFields);
    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      // Perform POST request to add a new salary record
      const response = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salaries: [
            {
              ...formFields, // The form data becomes the first element of the array
            },
          ],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbarMessage("Salary record saved successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Clear the form after successful save
        // setFormFields({
        // });
        setErrors({});
        setFormFields({
          id: "",
          _id: "",
          employee: "",
          period,
          basic: 0,
          holidayPay: 0,
          inOut: [],
          noPay: {
            amount: 0,
            reason: "",
          },
          ot: {
            amount: 0,
            reason: "",
          },
          paymentStructure: {
            additions: [],
            deductions: [],
          },
          advanceAmount: 0,
          finalSalary: 0,
          remark: "",
        });
        setGenerated(false);
      } else {
        // Handle validation or other errors returned by the API
        setSnackbarMessage(
          result.message || "Error saving salary. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error saving salary:", error);

      setSnackbarMessage("Error saving salary. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                Generated Salary Information
              </Typography>
              <Tooltip title="Save new salary record" arrow>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Save />}
                  onClick={onSaveClick}
                  disabled={loading || !formFields.employee}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : "Save"}
                </Button>
              </Tooltip>
            </Box>
          }
        />

        <CardContent>
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
                    Employee: {employee?.memberNo} - {employee?.name}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    NIC: {employee?.nic}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Period: {period}
                  </Typography>
                </Box>
              )}
            </Grid>
            {!generated && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Button
                      variant="outlined"
                      color="primary"
                      component="label"
                      startIcon={inOut ? <CheckCircle /> : <Upload />}
                    >
                      Upload In-Out CSV
                      <input
                        type="file"
                        accept="image/*"
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
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <LoadingButton
                      variant="contained"
                      color="success"
                      component="label"
                      loading={loading}
                      loadingPosition="center"
                      startIcon={<Autorenew />}
                      onClick={async () => {
                        await generateSalary();
                      }}
                    >
                      <span>Generate</span>
                    </LoadingButton>
                  </FormControl>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <InOutTable
                inOuts={formFields.inOut.map((inOut, index) => ({
                  id: index + 1,
                  employeeName: employee?.name,
                  employeeNIC: employee?.nic,
                  basic: employee?.basic ?? 0,
                  divideBy: employee?.divideBy ?? 240,
                  ...inOut,
                }))}
                setInOuts={(inOuts: any[]) => {
                  setFormFields((prev) => ({
                    ...prev,
                    inOut: inOuts.map((inOut, index) => ({
                      ...prev.inOut[index],
                      in: inOut.in,
                      out: inOut.out,
                      workingHours: inOut.workingHours,
                      otHours: inOut.otHours,
                      ot: inOut.ot,
                      noPay: inOut.noPay,
                      holiday: inOut.holiday,
                      description: inOut.description,
                      remark: inOut.remark,
                    })),
                  }));
                }}
                fetchSalary={generateSalary}
                editable={true}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.basic}>
                <TextField
                  label="Basic"
                  name="basic"
                  type="number"
                  value={formFields.basic}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: loading,
                  }}
                />
                {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.finalSalary}>
                <TextField
                  label="Final Salary"
                  name="finalSalary"
                  type="number"
                  value={formFields.finalSalary}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {errors.finalSalary && (
                  <FormHelperText>{errors.finalSalary}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.ot}>
                <TextField
                  label="OT"
                  name="ot-amount"
                  type="number"
                  value={formFields.ot.amount}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {errors.ot && <FormHelperText>{errors.ot}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.ot}>
                <TextField
                  label="OT Reason"
                  name="ot-reason"
                  value={formFields.ot.reason}
                  onChange={handleChange}
                  variant="filled"
                  multiline
                  InputProps={{
                    readOnly: loading,
                  }}
                />
                {errors.ot && <FormHelperText>{errors.ot}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.ot}>
                <TextField
                  label="Holiday Pay"
                  name="holidayPay"
                  value={formFields.holidayPay}
                  //onChange={handleChange}
                  variant="filled"
                  multiline
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {errors.ot && <FormHelperText>{errors.ot}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid mt={3} item xs={12}>
              <PaymentStructure
                isEditing={true}
                handleChange={handleChange}
                paymentStructure={formFields.paymentStructure}
                setPaymentStructure={(paymentStructure) => {
                  //console.log("Setting payment structure:", paymentStructure); // Debugging
                  setFormFields((prev) => ({
                    ...prev,
                    paymentStructure,
                  }));
                }}
                isSalary={true}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.noPay}>
                <TextField
                  label="No Pay"
                  name="noPay-amount"
                  type="number"
                  value={formFields.noPay.amount}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {errors.noPay && (
                  <FormHelperText>{errors.noPay}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.noPay}>
                <TextField
                  label="No Pay Reason"
                  name="noPay-reason"
                  value={formFields.noPay.reason}
                  onChange={handleChange}
                  variant="filled"
                  multiline
                  InputProps={{
                    readOnly: loading,
                  }}
                />
                {errors.noPay && (
                  <FormHelperText>{errors.noPay}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.advanceAmount}>
                <TextField
                  label="Advance Amount"
                  name="advanceAmount"
                  type="number"
                  value={formFields.advanceAmount}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: loading,
                  }}
                />
                {errors.advanceAmount && (
                  <FormHelperText>{errors.advanceAmount}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
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

export default GenerateSalaryOne;
