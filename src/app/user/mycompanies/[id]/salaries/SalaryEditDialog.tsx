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
    IconButton
} from '@mui/material';
import { useQueryClient } from "@tanstack/react-query";
import { generateSalaries } from "@/app/lib/api";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

import { Salary } from './salariesDataGrid';
import { PaymentStructure } from '../companyDetails/paymentStructure';
import { InOutTable } from './inOutTable';

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

    useEffect(() => {
        if (salary) {
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
            (basic +
                holidayPay +
                additionsForEarnings -
                deductionsForEarnings -
                noPayAmount) *
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

        const finalSalary = basic + holidayPay + otAmount + totalAdditions - totalDeductions - noPayAmount - advanceAmount;

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
        // We need to be careful with paymentStructure dependencies to avoid loops 
        // if we are updating it inside the effect. 
        // Using JSON stringify for deep comparison or specific fields is safer.
        JSON.stringify(formData?.paymentStructure.additions),
        JSON.stringify(formData?.paymentStructure.deductions.map(d => d.affectTotalEarnings)) // Only re-calc EPF if affectTotalEarnings items change? 
        // Actually, if we update deductions (EPF), this effect will fire again. 
        // We must ensure the EPF update condition above prevents loops.
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
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Salary Details - {formData.salaryPeriod} ({formData.period})</DialogTitle>
            <DialogContent dividers>
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

                    {/* InOut Table */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <InOutTable
                            inOuts={formData.inOut.map((io: any, index: number) => ({
                                id: index + 1, // temporary ID for frontend table
                                employeeName: '', // Not needed for single employee context usually, or fetch from salary
                                employeeNIC: '',
                                basic: formData.basic,
                                divideBy: 240, // Default or fetch if available
                                ...io
                            }))}
                            setInOuts={(updatedInOuts: any[]) => {
                                setFormData(prev => {
                                    if (!prev) return null;
                                    // Map back to Salary InOut structure
                                    const newInOut = updatedInOuts.map(io => ({
                                        _id: io._id || '', // Preserve _id if exists
                                        in: io.in,
                                        out: io.out,
                                        workingHours: io.workingHours,
                                        otHours: io.otHours,
                                        holiday: io.holiday,
                                        ot: io.ot,
                                        noPay: io.noPay,
                                        description: io.description,
                                        remark: io.remark,
                                        day_status: io.day_status
                                    }));
                                    return { ...prev, inOut: newInOut };
                                });
                            }}
                            fetchSalary={async () => {
                                try {
                                    if (!formData || !formData.employee) return;

                                    const data = await generateSalaries({
                                        companyId,
                                        employees: [formData.employee],
                                        period: formData.period,
                                        inOut: formData.inOut,
                                        existingSalaries: [formData],
                                        update: true,
                                    });

                                    if (data && data.salaries && data.salaries[0]) {
                                        setFormData(prev => {
                                            if (!prev) return null;
                                            return {
                                                ...prev,
                                                ...data.salaries[0],
                                                // Ensure we keep the local ID or structure if needed, 
                                                // but usually API return is authoritative for calculation
                                            };
                                        });
                                        showSnackbar({ message: "Salary recalculated successfully", severity: "success" });
                                    }
                                } catch (error) {
                                    console.error(error);
                                    showSnackbar({ message: "Error recalculating salary", severity: "error" });
                                }
                            }}
                            editable={true}
                            isDynamicHolidays={false} // Default for now
                        />
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

                    {/* Advance & Final */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="primary">Final Calculation</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Advance Deduction"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.advanceAmount}
                            onChange={(e) => handleChange('advanceAmount', Number(e.target.value))}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Estimated Final Salary"
                            type="number"
                            fullWidth
                            size="small"
                            disabled
                            value={formData.finalSalary || 0}
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
