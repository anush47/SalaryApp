import React from "react";
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    TableHead,
} from "@mui/material";
import {
    TrendingUp,
    TrendingDown,
    ExpandMore,
    Download,
} from "@mui/icons-material";
import { InOutTable } from "../../mycompanies/[id]/salaries/inOutTable";
import { formatPeriodLabel } from "@/app/lib/formatUtils";

interface SalaryDetailViewProps {
    salary: any;
    employee: any;
    onDownload: (type: "payslip" | "attendance") => void;
}

export const SalaryDetailView: React.FC<SalaryDetailViewProps> = ({
    salary,
    employee,
    onDownload,
}) => {
    if (!salary) return null;

    return (
        <>
            {/* Salary Summary Card */}
            <Grid item xs={12}>
                <Card
                    sx={{
                        mb: 3,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                    }}
                >
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: "center", sm: "left" } }}>
                                <Typography variant="body2" color="primary.contrastText" sx={{ opacity: 0.9 }}>
                                    Period
                                </Typography>
                                <Typography variant="h5" color="primary.contrastText" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                                    {formatPeriodLabel(salary.period)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: "center", sm: "left" } }}>
                                <Typography variant="body2" color="primary.contrastText" sx={{ opacity: 0.9 }}>
                                    Basic Salary
                                </Typography>
                                <Typography variant="h5" color="primary.contrastText" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                                    LKR {salary.basic?.toLocaleString()}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: "center", sm: "left" } }}>
                                <Typography variant="body2" color="primary.contrastText" sx={{ opacity: 0.9 }}>
                                    Final Salary
                                </Typography>
                                <Typography
                                    variant="h4"
                                    color="primary.contrastText"
                                    fontWeight="bold"
                                    sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" }, wordBreak: "break-all" }}
                                >
                                    LKR {salary.finalSalary?.toLocaleString()}
                                </Typography>
                            </Grid>
                        </Grid>
                        <Box mt={2} display="flex" gap={2} justifyContent={{ xs: "center", sm: "flex-end" }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<Download />}
                                onClick={() => onDownload("payslip")}
                                size="small"
                            >
                                PDF
                            </Button>
                            <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<Download />}
                                onClick={() => onDownload("attendance")}
                                size="small"
                            >
                                Attendance
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            {/* Earnings */}
            <Grid item xs={12} md={6}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                            <TrendingUp color="success" />
                            <Typography variant="h6">Earnings</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Basic Salary</TableCell>
                                        <TableCell align="right">LKR {salary.basic?.toLocaleString()}</TableCell>
                                    </TableRow>
                                    {salary.holidayPay > 0 && (
                                        <TableRow>
                                            <TableCell>Holiday Pay</TableCell>
                                            <TableCell align="right">LKR {salary.holidayPay?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )}
                                    {salary.ot?.amount > 0 && (
                                        <TableRow>
                                            <TableCell>
                                                Overtime
                                                {salary.ot.reason && (
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        {salary.ot.reason}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">LKR {salary.ot.amount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )}
                                    {salary.paymentStructure?.additions?.map((addition: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell>{addition.name}</TableCell>
                                            <TableCell align="right">LKR {addition.amount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ backgroundColor: "success.light" }}>
                                        <TableCell>
                                            <strong>Total Earnings</strong>
                                        </TableCell>
                                        <TableCell align="right">
                                            <strong>
                                                LKR{" "}
                                                {(
                                                    salary.basic +
                                                    (salary.holidayPay || 0) +
                                                    (salary.ot?.amount || 0) +
                                                    (salary.paymentStructure?.additions?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0)
                                                ).toLocaleString()}
                                            </strong>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Grid>

            {/* Deductions */}
            <Grid item xs={12} md={6}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                            <TrendingDown color="error" />
                            <Typography variant="h6">Deductions</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableBody>
                                    {salary.paymentStructure?.deductions?.map((deduction: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell>{deduction.name}</TableCell>
                                            <TableCell align="right">LKR {deduction.amount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {salary.noPay?.amount > 0 && (
                                        <TableRow>
                                            <TableCell>
                                                No Pay
                                                {salary.noPay.reason && (
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        {salary.noPay.reason}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">LKR {salary.noPay.amount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )}
                                    {salary.advanceAmount > 0 && (
                                        <TableRow>
                                            <TableCell>Advance</TableCell>
                                            <TableCell align="right">LKR {salary.advanceAmount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow sx={{ backgroundColor: "error.light" }}>
                                        <TableCell>
                                            <strong>Total Deductions</strong>
                                        </TableCell>
                                        <TableCell align="right">
                                            <strong>
                                                LKR{" "}
                                                {(
                                                    (salary.paymentStructure?.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0) +
                                                    (salary.noPay?.amount || 0) +
                                                    (salary.advanceAmount || 0)
                                                ).toLocaleString()}
                                            </strong>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Grid>

            {/* Leave Deductions (if any) */}
            {salary.leaveDeductions && salary.leaveDeductions.length > 0 && (
                <Grid item xs={12}>
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="h6">
                                Leave Deductions ({salary.leaveDeductions.length})
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Leave Type</TableCell>
                                            <TableCell align="center">Days</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {salary.leaveDeductions.map((ld: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell>{ld.leaveType}</TableCell>
                                                <TableCell align="center">{ld.days}</TableCell>
                                                <TableCell align="right">LKR {ld.amount?.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ backgroundColor: "grey.100" }}>
                                            <TableCell>
                                                <strong>Total Leave Deductions</strong>
                                            </TableCell>
                                            <TableCell align="center">
                                                <strong>
                                                    {salary.leaveDeductions.reduce((sum: number, ld: any) => sum + ld.days, 0)}
                                                </strong>
                                            </TableCell>
                                            <TableCell align="right">
                                                <strong>
                                                    LKR {salary.leaveDeductions.reduce((sum: number, ld: any) => sum + ld.amount, 0).toLocaleString()}
                                                </strong>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>
                </Grid>
            )}

            {/* Attendance Details (if any) */}
            {salary.inOut && salary.inOut.length > 0 && (
                <Grid item xs={12}>
                    <Box sx={{ overflowX: "auto" }}>
                        <InOutTable
                            inOuts={salary.inOut.map((record: any, index: number) => ({
                                ...record,
                                id: index,
                                employeeName: employee?.name,
                                employeeNIC: employee?.nic,
                                basic: salary.basic,
                                divideBy: salary.divideBy,
                            }))}
                            setInOuts={() => { }}
                            fetchSalary={() => { }}
                            editable={false}
                            isDynamicHolidays={false}
                        />
                    </Box>
                </Grid>
            )}
        </>
    );
};
