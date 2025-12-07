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
  CircularProgress,
  Paper,
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

interface TaxOverrideData {
  year: number;
  taxSlabs: TaxSlab[];
  personalAllowance: {
    monthly: number;
    annual: number;
  };
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  config: (TaxOverrideData & { isOverride?: boolean }) | null;
  companyId: string;
  editMode?: boolean;
}

const CompanyTaxConfigurationDialog: React.FC<Props> = ({
  open,
  onClose,
  config,
  companyId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaxOverrideData>({
    year: new Date().getFullYear(),
    taxSlabs: [],
    personalAllowance: { monthly: 0, annual: 0 },
  });

  useEffect(() => {
    if (open) {
      const initialData = config ? config : {
        year: new Date().getFullYear(),
        taxSlabs: [],
        personalAllowance: { monthly: 0, annual: 0 },
      };
      setFormData({
        year: initialData.year,
        taxSlabs: initialData.taxSlabs,
        personalAllowance: initialData.personalAllowance
      });
    }
  }, [config, open]);

  const handleAddSlab = () => {
    const lastSlab = formData.taxSlabs[formData.taxSlabs.length - 1];
    setFormData({
      ...formData,
      taxSlabs: [
        ...formData.taxSlabs,
        { min: lastSlab ? lastSlab.max : 0, max: 0, rate: 0, fixedAmount: 0 },
      ],
    });
  };

  const handleRemoveSlab = (index: number) => {
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
      const payload = {
        year: formData.year,
        companyId: companyId,
        taxSlabs: formData.taxSlabs,
        personalAllowance: formData.personalAllowance,
      };

      const response = await fetch('/api/tax-configuration', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save tax configuration");
      }

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
            Edit Company Tax Override
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

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Personal Allowance */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Personal Allowance
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
                Tax Slabs
              </Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddSlab} size="small">
                Add Slab
              </Button>
            </Box>
          </Grid>

          {formData.taxSlabs.map((slab, index) => (
            <Grid item xs={12} key={index}>
              <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2">
                    Slab {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveSlab(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Min Amount"
                      type="number"
                      value={slab.min}
                      onChange={(e) => handleSlabChange(index, "min", parseFloat(e.target.value))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Max Amount"
                      type="number"
                      value={slab.max === Infinity ? '' : slab.max}
                      onChange={(e) => handleSlabChange(index, "max", e.target.value ? parseFloat(e.target.value) : Infinity)}
                      size="small"
                      placeholder="Infinity"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Tax Rate (%)"
                      type="number"
                      value={slab.rate}
                      onChange={(e) => handleSlabChange(index, "rate", parseFloat(e.target.value))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Fixed Amount"
                      type="number"
                      value={slab.fixedAmount}
                      onChange={(e) => handleSlabChange(index, "fixedAmount", parseFloat(e.target.value))}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
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
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyTaxConfigurationDialog;
