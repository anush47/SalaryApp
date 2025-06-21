import {
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
  // Snackbar, // Removed
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import { Salary } from "./salariesDataGrid";
import { Autorenew, Save } from "@mui/icons-material";
import { PaymentStructure } from "../companyDetails/paymentStructure";
import { UploadInOutBtn, ViewUploadedInOutBtn } from "./csvUpload";
import { LoadingButton } from "@mui/lab";
import { InOutTable } from "./inOutTable";
import { useSnackbar } from "src/app/contexts/SnackbarContext"; // Import useSnackbar

const GenerateSalaryOne = ({
  period,
  employeeId,
  companyId,
}: {
  period: string;
  employeeId: string;
  companyId: string;
}) => {
  const [employee, setEmployee] = useState<Employee>();
  const [loading, setLoading] = useState(false);
  const [inOut, setInOut] = useState("");
  const [generated, setGenerated] = useState(false);
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  // const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false); // Removed
  const [openDialog, setOpenDialog] = useState(false);
  // const [snackbarMessage, setSnackbarMessage] = useState<string>(""); // Removed
  // const [snackbarSeverity, setSnackbarSeverity] = useState< "success" | "error" | "warning" | "info">("success"); // Removed

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
        // setSnackbarMessage(error instanceof Error ? error.message : "Error fetching company."); // Removed
        // setSnackbarSeverity("error"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({ message: error instanceof Error ? error.message : "Error fetching company.", severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    if (companyId?.length === 24) {
      fetchEmployee();
    } else {
      // setSnackbarMessage("Invalid Company ID"); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({ message: "Invalid Company ID", severity: "error" });
    }
  }, [employeeId, companyId, showSnackbar]); // Added companyId and showSnackbar

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
        // setSnackbarMessage(`InOut required for calculated OT of ${employee?.name || "employee"}`); // Removed
        // setSnackbarSeverity("error"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({ message: `InOut required for calculated OT of ${employee?.name || "employee"}`, severity: "error" });
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
        // setSnackbarMessage(`Salary for ${period} already exists.`); // Removed
        // setSnackbarSeverity("warning"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({ message: `Salary for ${period} already exists.`, severity: "warning" });
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
      // setSnackbarMessage(error instanceof Error ? error.message : "Error fetching Salary."); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({ message: error instanceof Error ? error.message : "Error fetching Salary.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };
  // Fetch salary
  // useEffect(() => {
  //   if (employeeId?.length === 24) {
  //     fetchSalary();
  //   } else {
  //     // setSnackbarMessage("Invalid Employee ID"); // Removed
  //     // setSnackbarSeverity("error"); // Removed
  //     // setSnackbarOpen(true); // Removed
  //     showSnackbar({ message: "Invalid Employee ID", severity: "error" });
  //   }
  // }, [employeeId, period, inOut, showSnackbar]); // Added showSnackbar

  // const handleSnackbarClose = ( // Removed
  //   event?: React.SyntheticEvent | Event,
  //   reason?: string
  // ) => {
  //   if (reason === "clickaway") {
  //     return;
  //   }
  //   setSnackbarOpen(false);
  // };

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
        // setSnackbarMessage("Salary record saved successfully!"); // Removed
        // setSnackbarSeverity("success"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({ message: "Salary record saved successfully!", severity: "success" });

        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay

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
        // setSnackbarMessage(result.message || "Error saving salary. Please try again."); // Removed
        // setSnackbarSeverity("error"); // Removed
        // setSnackbarOpen(true); // Removed
        showSnackbar({ message: result.message || "Error saving salary. Please try again.", severity: "error" });
      }
    } catch (error) {
      console.error("Error saving salary:", error);
      // setSnackbarMessage("Error saving salary. Please try again."); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({ message: "Error saving salary. Please try again.", severity: "error" });
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
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <Typography variant="h5">Generated Salary Information</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                </Box>
              )}
            </Grid>
            {!generated && (
              <>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <UploadInOutBtn inOut={inOut} setInOut={setInOut} />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <ViewUploadedInOutBtn
                      inOut={inOut}
                      openDialog={openDialog}
                      setOpenDialog={setOpenDialog}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
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
      {/* Snackbar component removed, global one will be used */}
    </>
  );
};

export default GenerateSalaryOne;
