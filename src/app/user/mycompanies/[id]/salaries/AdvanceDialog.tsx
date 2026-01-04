import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Grid,
    Box,
    InputAdornment,
    Alert,
    Autocomplete,
    useTheme,
    useMediaQuery,
    IconButton
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Cancel as CancelIcon } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import { createSalaryAdvance, fetchEmployees } from "@/app/lib/api";
import { useSnackbar } from "@/app/context/SnackbarContext";

interface AdvanceDialogProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    companyId: string;
    preSelectedEmployee?: { id: string; name: string };
}

export const AdvanceDialog: React.FC<AdvanceDialogProps> = ({
    open,
    onClose,
    companyId,
    preSelectedEmployee,
}) => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [employee, setEmployee] = useState<{ id: string; name: string } | null>(
        preSelectedEmployee || null
    );
    const [date, setDate] = useState<Dayjs | null>(dayjs());
    const [amount, setAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque">("cash");
    const [referenceNo, setReferenceNo] = useState<string>("");
    const [reason, setReason] = useState<string>("");

    // Deduction Plan
    const [startPeriod, setStartPeriod] = useState<Dayjs | null>(dayjs().add(1, 'month')); // Default next month
    const [months, setMonths] = useState<number>(1);
    const [monthlyDeduction, setMonthlyDeduction] = useState<number>(0);

    // Employee search state
    const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        if (open) {
            // Reset form
            if (preSelectedEmployee) setEmployee(preSelectedEmployee);
            else setEmployee(null);
            setDate(dayjs());
            setAmount("");
            setPaymentMethod("cash");
            setReferenceNo("");
            setReason("");
            setStartPeriod(dayjs().add(1, 'month'));
            setMonths(1);
            setError(null);

            // Fetch employees if not pre-selected
            if (!preSelectedEmployee) {
                loadEmployees();
            }
        }
    }, [open, preSelectedEmployee]);

    useEffect(() => {
        // Auto calculate monthly deduction
        if (amount && months > 0) {
            const amt = parseFloat(amount);
            if (!isNaN(amt)) {
                setMonthlyDeduction(amt / months);
            }
        } else {
            setMonthlyDeduction(0);
        }
    }, [amount, months]);

    const loadEmployees = async () => {
        setSearchLoading(true);
        try {
            const res = await fetchEmployees({ companyId, page: 1, limit: 100 }); // Fetch first 100 for now
            if (res && res.employees) {
                setEmployeeOptions(
                    res.employees.map((e: any) => ({ id: e._id, name: e.name }))
                );
            }
        } catch (err) {
            console.error("Failed to load employees", err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSave = async () => {
        if (!employee) {
            setError("Please select an employee");
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        if (!date) {
            setError("Please select an advance date");
            return;
        }
        if (!startPeriod) {
            setError("Please select deduction start month");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const advanceData = {
                employeeId: employee.id,
                company: companyId,
                amount: parseFloat(amount),
                advanceDate: date.toDate(),
                paymentMethod,
                referenceNo,
                reason: reason,
                deductionStartPeriod: startPeriod.format("YYYY-MM"),
                deductionMonths: months,
                monthlyDeduction: monthlyDeduction,
            };

            await createSalaryAdvance(advanceData);

            showSnackbar({
                message: "Salary advance recorded successfully",
                severity: "success",
            });
            onClose(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to record advance");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6">Give Salary Advance</Typography>
                        {employee && (
                            <Typography variant="body2" color="text.secondary">
                                {employee.name}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={() => onClose(false)} size="small"><CancelIcon /></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <Autocomplete
                            options={employeeOptions}
                            getOptionLabel={(option) => option.name}
                            value={employee}
                            onChange={(_, newValue) => setEmployee(newValue)}
                            loading={searchLoading}
                            disabled={!!preSelectedEmployee}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Employee"
                                    variant="outlined"
                                    fullWidth
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Amount"
                            type="number"
                            fullWidth
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                            <DatePicker
                                label="Advance Date"
                                value={date}
                                onChange={(newValue) => setDate(newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Payment Method</InputLabel>
                            <Select
                                value={paymentMethod}
                                label="Payment Method"
                                onChange={(e) => setPaymentMethod(e.target.value as any)}
                            >
                                <MenuItem value="cash">Cash</MenuItem>
                                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                <MenuItem value="cheque">Cheque</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {(paymentMethod === "bank_transfer" || paymentMethod === "cheque") && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Reference / Cheque No"
                                fullWidth
                                value={referenceNo}
                                onChange={(e) => setReferenceNo(e.target.value)}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <TextField
                            label="Reason (Optional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                            Deduction Plan
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                                        <DatePicker
                                            label="Start Month"
                                            views={['year', 'month']}
                                            value={startPeriod}
                                            onChange={(newValue) => setStartPeriod(newValue)}
                                            slotProps={{ textField: { fullWidth: true } }}
                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Deduction Months"
                                        type="number"
                                        fullWidth
                                        value={months}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val > 0) setMonths(val);
                                        }}
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        Monthly Deduction: <strong>LKR {monthlyDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancel</Button>
                <LoadingButton
                    variant="contained"
                    onClick={handleSave}
                    loading={loading}
                    disabled={!amount || parseFloat(amount) <= 0 || !employee}
                >
                    Confirm Advance
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};
