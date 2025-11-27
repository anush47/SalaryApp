"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  IconButton,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Calculate as CalculateIcon,
} from "@mui/icons-material";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId?: string;
}

interface TaxResult {
  grossSalary: number;
  totalEarnings: number;
  epfEmployee: { amount: number; percentage: number };
  taxableIncome: number;
  incomeAfterAllowance: number;
  apit: {
    amount: number;
    breakdown: {
      slab: string;
      rate: number;
      taxableAmount: number;
      taxAmount: number;
    }[];
  };
  stampDuty: { amount: number };
  totalTax: number;
  netSalary: number;
}

const TaxCalculatorDialog: React.FC<Props> = ({ open, onClose, companyId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TaxResult | null>(null);

  const [formData, setFormData] = useState({
    basic: 200000,
    holidayPay: 0,
    ot: 0,
    transport: 0,
    meal: 0,
  });

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const additions = [];
      if (formData.transport > 0) {
        additions.push({
          name: "Transport Allowance",
          amount: formData.transport,
          affectTotalEarnings: true,
        });
      }
      if (formData.meal > 0) {
        additions.push({
          name: "Meal Allowance",
          amount: formData.meal,
          affectTotalEarnings: true,
        });
      }

      const payload = {
        basic: formData.basic,
        holidayPay: formData.holidayPay,
        additions,
        ot: formData.ot,
        companyId,
      };

      const response = await fetch("/api/tax-configuration/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to calculate tax");
      }

      setResult(data.taxCalculation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "Rs. 0.00";
    }
    return `Rs. ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Tax Calculator</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Input Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Salary Components
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Basic Salary"
              type="number"
              value={formData.basic}
              onChange={(e) =>
                setFormData({ ...formData, basic: parseFloat(e.target.value) })
              }
              InputProps={{ startAdornment: "Rs. " }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Holiday Pay"
              type="number"
              value={formData.holidayPay}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  holidayPay: parseFloat(e.target.value),
                })
              }
              InputProps={{ startAdornment: "Rs. " }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Overtime (OT)"
              type="number"
              value={formData.ot}
              onChange={(e) =>
                setFormData({ ...formData, ot: parseFloat(e.target.value) })
              }
              InputProps={{ startAdornment: "Rs. " }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Transport Allowance"
              type="number"
              value={formData.transport}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  transport: parseFloat(e.target.value),
                })
              }
              InputProps={{ startAdornment: "Rs. " }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Meal Allowance"
              type="number"
              value={formData.meal}
              onChange={(e) =>
                setFormData({ ...formData, meal: parseFloat(e.target.value) })
              }
              InputProps={{ startAdornment: "Rs. " }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              startIcon={
                loading ? <CircularProgress size={20} /> : <CalculateIcon />
              }
              onClick={handleCalculate}
              disabled={loading}
              size="large"
            >
              Calculate Tax
            </Button>
          </Grid>

          {/* Results Section */}
          {result && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Tax Calculation Results
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: "primary.light" }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="h6">Net Salary</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatCurrency(result.netSalary)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <strong>Gross Salary</strong>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(result.grossSalary)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <strong>Total Earnings</strong>
                          <Typography variant="caption" display="block">
                            (includes OT and allowances)
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(result.totalEarnings)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <strong>EPF 8%</strong>
                          <Typography variant="caption" display="block">
                            Employee contribution
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          -{formatCurrency(result.epfEmployee.amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <strong>Taxable Income</strong>
                          <Typography variant="caption" display="block">
                            After EPF deduction
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(result.taxableIncome)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Tax Breakdown */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  APIT Tax Breakdown (Progressive)
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableBody>
                      {result.apit.breakdown.map((slab, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">{slab.slab}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${slab.rate}%`} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(slab.taxableAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(slab.taxAmount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3}>
                          <strong>Total APIT</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(result.apit.amount)}</strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3}>
                          <strong>Stamp Duty</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(result.stampDuty.amount)}</strong>
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: "warning.light" }}>
                        <TableCell colSpan={3}>
                          <strong>Total Tax</strong>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" fontWeight="bold">
                            {formatCurrency(result.totalTax)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Effective Tax Rate:</strong>{" "}
                    {((result.totalTax / result.totalEarnings) * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="caption" display="block">
                    This calculation uses the current active tax configuration for{" "}
                    {companyId ? "your company" : "the global default"}.
                  </Typography>
                </Alert>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

import { TableContainer } from "@mui/material";

export default TaxCalculatorDialog;
