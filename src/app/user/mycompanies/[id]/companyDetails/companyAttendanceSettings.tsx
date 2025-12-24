import React from "react";
import {
    Box,
    Card,
    Checkbox,
    FormControl,
    FormControlLabel,
    Grid,
    TextField,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { Company } from "../../clientComponents/companiesDataGrid";

interface CompanyAttendanceSettingsProps {
    isEditing: boolean;
    attendanceConfig: Company["attendanceConfig"];
    setAttendanceConfig: (config: Company["attendanceConfig"]) => void;
}

export const CompanyAttendanceSettings: React.FC<CompanyAttendanceSettingsProps> = ({
    isEditing,
    attendanceConfig,
    setAttendanceConfig,
}) => {
    // Ensure we have default values if undefined
    const config = attendanceConfig || {
        enabled: false,
        features: {
            pwaCheckIn: false,
            hardwareIntegration: false,
            liveDashboard: false,
            salaryIntegration: false,
        },
        geoFencing: {
            enabled: false,
            latitude: 0,
            longitude: 0,
            radiusMeters: 100,
            enforceValidation: false,
        },
        allowRemoteCheckIn: false,
        requireApproval: false,
    };

    const handleToggleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAttendanceConfig({
            ...config,
            enabled: e.target.checked,
        });
    };

    const handleFeatureChange = (feature: keyof typeof config.features) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setAttendanceConfig({
            ...config,
            features: {
                ...config.features,
                [feature]: e.target.checked,
            },
        });
    };

    const handleGeoChange = (field: keyof typeof config.geoFencing) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value =
            field === "enabled" || field === "enforceValidation"
                ? e.target.checked
                : parseFloat(e.target.value);

        setAttendanceConfig({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                [field]: value,
            },
        });
    };

    const handleRemoteCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAttendanceConfig({
            ...config,
            allowRemoteCheckIn: e.target.checked,
        });
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAttendanceConfig({
            ...config,
            apiKey: e.target.value,
        });
    };

    const handleRequireApprovalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAttendanceConfig({
            ...config,
            requireApproval: e.target.checked,
        });
    };


    return (
        <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h5">Attendance Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container spacing={2}>
                    {/* Main Enable Toggle */}
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={config.enabled}
                                    onChange={handleToggleEnable}
                                    disabled={!isEditing}
                                    color="primary"
                                />
                            }
                            label={
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Enable Attendance System
                                </Typography>
                            }
                        />
                    </Grid>

                    {config.enabled && (
                        <>
                            {/* Features Section */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                    Features
                                </Typography>
                                <Box display="flex" gap={3} flexWrap="wrap">
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.pwaCheckIn}
                                                onChange={handleFeatureChange("pwaCheckIn")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="PWA Check-In"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.liveDashboard}
                                                onChange={handleFeatureChange("liveDashboard")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Live Dashboard"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.salaryIntegration}
                                                onChange={handleFeatureChange("salaryIntegration")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Salary Integration"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.hardwareIntegration}
                                                onChange={handleFeatureChange("hardwareIntegration")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Hardware Integration"
                                    />
                                </Box>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={config.allowRemoteCheckIn}
                                            onChange={handleRemoteCheckInChange}
                                            disabled={!isEditing}
                                        />
                                    }
                                    label="Allow Remote Check-In (No Geofencing)"
                                    sx={{ mt: 1, display: 'block' }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={config.requireApproval}
                                            onChange={handleRequireApprovalChange}
                                            disabled={!isEditing}
                                        />
                                    }
                                    label="Require Mandatory Approval for All Check-Ins"
                                    sx={{ mt: 1, display: 'block' }}
                                />
                            </Grid>

                            {/* API Key for Hardware Integration - Only show if Hardware Integration is enabled */}
                            {config.features?.hardwareIntegration && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="API Key (Hardware Integration)"
                                        value={config.apiKey || ''}
                                        onChange={handleApiKeyChange}
                                        disabled={!isEditing}
                                        helperText="Key for external devices to sync attendance"
                                        variant="filled"
                                    />
                                </Grid>
                            )}


                            {/* Geofencing Section */}
                            {!config.allowRemoteCheckIn && (
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                        Geofencing Setup
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.geoFencing?.enabled}
                                                onChange={handleGeoChange("enabled")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Enable Geofencing"
                                    />

                                    {config.geoFencing?.enabled && (
                                        <Grid container spacing={2} sx={{ mt: 1 }}>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label="Latitude"
                                                    type="number"
                                                    fullWidth
                                                    value={config.geoFencing?.latitude}
                                                    onChange={handleGeoChange("latitude")}
                                                    disabled={!isEditing}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label="Longitude"
                                                    type="number"
                                                    fullWidth
                                                    value={config.geoFencing?.longitude}
                                                    onChange={handleGeoChange("longitude")}
                                                    disabled={!isEditing}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label="Radius (Meters)"
                                                    type="number"
                                                    fullWidth
                                                    value={config.geoFencing?.radiusMeters}
                                                    onChange={handleGeoChange("radiusMeters")}
                                                    disabled={!isEditing}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={config.geoFencing?.enforceValidation}
                                                            onChange={handleGeoChange("enforceValidation")}
                                                            disabled={!isEditing}
                                                        />
                                                    }
                                                    label="Strictly Enforce Location (Block check-in if valid)"
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};
