import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    Typography,
    Box,
    Divider,
    IconButton,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { useQueryClient } from "@tanstack/react-query";
import { generateSalaries } from "@/app/lib/api";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Add as AddIcon, Remove as RemoveIcon, Cancel as CancelIcon } from '@mui/icons-material';

import { Salary } from './salariesDataGrid';
import { PaymentStructure } from '../companyDetails/paymentStructure';

import { DailyRecordsTable } from './DailyRecordsTable';

interface SalaryEditDialogProps {
    open: boolean;
    salary: Salary | null;
    onClose: () => void;
    onSave: (updatedSalary: Salary) => void;
    companyId: string;
}

export const SalaryEditDialog: React.FC<SalaryEditDialogProps> = ({ open, salary, onClose, onSave, companyId }) => {
    const [formData, setFormData] = useState<Salary | null>(null);
    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        if (salary) {
            console.log("SalaryEditDialog received salary:", salary);
            console.log("Salary dailyRecords:", salary.dailyRecords);
            console.log("Salary dailyRecords length:", salary.dailyRecords?.length);
            // Deep copy to separate from source until saved
            setFormData(JSON.parse(JSON.stringify(salary)));
        }
    }, [salary]);



    const handleChange = (field: keyof Salary, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleNestedChange = (parent: 'ot' | 'noPay', field: string, value: any) => {
        setFormData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [field]: field === 'amount' ? Number(value) : value
                }
            };
        });
    };







    const calculateFinalSalary = () => {
        if (!formData) return 0;

        const basic = Number(formData.basic) || 0;
        const otAmount = Number(formData.ot.amount) || 0;
        const noPayAmount = Number(formData.noPay.amount) || 0;
        const holidayPay = Number(formData.holidayPay) || 0;
        const advanceAmount = Number(formData.advanceAmount) || 0;

        const additionsForEarnings = formData.paymentStructure.additions.reduce(
            (acc, addition) => {
                if (addition.affectTotalEarnings) {
                    return acc + Number(addition.amount);
                }
                return acc;
            },
            0
        );

        const deductionsForEarnings = formData.paymentStructure.deductions.reduce(
            (acc, deduction) => {
                if (deduction.affectTotalEarnings) {
                    return acc + Number(deduction.amount);
                }
                return acc;
            },
            0
        );

        // EPF 8% Calculation (mimicking EditSalaryForm)
        const epfAmount =
            ((basic) +
                (holidayPay) +
                (additionsForEarnings) -
                (deductionsForEarnings) -
                (noPayAmount)) *
            0.08;

        // Auto-update EPF in deductions if it exists
        const newDeductions = [...formData.paymentStructure.deductions];
        const epfDeductionIndex = newDeductions.findIndex(d => d.name === "EPF 8%");

        let paymentStructure = formData.paymentStructure;

        // Only update if found and creating a new object to avoid mutation during render if called directly
        // However, calculateFinalSalary is called for display. 
        // To strictly "update" the EPF value in the form data like EditSalaryForm does:
        // EditSalaryForm updates the state. Here we are just calculating return value.
        // We should probably NOT update state inside this calculation function if it's called during render.
        // But for "Estimated Final Salary", we can just calculate.

        // If we want to behave exactly like EditSalaryForm, we should use a useEffect to update the EPF field in state.

        const totalAdditions = formData.paymentStructure.additions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        // Recalculate total deductions including the potentially constrained EPF if we were to update it
        // For display purposes, let's use the current form data values, but adding the calculated EPF for correctness?
        // Actually, EditSalaryForm updates the deduction amount in the state.

        const totalDeductions = formData.paymentStructure.deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        return basic + holidayPay + otAmount + totalAdditions - totalDeductions - noPayAmount - advanceAmount;
    };

    // Effect to update EPF and Final Salary when dependent fields change (matching EditSalaryForm)
    useEffect(() => {
        if (!formData) return;

        const basic = Number(formData.basic) || 0;
        const holidayPay = Number(formData.holidayPay) || 0;
        const noPayAmount = Number(formData.noPay.amount) || 0;
        const otAmount = Number(formData.ot.amount) || 0;
        const advanceAmount = Number(formData.advanceAmount) || 0;

        const additionsForEarnings = formData.paymentStructure.additions.reduce(
            (acc, addition) => {
                if (addition.affectTotalEarnings) {
                    return acc + Number(addition.amount);
                }
                return acc;
            },
            0
        );

        const deductionsForEarnings = formData.paymentStructure.deductions.reduce(
            (acc, deduction) => {
                if (deduction.affectTotalEarnings) {
                    return acc + Number(deduction.amount);
                }
                return acc;
            },
            0
        );

        const epfAmount =
            ((Number(basic) || 0) +
                (Number(holidayPay) || 0) +
                (Number(additionsForEarnings) || 0) -
                (Number(deductionsForEarnings) || 0) -
                (Number(noPayAmount) || 0)) *
            0.08;

        // Check if we need to update EPF
        const epfIndex = formData.paymentStructure.deductions.findIndex(d => d.name === "EPF 8%");
        if (epfIndex !== -1) {
            const currentEpfValue = Number(formData.paymentStructure.deductions[epfIndex].amount);
            // Verify if update needed to avoid infinite loop (floating point comparison)
            if (Math.abs(currentEpfValue - epfAmount) > 0.01) {
                const newDeductions = [...formData.paymentStructure.deductions];
                newDeductions[epfIndex] = { ...newDeductions[epfIndex], amount: epfAmount.toFixed(2) };

                const newStructure = { ...formData.paymentStructure, deductions: newDeductions };
                setFormData(prev => prev ? { ...prev, paymentStructure: newStructure } : null);
                return; // Return mainly to let next render cycle handle the rest
            }
        }

        // Calculate Final Salary
        const totalAdditions = formData.paymentStructure.additions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalDeductions = formData.paymentStructure.deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const finalSalary = (Number(basic) || 0) + (Number(holidayPay) || 0) + (Number(otAmount) || 0) + (Number(totalAdditions) || 0) - (Number(totalDeductions) || 0) - (Number(noPayAmount) || 0) - (Number(advanceAmount) || 0);

        // Only update if different
        if (formData.finalSalary !== finalSalary) {
            setFormData(prev => prev ? { ...prev, finalSalary } : null);
        }

    }, [
        formData?.basic,
        formData?.holidayPay,
        formData?.noPay.amount,
        formData?.ot.amount,
        formData?.advanceAmount,
        JSON.stringify(formData?.paymentStructure)
    ]);

    const handleSave = () => {
        if (formData) {
            // Update final salary based on edits?
            const recalculatedFinal = calculateFinalSalary();
            // Note: Users might want to manually override final salary? 
            // Better to update it based on components to keep consistency.
            // However, taxes might be complex. 
            // For now, let's update finalSalary locally so the UI reflects the math.
            const updated = { ...formData, finalSalary: recalculatedFinal };
            onSave(updated);
            onClose();
        }
    };

    if (!formData) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6">Edit Salary Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formData.salaryPeriod} ({formData.period})
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"><CancelIcon /></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
                <Grid container spacing={2}>
                    {/* Basic & Rates */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="primary">Base Earnings</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField
                            label="Basic Salary"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.basic}
                            onChange={(e) => handleChange('basic', Number(e.target.value))}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField
                            label="Holiday Pay"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.holidayPay}
                            onChange={(e) => handleChange('holidayPay', Number(e.target.value))}
                        />
                    </Grid>

                    {/* OT & NoPay */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="primary">Attendance Adjustments</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField
                            label="OT Amount"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.ot.amount}
                            onChange={(e) => handleNestedChange('ot', 'amount', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} md={9}>
                        <TextField
                            label="OT Reason"
                            fullWidth
                            size="small"
                            value={formData.ot.reason}
                            onChange={(e) => handleNestedChange('ot', 'reason', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField
                            label="No Pay Amount"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.noPay.amount}
                            onChange={(e) => handleNestedChange('noPay', 'amount', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} md={9}>
                        <TextField
                            label="No Pay Reason"
                            fullWidth
                            size="small"
                            value={formData.noPay.reason}
                            onChange={(e) => handleNestedChange('noPay', 'reason', e.target.value)}
                        />
                    </Grid>


                    {/* Attendance Records */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <DailyRecordsTable
                            dailyRecords={formData.dailyRecords || []}
                            onBreakHoursChange={(index, newBreakHours) => {
                                setFormData(prev => {
                                    if (!prev || !prev.dailyRecords) return prev;
                                    const updatedRecords = [...prev.dailyRecords];
                                    updatedRecords[index] = {
                                        ...updatedRecords[index],
                                        breakHours: newBreakHours
                                    };
                                    return { ...prev, dailyRecords: updatedRecords };
                                });
                            }}
                            editable={true}
                        />
                        {(!formData.dailyRecords || formData.dailyRecords.length === 0) && (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    No daily records available. This salary record may need to be regenerated to support the new attendance view.
                                </Typography>
                            </Box>
                        )}
                    </Grid>

                    {/* Additions & Deductions via PaymentStructure Component */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <PaymentStructure
                            isEditing={true}
                            isSalary={true}
                            handleChange={() => { }} // Not used by internal logic of PaymentStructure for structure updates
                            paymentStructure={formData.paymentStructure}
                            setPaymentStructure={(newStructure) => {
                                setFormData(prev => prev ? { ...prev, paymentStructure: newStructure } : null);
                            }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="primary">Final Calculation</Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Gross Earnings"
                            type="number"
                            fullWidth
                            size="small"
                            disabled
                            value={((Number(formData.basic) || 0) + (Number(formData.holidayPay) || 0) - (Number(formData.noPay.amount) || 0)).toFixed(2)}
                            helperText="Basic + Holiday Pay - No Pay"
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Advance Deduction"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.advanceAmount}
                            onChange={(e) => handleChange('advanceAmount', Number(e.target.value))}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Final Net Salary"
                            type="number"
                            fullWidth
                            size="small"
                            disabled
                            value={formData.finalSalary?.toFixed(2) || "0.00"}
                            sx={{
                                '& .MuiInputBase-input': {
                                    fontWeight: 'bold',
                                    color: 'success.main',
                                    fontSize: '1.2rem'
                                }
                            }}
                            helperText="Final payout"
                        />
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">Save Changes</Button>
            </DialogActions>
        </Dialog>
    );
};
