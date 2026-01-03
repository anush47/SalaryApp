
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Typography,
    Box,
    CircularProgress,
    InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LoadingButton } from '@mui/lab';
import { Save, CloudUpload } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { createEtfPayment } from '@/app/lib/api';
import { useSnackbar } from '@/app/context/SnackbarContext';
import { uploadFile } from '@/app/lib/uploadService';
import { styled } from '@mui/material/styles';

interface EtfPaymentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    initialPeriod?: string;
}

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

export default function EtfPaymentDialog({
    open,
    onClose,
    onSuccess,
    companyId,
    initialPeriod
}: EtfPaymentDialogProps) {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState<Dayjs | null>(dayjs());
    const [periodDate, setPeriodDate] = useState<Dayjs | null>(
        initialPeriod ? dayjs(initialPeriod) : dayjs()
    );
    const [employerContribution, setEmployerContribution] = useState<string>('');
    const [totalAmount, setTotalAmount] = useState<string>('');
    const [method, setMethod] = useState('bank_transfer');
    const [surcharges, setSurcharges] = useState<string>('0');
    const [remark, setRemark] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Auto-calculate total
    useEffect(() => {
        const emp = parseFloat(employerContribution) || 0;
        const sur = parseFloat(surcharges) || 0;
        setTotalAmount((emp + sur).toFixed(2));
    }, [employerContribution, surcharges]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setReceiptFile(event.target.files[0]);
        }
    };

    const handleSave = async () => {
        // Validation
        const newErrors: { [key: string]: string } = {};
        if (!date) newErrors.date = 'Payment date is required';
        if (!periodDate) newErrors.period = 'Period is required';
        if (!employerContribution) newErrors.employerContribution = 'Required';
        if (!totalAmount || parseFloat(totalAmount) <= 0) newErrors.totalAmount = 'Invalid amount';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            let receiptUrl = '';
            let receiptFilename = '';

            if (receiptFile) {
                // Upload receipt
                const uploadResult = await uploadFile({
                    file: receiptFile,
                    folder: 'etf-receipts',
                    entityId: companyId, // Using companyId as placeholder for new record
                    companyId
                });
                receiptUrl = uploadResult.key;
                receiptFilename = receiptFile.name;
            }

            const paymentData = {
                company: companyId,
                period: periodDate?.format('YYYY-MM'),
                employerContribution: parseFloat(employerContribution),
                totalAmount: parseFloat(totalAmount),
                paymentDate: date?.toDate(),
                paymentMethod: method,
                // No referenceNo for ETF as per requirement
                surcharges: parseFloat(surcharges) || 0,
                remark: remark,
                receiptFile: receiptUrl,
                receiptFilename: receiptFilename,
                createdBy: "USER_ID_PLACEHOLDER"
            };

            await createEtfPayment(paymentData);
            showSnackbar({ message: 'ETF Payment recorded successfully', severity: 'success' });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to record payment:', error);
            showSnackbar({ message: error.message || 'Failed to record payment', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Record ETF Payment</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Period"
                                views={['year', 'month']}
                                value={periodDate}
                                onChange={(newValue) => setPeriodDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.period, helperText: errors.period } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Payment Date"
                                value={date}
                                onChange={(newValue) => setDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.date, helperText: errors.date } }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Contribution Details</Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Employer Contribution (3%)"
                                type="number"
                                fullWidth
                                value={employerContribution}
                                onChange={(e) => setEmployerContribution(e.target.value)}
                                error={!!errors.employerContribution}
                                helperText={errors.employerContribution}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Surcharges"
                                type="number"
                                fullWidth
                                value={surcharges}
                                onChange={(e) => setSurcharges(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Total Amount"
                                type="number"
                                fullWidth
                                value={totalAmount}
                                InputProps={{
                                    readOnly: true,
                                    startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                                }}
                                error={!!errors.totalAmount}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Payment Details</Typography>
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

                        {/* No Reference No for ETF as per plan */}

                        <Grid item xs={12}>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUpload />}
                                fullWidth
                                sx={{ mb: 1 }}
                            >
                                {receiptFile ? receiptFile.name : "Upload Receipt Key / Proof"}
                                <VisuallyHiddenInput type="file" onChange={handleFileChange} accept="image/*,application/pdf" />
                            </Button>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Remark"
                                fullWidth
                                multiline
                                rows={2}
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <LoadingButton
                    onClick={handleSave}
                    loading={loading}
                    variant="contained"
                    color="primary"
                    startIcon={<Save />}
                >
                    Record Payment
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
