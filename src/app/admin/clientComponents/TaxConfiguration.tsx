"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Calculate as CalculateIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import TaxConfigurationDialog from "./TaxConfigurationDialog";
import TaxCalculatorDialog from "./TaxCalculatorDialog";
import TaxDetailsDialog from "./TaxDetailsDialog";

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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tax-tabpanel-${index}`}
      aria-labelledby={`tax-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TaxConfiguration: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCalculator, setOpenCalculator] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<TaxConfig | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchTaxConfigurations();
  }, []);

  const fetchTaxConfigurations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tax-configuration");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tax configurations");
      }

      // Fetch all configurations (not just one)
      // Since the current API returns single config, let's create a proper list endpoint call
      setTaxConfigs(data.taxConfiguration ? [data.taxConfiguration] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedConfig(null);
    setEditMode(false);
    setOpenDialog(true);
  };

  const handleEdit = (config: TaxConfig) => {
    setSelectedConfig(config);
    setEditMode(true);
    setOpenDialog(true);
  };

  const handleView = (config: TaxConfig) => {
    setSelectedConfig(config);
    setOpenDetails(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this tax configuration?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-configuration?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete tax configuration");
      }

      alert("Tax configuration deactivated successfully");
      fetchTaxConfigurations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setOpenDialog(false);
    setSelectedConfig(null);
    setEditMode(false);
    if (refresh) {
      fetchTaxConfigurations();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  // Filter configs by type
  const defaultConfigs = taxConfigs.filter((c) => c.isDefault && !c.companyId);
  const companyConfigs = taxConfigs.filter((c) => !c.isDefault && c.companyId);

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          Tax Configuration Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={() => setOpenCalculator(true)}
          >
            Tax Calculator
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTaxConfigurations}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Create Tax Config
          </Button>
        </Box>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3, bgcolor: "info.light", color: "info.contrastText" }}>
        <CardContent>
          <Typography variant="body1" gutterBottom>
            <strong>Tax Configuration System</strong>
          </Typography>
          <Typography variant="body2">
            Manage Sri Lankan APIT (Advance Personal Income Tax) configurations.
            Default configurations apply to all companies, while company-specific
            configurations override the default for that company.
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Global Default" />
          <Tab label="Company-Specific" />
          <Tab label="Statistics" />
        </Tabs>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tab Panels */}
      {!loading && (
        <>
          {/* Global Default Tab */}
          <TabPanel value={tabValue} index={0}>
            {defaultConfigs.length === 0 ? (
              <Paper sx={{ p: 5, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Default Tax Configuration Found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create a default tax configuration to apply across all companies
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreate}
                >
                  Create Default Config
                </Button>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Year</TableCell>
                      <TableCell>Personal Allowance</TableCell>
                      <TableCell>Tax Slabs</TableCell>
                      <TableCell>EPF Rate</TableCell>
                      <TableCell>Stamp Duty</TableCell>
                      <TableCell>Effective From</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {defaultConfigs.map((config) => (
                      <TableRow key={config._id}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            {config.year}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(config.personalAllowance.monthly)}/month
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(config.personalAllowance.annual)}/year
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${config.taxSlabs.length} slabs`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {(config.qualifyingPaymentRelief.epfRate * 100).toFixed(
                            0
                          )}
                          %
                        </TableCell>
                        <TableCell>
                          {formatCurrency(config.stampDuty.amount)}
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            (if &ge; {formatCurrency(config.stampDuty.threshold)})
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(config.effectiveFrom)}</TableCell>
                        <TableCell>
                          <Chip
                            label={config.isActive ? "Active" : "Inactive"}
                            color={config.isActive ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleView(config)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(config)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deactivate">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(config._id)}
                              disabled={!config.isActive}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Company-Specific Tab */}
          <TabPanel value={tabValue} index={1}>
            {companyConfigs.length === 0 ? (
              <Paper sx={{ p: 5, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Company-Specific Configurations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Companies are currently using the default tax configuration
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Company</TableCell>
                      <TableCell>Year</TableCell>
                      <TableCell>Personal Allowance</TableCell>
                      <TableCell>Tax Slabs</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {companyConfigs.map((config) => (
                      <TableRow key={config._id}>
                        <TableCell>{config.companyId}</TableCell>
                        <TableCell>{config.year}</TableCell>
                        <TableCell>
                          {formatCurrency(config.personalAllowance.monthly)}/mo
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${config.taxSlabs.length} slabs`}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={config.isActive ? "Active" : "Inactive"}
                            color={config.isActive ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleView(config)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(config)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(config._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Statistics Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Configurations
                    </Typography>
                    <Typography variant="h3">{taxConfigs.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Active Configurations
                    </Typography>
                    <Typography variant="h3">
                      {taxConfigs.filter((c) => c.isActive).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Company-Specific
                    </Typography>
                    <Typography variant="h3">
                      {companyConfigs.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}

      {/* Dialogs */}
      <TaxConfigurationDialog
        open={openDialog}
        onClose={handleDialogClose}
        config={selectedConfig}
        editMode={editMode}
      />

      <TaxCalculatorDialog
        open={openCalculator}
        onClose={() => setOpenCalculator(false)}
      />

      {selectedConfig && (
        <TaxDetailsDialog
          open={openDetails}
          onClose={() => setOpenDetails(false)}
          config={selectedConfig}
        />
      )}
    </Box>
  );
};

export default TaxConfiguration;
