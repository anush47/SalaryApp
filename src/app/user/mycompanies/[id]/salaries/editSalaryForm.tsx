import {
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Salary } from "./salariesDataGrid";
import { ArrowBack, Edit, ExpandMore, Save } from "@mui/icons-material";
import { PaymentStructure } from "../companyDetails/paymentStructure";
import { LoadingButton } from "@mui/lab";
import { DailyRecordsTable } from "./DailyRecordsTable";
import { useSnackbar } from "@/app/context/SnackbarContext"; // Import useSnackbar
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { fetchCompany, fetchEmployee, fetchSalaries, updateSalary, deleteSalaries, generateSalaries } from "@/app/lib/api";

const EditSalaryForm: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  handleBackClick: () => void;
  companyId: string;
  salaryId: string;
}> = ({ user, handleBackClick, companyId, salaryId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const { showSnackbar } = useSnackbar();
  const [formFields, setFormFields] = useState<Salary>({
    _id: "",
    id: "",
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
    dailyRecords: [],
    finalSalary: 0,
    remark: "",
  });

  const fetchCompanyData = async (): Promise<any> => {
    return fetchCompany(companyId);
  };

  const {
    data: companyData,
    isLoading: isCompanyLoading,
    isError: isCompanyError,
    error: companyError,
  } = useQuery<any, Error>({
    queryKey: ["companies", companyId],
    queryFn: fetchCompanyData,
    enabled: !!companyId, // Only run the query if companyId is available
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const fetchEmployeeData = async (): Promise<any> => {
    if (!formFields.employee) return null;
    return fetchEmployee(formFields.employee);
  };

  const {
    data: employeeFullData,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
    error: employeeError,
  } = useQuery<any, Error>({
    queryKey: ["employees", formFields.employee],
    queryFn: fetchEmployeeData,
    enabled: !!formFields.employee, // Only run the query if employee ID is available
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const queryClient = useQueryClient();

  const fetchSalaryData = async (): Promise<any> => {
    return fetchSalaries({ salaryId });
  };

  const {
    data: salaryData,
    isLoading: isSalaryLoading,
    isError: isSalaryError,
    error: salaryError,
  } = useQuery<any, Error>({
    queryKey: ["salaries", companyId, formFields.period, salaryId],
    queryFn: fetchSalaryData,
    enabled: !!salaryId, // Only run the query if salaryId is available
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (salaryData) {
      setFormFields({
        id: salaryData._id,
        _id: salaryData._id,
        employee: salaryData.employee,
        period: salaryData.period,
        inOut: salaryData.inOut,
        basic: salaryData.basic,
        holidayPay: salaryData.holidayPay,
        noPay: salaryData.noPay,
        ot: salaryData.ot,
        paymentStructure: salaryData.paymentStructure,
        advanceAmount: salaryData.advanceAmount,
        finalSalary: salaryData.finalSalary,
        dailyRecords: salaryData.dailyRecords || [],
        remark: salaryData.remark,
      });
      setEmployeeData({
        memberNo: salaryData.memberNo,
        name: salaryData.name,
        nic: salaryData.nic,
        companyName: salaryData.companyName,
        companyEmployerNo: salaryData.companyEmployerNo,
        divideBy: salaryData.divideBy,
      });
    }
  }, [salaryData]);

  useEffect(() => {
    if (isSalaryError) {
      showSnackbar({
        message: salaryError?.message || "Error fetching salary.",
        severity: "error",
      });
    }
  }, [isSalaryError, salaryError, showSnackbar]);

  useEffect(() => {
    if (isEmployeeError) {
      showSnackbar({
        message: employeeError?.message || "Error fetching employee data.",
        severity: "error",
      });
    }
  }, [isEmployeeError, employeeError, showSnackbar]);

  const loading = isSalaryLoading || isLoading || isEmployeeLoading;

  //gen salary
  const fetchSalary = async () => {
    try {
      //use post method
      const data = await generateSalaries({
        companyId,
        employees: [formFields.employee ?? ""],
        period: formFields.period,
        inOut: formFields.inOut,
        existingSalaries: [formFields],
        update: true,
      });

      if (
        !data.salaries[0] ||
        !data.salaries[0].employee ||
        !data.salaries[0].period
      ) {
        throw new Error("Invalid Salary Data");
      }

      setFormFields((prevFields) => ({
        ...prevFields,
        employee: data.salaries[0].employee,
        period: data.salaries[0].period,
        inOut: data.salaries[0].inOut,
        basic: data.salaries[0].basic,
        holidayPay: data.salaries[0].holidayPay,
        noPay: data.salaries[0].noPay,
        ot: data.salaries[0].ot,
        paymentStructure: data.salaries[0].paymentStructure || { additions: [], deductions: [] },
        advanceAmount: data.salaries[0].advanceAmount,
        finalSalary: data.salaries[0].finalSalary,
        dailyRecords: data.salaries[0].dailyRecords || [],
      }));
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "Error Updating Salary.",
        severity: "error",
      });
    }
  };

  const calculateFinalSalary = () => {
    const basic = Number(formFields.basic);
    const otAmount = Number(formFields.ot.amount);

    const additionsForEarnings = (formFields.paymentStructure?.additions || []).reduce(
      (acc, addition) => {
        if (addition.affectTotalEarnings) {
          return acc + (Number(addition.amount) || 0);
        }
        return acc;
      },
      0
    );

    const deductionsForEarnings = (formFields.paymentStructure?.deductions || []).reduce(
      (acc, deduction) => {
        if (deduction.affectTotalEarnings) {
          return acc + (Number(deduction.amount) || 0);
        }
        return acc;
      },
      0
    );

    const noPayAmount = Number(formFields.noPay?.amount) || 0;
    const holidayPay = Number(formFields.holidayPay) || 0;

    // Calculate EPF (8% of Basic + Holiday Pay)
    const epfAmount =
      ((isNaN(basic) ? 0 : basic) +
        (isNaN(holidayPay) ? 0 : holidayPay) +
        (isNaN(additionsForEarnings || 0) ? 0 : additionsForEarnings) -
        (isNaN(deductionsForEarnings || 0) ? 0 : deductionsForEarnings) -
        (isNaN(noPayAmount) ? 0 : noPayAmount)) *
      0.08;

    const epfDeduction = (formFields.paymentStructure?.deductions || []).find(
      (deduction) => deduction.name === "EPF 8%"
    );
    if (epfDeduction) {
      epfDeduction.amount = epfAmount.toFixed(2);
    }

    const additions = (formFields.paymentStructure?.additions || []).reduce(
      (acc, curr) => acc + (Number(curr.amount) || 0),
      0
    );
    const deductions = (formFields.paymentStructure?.deductions || []).reduce(
      (acc, curr) => acc + (Number(curr.amount) || 0),
      0
    );

    const advanceAmount = Number(formFields.advanceAmount) || 0;

    const finalSalary =
      basic + holidayPay + otAmount + additions - deductions - noPayAmount - advanceAmount;
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
    formFields.holidayPay,
    formFields.ot,
    formFields.paymentStructure,
    formFields.noPay,
    formFields.advanceAmount,
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
      fetchSalary();
    }
  };

  const onSaveClick = async () => {
    //const newErrors = SalaryValidation(formFields);
    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      return;
    }

    try {
      // Perform POST request to add a new salary record
      setIsLoading(true);
      const result = await updateSalary({ ...formFields });

      showSnackbar({
        message: "Salary record saved successfully!",
        severity: "success",
      });

      setIsEditing(false);
      const queryKey = [
        "salaries",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });

      // Wait before clearing the form
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay

      setErrors({});
    } catch (error) {
      showSnackbar({
        message: "Error saving salary. Please try again.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [dialogOpenDelete, setDialogOpenDelete] = useState(false);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const handleDeleteClick = (employeeName: string) => {
    setEmployeeName(employeeName);
    setDialogOpenDelete(true);
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      // Perform the delete action here
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
    try {
      setIsLoading(true);
      // Perform DELETE request to delete the salary record
      // Perform DELETE request to delete the salary record
      const result = await deleteSalaries([formFields.id]);

      showSnackbar({
        message: "Salary record deleted successfully!",
        severity: "success",
      });

      const queryKey = [
        "salaries",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });

      // Wait before clearing the form
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay

      setErrors({});
      window.history.back();
    } catch (error) {
      showSnackbar({
        message: "Error deleting salary. Please try again.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
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
                  Salary Details
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
                    Employee: {employeeData?.memberNo} - {employeeData?.name}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    NIC: {employeeData?.nic}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Period: {formFields?.period}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Company: {employeeData?.companyName}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Employer No: {employeeData?.companyEmployerNo}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <DailyRecordsTable
                dailyRecords={formFields.dailyRecords || []}
                onBreakHoursChange={(index, newBreakHours) => {
                  setFormFields(prev => {
                    if (!prev || !prev.dailyRecords) return prev;
                    const updatedRecords = [...prev.dailyRecords];
                    updatedRecords[index] = {
                      ...updatedRecords[index],
                      breakHours: newBreakHours
                    };
                    return { ...prev, dailyRecords: updatedRecords };
                  });
                }}
                editable={isEditing}
              />
              {(!formFields.dailyRecords || formFields.dailyRecords.length === 0) && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No daily records available. This salary record may need to be regenerated to support the new attendance view.
                  </Typography>
                </Box>
              )}
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
                    readOnly: loading || !isEditing,
                  }}
                />
                {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <TextField
                  label="Gross Earnings"
                  type="number"
                  value={((Number(formFields.basic) || 0) + (Number(formFields.holidayPay) || 0) - (Number(formFields.noPay.amount) || 0)).toFixed(2)}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                    style: { fontWeight: 'bold' }
                  }}
                  helperText="Basic + Holiday - No Pay"
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <TextField
                  label="Final before advance"
                  type="number"
                  value={((Number(formFields.basic) || 0) + (Number(formFields.holidayPay) || 0) + (Number(formFields.ot.amount) || 0) + ((formFields.paymentStructure?.additions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)) - ((formFields.paymentStructure?.deductions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)) - (Number(formFields.noPay.amount) || 0)).toFixed(2)}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                    style: { fontWeight: 'bold', color: 'primary.main' }
                  }}
                  helperText="Total before advance deduction"
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth error={!!errors.advanceAmount}>
                <TextField
                  label="Advance Deduction"
                  name="advanceAmount"
                  type="number"
                  value={formFields.advanceAmount}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: loading || !isEditing,
                  }}
                />
                {errors.advanceAmount && (
                  <FormHelperText>{errors.advanceAmount}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth error={!!errors.finalSalary}>
                <TextField
                  label="Net Salary"
                  name="finalSalary"
                  type="number"
                  value={formFields.finalSalary?.toFixed(2) || 0}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    readOnly: true,
                    style: { fontWeight: 'bold', color: '#2e7d32', fontSize: '1.2rem' }
                  }}
                  helperText="Actual payout"
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
                    readOnly: loading || !isEditing,
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
                isEditing={isEditing}
                handleChange={handleChange}
                paymentStructure={formFields.paymentStructure}
                setPaymentStructure={(paymentStructure) => {
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
                    readOnly: loading || !isEditing,
                  }}
                />
                {errors.noPay && (
                  <FormHelperText>{errors.noPay}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            {/* Advance Amount already shown in the 3-column final row above */}
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
          <Grid item xs={12} sm={6}>
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
                onClick={() => handleDeleteClick(employeeData?.name || "")}
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
        message={`Are you sure you want to delete the salary of ${employeeName} for ${formFields.period}?`}
      />
    </>
  );
};

export default EditSalaryForm;
