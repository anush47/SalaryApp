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
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { createSalaryPayment } from "@/app/lib/api";
import { useSnackbar } from "@/app/context/SnackbarContext";

interface PaymentDialogProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    salary: any; // We'll type this properly based on the improved Salary interface later
    companyId: string;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
    open,
    onClose,
    salary,
    companyId,
}) => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [date, setDate] = useState<Dayjs | null>(dayjs());
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("bank_transfer");
    const [reference, setReference] = useState<string>("");
    const [note, setNote] = useState<string>("");

    useEffect(() => {
        if (open && salary) {
            setDate(dayjs());
            // Default amount to outstanding balance if available
            const outstanding = salary.outstandingBalance !== undefined ? salary.outstandingBalance : 0;
            setAmount(outstanding > 0 ? outstanding.toString() : "");
            setMethod("bank_transfer");
            setReference("");
            setNote("");
            setError(null);
        }
    }, [open, salary]);

    const handleSave = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (!date) {
            setError("Please select a payment date");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const paymentData = {
                salary: salary._id, // Use _id for MongoDB compatibility if id is virtual
                employee: salary.employee,
                company: companyId,
                period: salary.period,
                salaryPeriod: salary.salaryPeriod || "monthly", // Fallback
                paymentDate: date.toDate(),
                amount: parseFloat(amount),
                paymentMethod: method,
                referenceNo: reference,
                adminNote: note,
                madeBy: "USER_ID_PLACEHOLDER", // The backend should handle this from session/context
            };

            await createSalaryPayment(paymentData);

            showSnackbar({
                message: "Payment recorded successfully",
                severity: "success",
            });
            onClose(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    if (!salary) return null;

    const outstanding = salary.outstandingBalance !== undefined ? salary.outstandingBalance : 0;

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Record Salary Payment</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ mb: 3, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Employee
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        {salary.name || salary.memberNo}
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Total Salary
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                LKR {salary.finalSalary?.toLocaleString()}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Outstanding
                            </Typography>
                            <Typography
                                variant="body2"
                                fontWeight="bold"
                                color={outstanding > 0 ? "error.main" : "success.main"}
                            >
                                LKR {outstanding.toLocaleString()}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                            <DatePicker
                                label="Payment Date"
                                value={date}
                                onChange={(newValue) => setDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, variant: "outlined" } }}
                            />
                        </LocalizationProvider>
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
                            helperText={`Max: ${outstanding.toLocaleString()}`}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Payment Method</InputLabel>
                            <Select
                                value={method}
                                label="Payment Method"
                                onChange={(e) => setMethod(e.target.value)}
                            >
                                <MenuItem value="cash">Cash</MenuItem>
                                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                <MenuItem value="cheque">Cheque</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Reference / Cheque No"
                            fullWidth
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            disabled={method === "cash"}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Note (Optional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Admin note about this payment..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancel</Button>
                <LoadingButton
                    variant="contained"
                    onClick={handleSave}
                    loading={loading}
                    disabled={!amount || parseFloat(amount) <= 0}
                >
                    Save Payment
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};
