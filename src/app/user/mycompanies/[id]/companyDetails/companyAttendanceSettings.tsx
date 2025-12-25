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
    Button,
} from "@mui/material";
import { ExpandMore, Add, Delete } from "@mui/icons-material";
import { Company } from "../../clientComponents/companiesDataGrid";
import dynamic from 'next/dynamic';
import { useState } from "react";



const LocationMap = dynamic(() => import('@/app/components/maps/LocationMap'), { ssr: false });

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
    // Local state for adding a new location
    const [newLocationName, setNewLocationName] = useState("");

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
            allowedLocations: [],
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

    const handleAddLocation = () => {
        if (!config.geoFencing.latitude || !config.geoFencing.longitude) return;

        const newLocation = {
            lat: config.geoFencing.latitude,
            lng: config.geoFencing.longitude,
            radius: config.geoFencing.radiusMeters || 100,
            name: newLocationName || `Location ${config.geoFencing.allowedLocations?.length ? config.geoFencing.allowedLocations.length + 1 : 1}`
        };

        setAttendanceConfig({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                allowedLocations: [...(config.geoFencing.allowedLocations || []), newLocation]
            }
        });
        setNewLocationName("");
    };

    const handleRemoveLocation = (index: number) => {
        const updatedLocations = [...(config.geoFencing.allowedLocations || [])];
        updatedLocations.splice(index, 1);
        setAttendanceConfig({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                allowedLocations: updatedLocations
            }
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
                                                checked={config.features?.pwaCheckIn || false}
                                                onChange={handleFeatureChange("pwaCheckIn")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="PWA Check-In"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.liveDashboard || false}
                                                onChange={handleFeatureChange("liveDashboard")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Live Dashboard"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.salaryIntegration || false}
                                                onChange={handleFeatureChange("salaryIntegration")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Salary Integration"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.features?.hardwareIntegration || false}
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
                                            checked={config.allowRemoteCheckIn || false}
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
                                            checked={config.requireApproval || false}
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
                                                checked={config.geoFencing?.enabled || false}
                                                onChange={handleGeoChange("enabled")}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Enable Geofencing"
                                    />

                                    {config.geoFencing?.enabled && (
                                        <Grid container spacing={2} sx={{ mt: 1 }}>
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                    Select Office Location & Radius
                                                </Typography>
                                                <LocationMap
                                                    lat={config.geoFencing?.latitude || 0}
                                                    lng={config.geoFencing?.longitude || 0}
                                                    radius={config.geoFencing?.radiusMeters || 100}
                                                    interactive={isEditing}
                                                    onLocationSelect={(lat, lng) => {
                                                        if (!isEditing) return;
                                                        setAttendanceConfig({
                                                            ...config,
                                                            geoFencing: {
                                                                ...config.geoFencing,
                                                                latitude: lat,
                                                                longitude: lng
                                                            }
                                                        });
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label="Latitude"
                                                    type="number"
                                                    fullWidth
                                                    value={config.geoFencing?.latitude || 0}
                                                    onChange={handleGeoChange("latitude")}
                                                    disabled={!isEditing}
                                                    variant="outlined"
                                                    inputProps={{ step: "0.00001" }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label="Longitude"
                                                    type="number"
                                                    fullWidth
                                                    value={config.geoFencing?.longitude || 0}
                                                    onChange={handleGeoChange("longitude")}
                                                    disabled={!isEditing}
                                                    variant="outlined"
                                                    inputProps={{ step: "0.00001" }}
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
                                                            checked={config.geoFencing?.enforceValidation || false}
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
                    {/* Additional Allowed Locations */}
                    {config.geoFencing?.enabled && (
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                Additional Allowed Locations via Multilocation
                            </Typography>

                            {/* Location List */}
                            {config.geoFencing.allowedLocations?.map((loc, index) => (
                                <Card key={index} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            {loc.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} • {loc.radius}m
                                        </Typography>
                                    </Box>
                                    <Button
                                        color="error"
                                        size="small"
                                        onClick={() => handleRemoveLocation(index)}
                                        disabled={!isEditing}
                                    >
                                        <Delete fontSize="small" />
                                    </Button>
                                </Card>
                            ))}

                            {/* Add New Layout */}
                            <Box sx={{ mt: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Add Current Map Selection as New Location
                                </Typography>
                                <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={12} sm={8}>
                                        <TextField
                                            label="Location Name (Optional)"
                                            size="small"
                                            fullWidth
                                            value={newLocationName}
                                            onChange={(e) => setNewLocationName(e.target.value)}
                                            disabled={!isEditing}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Button
                                            variant="contained"
                                            startIcon={<Add />}
                                            onClick={handleAddLocation}
                                            disabled={!isEditing}
                                            fullWidth
                                        >
                                            Add
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};
