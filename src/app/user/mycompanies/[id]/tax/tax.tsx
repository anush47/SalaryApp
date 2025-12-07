"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import {
  Edit as EditIcon,
  Restore as RestoreIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import CompanyTaxConfigurationDialog from "./CompanyTaxConfigurationDialog";

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
  isOverride?: boolean;
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

const CompanyTaxConfigurationPage: React.FC<{ companyId: string, user: any }> = ({
  companyId,
}) => {
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchTaxConfiguration();
    }
  }, [companyId]);

  const fetchTaxConfiguration = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/tax-configuration?companyId=${companyId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tax configuration");
      }

      setTaxConfig(data.taxConfiguration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!taxConfig || !taxConfig.isOverride) return;
    if (!confirm("Are you sure you want to reset to the global default tax configuration? This will permanently delete your custom override.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/tax-configuration?companyId=${companyId}&year=${taxConfig.year}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset tax configuration");
      }

      await fetchTaxConfiguration();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (isEditMode: boolean) => {
    setEditMode(isEditMode);
    setDialogOpen(true);
  };

  const handleCloseDialog = (refresh?: boolean) => {
    setDialogOpen(false);
    if (refresh) {
      fetchTaxConfiguration();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }} >
        <Typography variant="h4">Tax Configuration</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {taxConfig?.isDefault ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog(false)}
            >
              Override and Customize
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleOpenDialog(true)}
              >
                Edit Override
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<RestoreIcon />}
                onClick={handleResetToDefault}
                disabled={loading}
              >
                Reset to Global Default
              </Button>
            </>
          )}
        </Box>
      </Box>

      {taxConfig ? (
        <>
          {taxConfig.isDefault && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This company is using the global default tax configuration. You can override it to create a company-specific configuration.
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><Typography><strong>Year:</strong> {taxConfig.year}</Typography></Grid>
            <Grid item xs={12} sm={6}><Typography><strong>Annual Personal Allowance:</strong> LKR {taxConfig.personalAllowance.annual.toLocaleString()}</Typography></Grid>
            <Grid item xs={12}>
              <Typography variant="h6">Tax Slabs</Typography>
              <ul>
                {taxConfig.taxSlabs.map((slab, index) => (
                  <li key={index}>
                    LKR {slab.min?.toLocaleString() ?? 0} - {slab.max === Infinity ? 'Above' : `LKR ${slab.max?.toLocaleString() ?? 0}`} @ {(slab.rate * 100)}% + LKR {slab.fixedAmount?.toLocaleString() ?? 0}
                  </li>
                ))}
              </ul>
            </Grid>
          </Grid>
        </>
      ) : (
        <Typography>No tax configuration found.</Typography>
      )}

      <CompanyTaxConfigurationDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        config={taxConfig}
        companyId={companyId}
        editMode={editMode}
      />
    </Paper>
  );
};

export default CompanyTaxConfigurationPage;
