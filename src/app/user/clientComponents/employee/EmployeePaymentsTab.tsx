"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Button,
    CircularProgress,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import dayjs from "dayjs";
import { fetchSalaryPayments } from "@/app/lib/api/salaryPaymentApi";
import { acknowledgeSalary } from "@/app/lib/api/salaryApi";

interface EmployeePaymentsTabProps {
    employeeId: string;
}

const EmployeePaymentsTab: React.FC<EmployeePaymentsTabProps> = ({ employeeId }) => {
    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    // Fetch salary payments (includes both salary and advance type payments)
    const { data: paymentsData, isLoading: loadingPayments } = useQuery({
        queryKey: ["salary-payments", employeeId],
        queryFn: () => fetchSalaryPayments({ employeeId }),
        enabled: !!employeeId,
    });

    // Format and sort payments
    const combinedData = React.useMemo(() => {
        return (paymentsData || [])
            .map((p: any) => ({
                ...p,
                date: p.paymentDate,
                status: p.status || "pending",
            }))
            .sort((a: any, b: any) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
    }, [paymentsData]);

    const handleAcknowledge = async () => {
        if (!selectedPayment) return;

        try {
            await acknowledgeSalary(selectedPayment._id);

            showSnackbar({
                message: "Payment acknowledged successfully",
                severity: "success",
            });

            // Refresh payments data
            queryClient.invalidateQueries({ queryKey: ["salary-payments", employeeId] });
            queryClient.invalidateQueries({ queryKey: ["salaries", employeeId] });
        } catch (error: any) {
            showSnackbar({
                message: error.message || "Failed to acknowledge payment",
                severity: "error",
            });
        } finally {
            setConfirmDialogOpen(false);
            setSelectedPayment(null);
        }
    };

    if (loadingPayments) {
        return (
            <Grid item xs={12}>
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            </Grid>
        );
    }

    return (
        <>
            <Grid item xs={12}>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Payment Method</TableCell>
                                <TableCell>Note</TableCell>
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="center">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {combinedData.map((item: any, index: number) => (
                                <TableRow key={`${item.type}-${item._id || index}`} hover>
                                    <TableCell>{dayjs(item.date).format("YYYY-MM-DD")}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={item.type === "salary" ? "Salary" : "Advance"}
                                            size="small"
                                            variant="outlined"
                                            color={item.type === "advance" ? "secondary" : "default"}
                                            sx={{ textTransform: "capitalize" }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        LKR {item.amount?.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {item.paymentMethod?.replace("_", " ") || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {item.type === "advance" && item.advance?.reason
                                            ? item.advance.reason
                                            : (item.adminNote || "-")}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={item.status === "acknowledged" ? "Acknowledged" : "Pending"}
                                            color={item.status === "acknowledged" ? "success" : "warning"}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        {item.status === "pending" && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                onClick={() => {
                                                    setSelectedPayment(item);
                                                    setConfirmDialogOpen(true);
                                                }}
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {combinedData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        No payment records found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirm Payment Receipt</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        By clicking confirm, you acknowledge that you have received this payment. Do you want to proceed?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAcknowledge} variant="contained" color="primary">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default EmployeePaymentsTab;
