"use client";
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Paper,
  Divider,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

interface TaxSlab {
  min: number;
  max: number;
  rate: number;
  fixedAmount: number;
}

interface TaxConfig {
  _id: string;
  year: number;
  country: string;
  companyId?: string;
  isDefault: boolean;
  taxSlabs: TaxSlab[];
  personalAllowance: {
    monthly: number;
    annual: number;
  };
  qualifyingPaymentRelief: {
    epfRate: number;
    maxMonthly?: number;
  };
  stampDuty: {
    threshold: number;
    amount: number;
  };
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  config: TaxConfig;
}

const TaxDetailsDialog: React.FC<Props> = ({ open, onClose, config }) => {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "Rs. 0";
    }
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Tax Configuration Details</Typography>
            <Typography variant="caption" color="text.secondary">
              Year: {config.year} | {config.country}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Status */}
          <Grid item xs={12}>
            <Box display="flex" gap={1}>
              <Chip
                label={config.isActive ? "Active" : "Inactive"}
                color={config.isActive ? "success" : "default"}
              />
              <Chip
                label={config.isDefault ? "Global Default" : "Company-Specific"}
                color={config.isDefault ? "primary" : "secondary"}
              />
            </Box>
          </Grid>

          {/* Personal Allowance */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Personal Allowance (Tax-Free Threshold)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Monthly
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(config.personalAllowance.monthly)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Annual
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(config.personalAllowance.annual)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Tax Slabs */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Progressive Tax Slabs
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Slab</TableCell>
                    <TableCell>Income Range (Monthly)</TableCell>
                    <TableCell align="center">Tax Rate</TableCell>
                    <TableCell align="right">Fixed Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {config.taxSlabs.map((slab, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={`Slab ${index + 1}`} size="small" />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(slab.min)} -{" "}
                        {slab.max === Infinity ? "Above" : formatCurrency(slab.max)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${slab.rate}%`}
                          color={slab.rate === 0 ? "default" : "primary"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(slab.fixedAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* EPF & Stamp Duty */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                EPF (Employee Provident Fund)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Employee Contribution Rate
              </Typography>
              <Typography variant="h5">
                {(config.qualifyingPaymentRelief.epfRate * 100).toFixed(1)}%
              </Typography>
              {config.qualifyingPaymentRelief.maxMonthly && (
                <Typography variant="caption" color="text.secondary">
                  Max Monthly: {formatCurrency(config.qualifyingPaymentRelief.maxMonthly)}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Stamp Duty
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Amount
              </Typography>
              <Typography variant="h5">
                {formatCurrency(config.stampDuty.amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Applied if salary ≥ {formatCurrency(config.stampDuty.threshold)}
              </Typography>
            </Paper>
          </Grid>

          {/* Effective Period */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Effective Period
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Effective From
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(config.effectiveFrom)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Effective To
                  </Typography>
                  <Typography variant="body1">
                    {config.effectiveTo ? formatDate(config.effectiveTo) : "Indefinite"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Metadata */}
          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              <strong>Created:</strong> {formatDate(config.createdAt)}
              <br />
              <strong>Last Updated:</strong> {formatDate(config.updatedAt)}
              <br />
              <strong>Configuration ID:</strong> {config._id}
            </Typography>
          </Grid>

          {/* Example Calculation */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Example Tax Calculation (Rs. 300,000 salary)
            </Typography>
            <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Gross Salary</TableCell>
                    <TableCell align="right">Rs. 300,000</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>EPF 8%</TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      -Rs. 24,000
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Taxable Income</TableCell>
                    <TableCell align="right">Rs. 276,000</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4, fontSize: "0.875rem" }}>
                      0% on first Rs. 150,000
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.875rem" }}>
                      Rs. 0
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4, fontSize: "0.875rem" }}>
                      6% on next Rs. 83,333
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.875rem" }}>
                      Rs. 5,000
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4, fontSize: "0.875rem" }}>
                      18% on next Rs. 41,667
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.875rem" }}>
                      Rs. 7,500
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4, fontSize: "0.875rem" }}>
                      24% on Rs. 1,000
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.875rem" }}>
                      Rs. 240
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Total APIT</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Rs. 12,740</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Stamp Duty</TableCell>
                    <TableCell align="right">Rs. 25</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: "primary.light" }}>
                    <TableCell>
                      <strong>Net Salary</strong>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight="bold">
                        Rs. 263,235
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaxDetailsDialog;
