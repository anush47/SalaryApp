import React from "react";
import {
    Box,
    Checkbox,
    FormControlLabel,
    Grid,
    TextField,
    Typography,
    IconButton,
    Button,
    Card,
    CardContent,
    Alert,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

interface AttendanceOverrides {
    enabled: boolean;
    features?: {
        pwaCheckIn: boolean;
        hardwareIntegration: boolean;
        liveDashboard: boolean;
        salaryIntegration: boolean;
    };
    geoFencing?: {
        enabled: boolean;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        enforceValidation: boolean;
    };
    allowRemoteCheckIn: boolean;
    requireApproval: boolean;
    isRemote: boolean;
    allowedLocations: {
        lat: number;
        lng: number;
        radius: number;
        name: string;
        _id?: string;
    }[];
}

interface EmployeeAttendanceOverridesProps {
    isEditing: boolean;
    attendanceOverrideEnabled: boolean;
    onToggleOverride: (enabled: boolean) => void;
    attendanceOverrides: AttendanceOverrides;
    onUpdateOverrides: (overrides: AttendanceOverrides) => void;
}

export const EmployeeAttendanceOverrides: React.FC<EmployeeAttendanceOverridesProps> = ({
    isEditing,
    attendanceOverrideEnabled,
    onToggleOverride,
    attendanceOverrides,
    onUpdateOverrides,
}) => {
    // Safe defaults
    const config = attendanceOverrides || {
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
        isRemote: false,
        allowedLocations: [],
    };

    const handleChange = (field: keyof AttendanceOverrides, value: any) => {
        onUpdateOverrides({
            ...config,
            [field]: value,
        });
    };

    const handleFeatureChange = (feature: keyof NonNullable<typeof config.features>) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        onUpdateOverrides({
            ...config,
            features: {
                ...(config.features || {
                    pwaCheckIn: false,
                    hardwareIntegration: false,
                    liveDashboard: false,
                    salaryIntegration: false,
                }),
                [feature]: e.target.checked,
            },
        });
    };

    const handleGeoChange = (field: keyof NonNullable<typeof config.geoFencing>) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value =
            field === "enabled" || field === "enforceValidation"
                ? e.target.checked
                : parseFloat(e.target.value);

        onUpdateOverrides({
            ...config,
            geoFencing: {
                ...(config.geoFencing || {
                    enabled: false,
                    latitude: 0,
                    longitude: 0,
                    radiusMeters: 100,
                    enforceValidation: false,
                }),
                [field]: value,
            },
        });
    };

    // Location List Handlers
    const handleLocationChange = (
        index: number,
        field: keyof AttendanceOverrides["allowedLocations"][0],
        value: any
    ) => {
        const newLocations = [...(config.allowedLocations || [])];
        newLocations[index] = {
            ...newLocations[index],
            [field]: value,
        };
        onUpdateOverrides({
            ...config,
            allowedLocations: newLocations,
        });
    };

    const addLocation = () => {
        const newLocations = [
            ...(config.allowedLocations || []),
            { name: "New Location", lat: 0, lng: 0, radius: 100 },
        ];
        onUpdateOverrides({
            ...config,
            allowedLocations: newLocations,
        });
    };

    const removeLocation = (index: number) => {
        const newLocations = [...(config.allowedLocations || [])];
        newLocations.splice(index, 1);
        onUpdateOverrides({
            ...config,
            allowedLocations: newLocations,
        });
    };


    return (
        <Box sx={{ width: "100%" }}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={attendanceOverrideEnabled}
                                onChange={(e) => onToggleOverride(e.target.checked)}
                                disabled={!isEditing}
                                color="secondary"
                            />
                        }
                        label={
                            <Typography variant="subtitle1" fontWeight="bold">
                                Override Company Attendance Settings
                            </Typography>
                        }
                    />
                </Grid>

                {!attendanceOverrideEnabled && (
                    <Grid item xs={12}>
                        <Alert severity="info">
                            This employee uses the default Company Attendance Configuration. Enable override to customize.
                        </Alert>
                    </Grid>
                )}

                {attendanceOverrideEnabled && (
                    <>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Custom Attendance Configuration
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={config.enabled}
                                        onChange={(e) => handleChange("enabled", e.target.checked)}
                                        disabled={!isEditing}
                                        color="primary"
                                    />
                                }
                                label="Enable Attendance for this Employee"
                            />
                        </Grid>

                        {config.enabled && (
                            <>
                                {/* Features */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Feature Toggles</Typography>
                                    <Box display="flex" gap={2} flexWrap="wrap">
                                        <FormControlLabel
                                            control={<Checkbox checked={config.features?.pwaCheckIn} onChange={handleFeatureChange("pwaCheckIn")} disabled={!isEditing} />}
                                            label="PWA Check-In"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox checked={config.features?.liveDashboard} onChange={handleFeatureChange("liveDashboard")} disabled={!isEditing} />}
                                            label="Live Dashboard"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox checked={config.features?.salaryIntegration} onChange={handleFeatureChange("salaryIntegration")} disabled={!isEditing} />}
                                            label="Salary Integration"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox checked={config.features?.hardwareIntegration} onChange={handleFeatureChange("hardwareIntegration")} disabled={!isEditing} />}
                                            label="Hardware Integration"
                                        />
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.allowRemoteCheckIn}
                                                onChange={(e) => handleChange("allowRemoteCheckIn", e.target.checked)}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Allow Remote Check-In (Disables Geofencing)"
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={config.requireApproval}
                                                onChange={(e) => handleChange("requireApproval", e.target.checked)}
                                                disabled={!isEditing}
                                            />
                                        }
                                        label="Require Mandatory Approval for this Employee"
                                    />
                                </Grid>

                                {/* Geofencing */}
                                {!config.allowRemoteCheckIn && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Geofencing Defaults (Primary Location)</Typography>
                                        <FormControlLabel
                                            control={<Checkbox checked={config.geoFencing?.enabled} onChange={handleGeoChange("enabled")} disabled={!isEditing} />}
                                            label="Enable Geofencing"
                                        />
                                        {config.geoFencing?.enabled && (
                                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                                <Grid item xs={12} sm={4}>
                                                    <TextField
                                                        label="Latitude" type="number" fullWidth
                                                        value={config.geoFencing?.latitude} onChange={handleGeoChange("latitude")}
                                                        disabled={!isEditing} size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <TextField
                                                        label="Longitude" type="number" fullWidth
                                                        value={config.geoFencing?.longitude} onChange={handleGeoChange("longitude")}
                                                        disabled={!isEditing} size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <TextField
                                                        label="Radius (m)" type="number" fullWidth
                                                        value={config.geoFencing?.radiusMeters} onChange={handleGeoChange("radiusMeters")}
                                                        disabled={!isEditing} size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <FormControlLabel
                                                        control={<Checkbox checked={config.geoFencing?.enforceValidation} onChange={handleGeoChange("enforceValidation")} disabled={!isEditing} />}
                                                        label="Strictly Enforce Location"
                                                    />
                                                </Grid>
                                            </Grid>
                                        )}
                                    </Grid>
                                )}

                                {/* Additional Allowed Locations */}
                                {(!config.allowRemoteCheckIn && config.geoFencing?.enabled) && (
                                    <Grid item xs={12}>
                                        <Box mt={3} mb={1} display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2">Additional Allowed Locations (Employee Specific)</Typography>
                                            {isEditing && (
                                                <Button variant="outlined" startIcon={<Add />} onClick={addLocation} size="small">
                                                    Add Location
                                                </Button>
                                            )}
                                        </Box>
                                        {config.allowedLocations?.map((loc, index) => (
                                            <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                                                <CardContent sx={{ pb: '16px !important' }}>
                                                    <Grid container spacing={2} alignItems="center">
                                                        <Grid item xs={12} sm={3}>
                                                            <TextField fullWidth label="Name" value={loc.name} onChange={(e) => handleLocationChange(index, "name", e.target.value)} disabled={!isEditing} size="small" />
                                                        </Grid>
                                                        <Grid item xs={12} sm={3}>
                                                            <TextField fullWidth label="Lat" type="number" value={loc.lat} onChange={(e) => handleLocationChange(index, "lat", parseFloat(e.target.value))} disabled={!isEditing} size="small" />
                                                        </Grid>
                                                        <Grid item xs={12} sm={3}>
                                                            <TextField fullWidth label="Lng" type="number" value={loc.lng} onChange={(e) => handleLocationChange(index, "lng", parseFloat(e.target.value))} disabled={!isEditing} size="small" />
                                                        </Grid>
                                                        <Grid item xs={12} sm={2}>
                                                            <TextField fullWidth label="Rad" type="number" value={loc.radius} onChange={(e) => handleLocationChange(index, "radius", parseFloat(e.target.value))} disabled={!isEditing} size="small" />
                                                        </Grid>
                                                        <Grid item xs={12} sm={1}>
                                                            {isEditing && <IconButton onClick={() => removeLocation(index)} color="error"><Delete /></IconButton>}
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Grid>
                                )}


                            </>
                        )}
                    </>
                )}

            </Grid>
        </Box>
    );
};
