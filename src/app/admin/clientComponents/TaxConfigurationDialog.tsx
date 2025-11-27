"use client";
import React, { useState, useEffect } from "react";
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
  Divider,
  Alert,
  FormControlLabel,
  Switch,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

interface TaxSlab {
  min: number;
  max: number;
  rate: number;
  fixedAmount: number;
}

interface TaxConfig {
  _id?: string;
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
  effectiveFrom: string;
  effectiveTo?: string;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  config: TaxConfig | null;
  editMode: boolean;
}

const TaxConfigurationDialog: React.FC<Props> = ({
  open,
  onClose,
  config,
  editMode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaxConfig>({
    year: new Date().getFullYear(),
    country: "LK",
    isDefault: true,
    taxSlabs: [
      { min: 0, max: 150000, rate: 0, fixedAmount: 0 },
      { min: 150000, max: 233333, rate: 6, fixedAmount: 0 },
      { min: 233333, max: 275000, rate: 18, fixedAmount: 0 },
      { min: 275000, max: 316667, rate: 24, fixedAmount: 0 },
      { min: 316667, max: 358333, rate: 30, fixedAmount: 0 },
      { min: 358333, max: Infinity, rate: 36, fixedAmount: 0 },
    ],
    personalAllowance: {
      monthly: 150000,
      annual: 1800000,
    },
    qualifyingPaymentRelief: {
      epfRate: 0.08,
    },
    stampDuty: {
      threshold: 50000,
      amount: 25,
    },
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (config && editMode) {
      setFormData({
        ...config,
        effectiveFrom: config.effectiveFrom.split("T")[0],
        effectiveTo: config.effectiveTo
          ? config.effectiveTo.split("T")[0]
          : undefined,
      });
    } else if (!editMode) {
      // Reset to defaults when creating new
      setFormData({
        year: new Date().getFullYear(),
        country: "LK",
        isDefault: true,
        taxSlabs: [
          { min: 0, max: 150000, rate: 0, fixedAmount: 0 },
          { min: 150000, max: 233333, rate: 6, fixedAmount: 0 },
          { min: 233333, max: 275000, rate: 18, fixedAmount: 0 },
          { min: 275000, max: 316667, rate: 24, fixedAmount: 0 },
          { min: 316667, max: 358333, rate: 30, fixedAmount: 0 },
          { min: 358333, max: Infinity, rate: 36, fixedAmount: 0 },
        ],
        personalAllowance: {
          monthly: 150000,
          annual: 1800000,
        },
        qualifyingPaymentRelief: {
          epfRate: 0.08,
        },
        stampDuty: {
          threshold: 50000,
          amount: 25,
        },
        effectiveFrom: new Date().toISOString().split("T")[0],
      });
    }
  }, [config, editMode, open]);

  const handleAddSlab = () => {
    const lastSlab = formData.taxSlabs[formData.taxSlabs.length - 1];
    setFormData({
      ...formData,
      taxSlabs: [
        ...formData.taxSlabs.slice(0, -1),
        { min: lastSlab.min, max: lastSlab.max + 50000, rate: 0, fixedAmount: 0 },
        { ...lastSlab, min: lastSlab.max + 50000 },
      ],
    });
  };

  const handleRemoveSlab = (index: number) => {
    if (formData.taxSlabs.length <= 2) {
      alert("Must have at least 2 tax slabs");
      return;
    }
    const newSlabs = formData.taxSlabs.filter((_, i) => i !== index);
    setFormData({ ...formData, taxSlabs: newSlabs });
  };

  const handleSlabChange = (
    index: number,
    field: keyof TaxSlab,
    value: number
  ) => {
    const newSlabs = [...formData.taxSlabs];
    newSlabs[index] = { ...newSlabs[index], [field]: value };
    setFormData({ ...formData, taxSlabs: newSlabs });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.year || formData.year < 2000) {
        throw new Error("Please enter a valid year");
      }

      if (formData.taxSlabs.length < 2) {
        throw new Error("Must have at least 2 tax slabs");
      }

      if (formData.personalAllowance.monthly <= 0) {
        throw new Error("Personal allowance must be greater than 0");
      }

      const url = editMode
        ? "/api/tax-configuration"
        : "/api/tax-configuration";
      const method = editMode ? "PUT" : "POST";

      const payload = editMode
        ? { ...formData, id: config?._id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save tax configuration");
      }

      alert(
        editMode
          ? "Tax configuration updated successfully"
          : "Tax configuration created successfully"
      );
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {editMode ? "Edit Tax Configuration" : "Create Tax Configuration"}
          </Typography>
          <IconButton onClick={() => onClose()} size="small">
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
          {/* Basic Info */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Basic Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Year"
              type="number"
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: parseInt(e.target.value) })
              }
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
              select
              required
            >
              <MenuItem value="LK">Sri Lanka</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                />
              }
              label="Global Default Configuration (applies to all companies)"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Personal Allowance */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Personal Allowance (Tax-Free Threshold)
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Monthly Personal Allowance"
              type="number"
              value={formData.personalAllowance.monthly}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  personalAllowance: {
                    ...formData.personalAllowance,
                    monthly: parseFloat(e.target.value),
                  },
                })
              }
              helperText="Rs. 150,000 for 2025"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Annual Personal Allowance"
              type="number"
              value={formData.personalAllowance.annual}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  personalAllowance: {
                    ...formData.personalAllowance,
                    annual: parseFloat(e.target.value),
                  },
                })
              }
              helperText="Rs. 1,800,000 for 2025"
              required
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Tax Slabs */}
          <Grid item xs={12}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Tax Slabs (Progressive Taxation)
              </Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddSlab} size="small">
                Add Slab
              </Button>
            </Box>
          </Grid>

          {formData.taxSlabs.map((slab, index) => (
            <Grid item xs={12} key={index}>
              <Paper
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="subtitle2">
                    Slab {index + 1}
                  </Typography>
                  {formData.taxSlabs.length > 2 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveSlab(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Min Amount"
                      type="number"
                      value={slab.min}
                      onChange={(e) =>
                        handleSlabChange(index, "min", parseFloat(e.target.value))
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Max Amount"
                      type="number"
                      value={slab.max === Infinity ? 999999999 : slab.max}
                      onChange={(e) =>
                        handleSlabChange(
                          index,
                          "max",
                          parseFloat(e.target.value) === 999999999
                            ? Infinity
                            : parseFloat(e.target.value)
                        )
                      }
                      size="small"
                      helperText={slab.max === Infinity ? "Infinity" : ""}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Tax Rate (%)"
                      type="number"
                      value={slab.rate}
                      onChange={(e) =>
                        handleSlabChange(index, "rate", parseFloat(e.target.value))
                      }
                      size="small"
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Fixed Amount"
                      type="number"
                      value={slab.fixedAmount}
                      onChange={(e) =>
                        handleSlabChange(
                          index,
                          "fixedAmount",
                          parseFloat(e.target.value)
                        )
                      }
                      size="small"
                      disabled
                      helperText="Usually 0"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* EPF */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              EPF (Employee Provident Fund)
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="EPF Employee Rate"
              type="number"
              value={formData.qualifyingPaymentRelief.epfRate * 100}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  qualifyingPaymentRelief: {
                    ...formData.qualifyingPaymentRelief,
                    epfRate: parseFloat(e.target.value) / 100,
                  },
                })
              }
              helperText="8% standard rate"
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              InputProps={{ endAdornment: "%" }}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Stamp Duty */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Stamp Duty
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Threshold Amount"
              type="number"
              value={formData.stampDuty.threshold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stampDuty: {
                    ...formData.stampDuty,
                    threshold: parseFloat(e.target.value),
                  },
                })
              }
              helperText="Rs. 50,000 standard"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Stamp Duty Amount"
              type="number"
              value={formData.stampDuty.amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stampDuty: {
                    ...formData.stampDuty,
                    amount: parseFloat(e.target.value),
                  },
                })
              }
              helperText="Rs. 25 standard"
              required
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Effective Dates */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Effective Period
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Effective From"
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) =>
                setFormData({ ...formData, effectiveFrom: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Effective To (Optional)"
              type="date"
              value={formData.effectiveTo || ""}
              onChange={(e) =>
                setFormData({ ...formData, effectiveTo: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty for indefinite"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose()} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {editMode ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add Paper import
import { Paper } from "@mui/material";

export default TaxConfigurationDialog;
