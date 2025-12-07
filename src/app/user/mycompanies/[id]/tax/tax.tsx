"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  Stack,
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

  const Header = () => (
    <CardHeader
      title={
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            Tax Configuration
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
      }
    />
  );

  return (
    <Box>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        <Header />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : taxConfig ? (
            <Stack spacing={4}>
              {taxConfig.isDefault && (
                <Alert severity="info">
                  This company is using the global default tax configuration. You
                  can override it to create a company-specific configuration.
                </Alert>
              )}

              {/* General Settings Section */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  General Settings
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Tax Year
                      </Typography>
                      <Typography variant="h6">{taxConfig.year}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Annual Personal Allowance
                      </Typography>
                      <Typography variant="h6">
                        LKR{" "}
                        {taxConfig.personalAllowance.annual.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Monthly Personal Allowance
                      </Typography>
                      <Typography variant="h6">
                        LKR{" "}
                        {taxConfig.personalAllowance.monthly.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        EPF Relief Rate
                      </Typography>
                      <Typography variant="h6">
                        {(taxConfig.qualifyingPaymentRelief.epfRate * 100).toFixed(
                          1
                        )}
                        %
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Tax Slabs Section */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Tax Slabs
                </Typography>
                <TableContainer
                  component={Box}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                >
                  <Table size="medium">
                    <TableHead sx={{ bgcolor: "action.hover" }}>
                      <TableRow>
                        <TableCell width="40%">Taxable Income Range (Monthly)</TableCell>
                        <TableCell align="right" width="20%">Rate</TableCell>
                        <TableCell align="right" width="40%">Cumulative Fixed Tax</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {taxConfig.taxSlabs.map((slab, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Chip
                                label={`Tier ${index + 1}`}
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                              <Typography variant="body2">
                                LKR {slab.min?.toLocaleString()} -{" "}
                                {slab.max === Infinity
                                  ? "Unlimited"
                                  : `LKR ${slab.max?.toLocaleString()}`}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${(slab.rate * 100).toFixed(0)}%`}
                              color={slab.rate > 0 ? "error" : "success"}
                              size="small"
                              variant={slab.rate > 0 ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              LKR{" "}
                              {slab.fixedAmount?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              }) ?? "0.00"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider />

              {/* Other Information Section */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Other Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>Qualifying Payment Relief</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Max Monthly Relief: {taxConfig.qualifyingPaymentRelief.maxMonthly ? `LKR ${taxConfig.qualifyingPaymentRelief.maxMonthly.toLocaleString()}` : "Unlimited"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>Stamp Duty</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Applied if salary &gt; LKR {taxConfig.stampDuty?.threshold?.toLocaleString() ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Amount: LKR {taxConfig.stampDuty?.amount?.toLocaleString() ?? 0}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
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
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompanyTaxConfigurationPage;
