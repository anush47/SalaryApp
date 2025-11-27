"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

interface TaxConfig {
  _id: string;
  year: number;
  country: string;
  companyId?: string;
  isDefault: boolean;
  taxSlabs: {
    min: number;
    max: number;
    rate: number;
  }[];
  personalAllowance: {
    monthly: number;
    annual: number;
  };
  qualifyingPaymentRelief: {
    epfRate: number;
  };
  stampDuty: {
    threshold: number;
    amount: number;
  };
  isActive: boolean;
  effectiveFrom: string;
}

interface Props {
  companyId?: string;
}

const CompanyTaxSettings: React.FC<Props> = ({ companyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [configSource, setConfigSource] = useState<"global-default" | "company-specific" | null>(null);
  const [openCalculator, setOpenCalculator] = useState(false);

  // Tax calculator state
  const [calcSalary, setCalcSalary] = useState(200000);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    fetchTaxConfiguration();
  }, [companyId]);

  const fetchTaxConfiguration = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = companyId
        ? `/api/tax-configuration?companyId=${companyId}`
        : `/api/tax-configuration`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tax configuration");
      }

      setTaxConfig(data.taxConfiguration);
      setConfigSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalcLoading(true);
    try {
      const response = await fetch("/api/tax-configuration/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlySalary: calcSalary,
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to calculate tax");
      }

      setCalcResult(data.taxCalculation);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setCalcLoading(false);
    }
  };

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
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!taxConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No tax configuration found. Please contact administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Tax Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage tax configuration for your company
        </Typography>
      </Box>

      {/* Status Alert */}
      <Alert
        severity={configSource === "company-specific" ? "success" : "info"}
        icon={<InfoIcon />}
        sx={{ mb: 3 }}
      >
        {configSource === "company-specific" ? (
          <>
            <strong>Company-Specific Tax Configuration</strong>
            <br />
            This company has a custom tax configuration that overrides the global default.
          </>
        ) : (
          <>
            <strong>Using Global Default Tax Configuration</strong>
            <br />
            This company is using the system-wide default tax settings. Contact admin
            to create a company-specific configuration if needed.
          </>
        )}
      </Alert>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            startIcon={<CalculateIcon />}
            onClick={() => setOpenCalculator(true)}
            fullWidth
          >
            Tax Calculator
          </Button>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="outlined"
            startIcon={<InfoIcon />}
            fullWidth
            onClick={() =>
              alert(
                "To create or modify company-specific tax configurations, please contact your system administrator."
              )
            }
          >
            Request Custom Config
          </Button>
        </Grid>
      </Grid>

      {/* Tax Configuration Details */}
      <Grid container spacing={3}>
        {/* Personal Allowance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Personal Allowance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Monthly</TableCell>
                    <TableCell align="right">
                      <Typography variant="h6">
                        {formatCurrency(taxConfig?.personalAllowance?.monthly)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Annual</TableCell>
                    <TableCell align="right">
                      <Typography variant="body1">
                        {formatCurrency(taxConfig?.personalAllowance?.annual)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* EPF & Stamp Duty */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deductions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>EPF (Employee)</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${((taxConfig?.qualifyingPaymentRelief?.epfRate || 0) * 100).toFixed(0)}%`}
                        color="primary"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Stamp Duty</TableCell>
                    <TableCell align="right">
                      {formatCurrency(taxConfig?.stampDuty?.amount)}
                      <Typography variant="caption" display="block">
                        (if salary ≥ {formatCurrency(taxConfig?.stampDuty?.threshold)})
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Tax Slabs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Progressive Tax Slabs (Monthly)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table>
                  <TableBody>
                    {(taxConfig?.taxSlabs || []).map((slab, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={`Slab ${index + 1}`} size="small" />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(slab?.min)} -{" "}
                          {slab?.max === Infinity ? "Above" : formatCurrency(slab?.max)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${slab?.rate || 0}%`}
                            color={(slab?.rate || 0) === 0 ? "default" : "primary"}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Effective Period */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Year
                  </Typography>
                  <Typography variant="body1">{taxConfig?.year || "N/A"}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Country
                  </Typography>
                  <Typography variant="body1">{taxConfig?.country || "N/A"}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Effective From
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(taxConfig?.effectiveFrom)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={taxConfig?.isActive ? "Active" : "Inactive"}
                    color={taxConfig?.isActive ? "success" : "default"}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tax Calculator Dialog */}
      <Dialog open={openCalculator} onClose={() => setOpenCalculator(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Quick Tax Calculator</Typography>
            <IconButton onClick={() => setOpenCalculator(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enter a monthly salary to see the tax breakdown
            </Typography>
            <input
              type="number"
              value={calcSalary}
              onChange={(e) => setCalcSalary(parseFloat(e.target.value))}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginTop: "8px",
                marginBottom: "16px",
              }}
              placeholder="Enter salary amount"
            />
            <Button
              variant="contained"
              onClick={handleCalculate}
              disabled={calcLoading}
              fullWidth
            >
              {calcLoading ? <CircularProgress size={24} /> : "Calculate"}
            </Button>

            {calcResult && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Gross Salary</TableCell>
                        <TableCell align="right">
                          {formatCurrency(calcResult?.grossSalary)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>EPF 8%</TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          -{formatCurrency(calcResult?.epfEmployee?.amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>APIT Tax</TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          -{formatCurrency(calcResult?.apit?.amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Stamp Duty</TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          -{formatCurrency(calcResult?.stampDuty?.amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: "primary.light" }}>
                        <TableCell>
                          <strong>Net Salary</strong>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" fontWeight="bold">
                            {formatCurrency(calcResult?.netSalary)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCalculator(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyTaxSettings;
