import {
    Box,
    Checkbox,
    FormControlLabel,
    Grid,
    Typography,
    Alert,
} from "@mui/material";
import dynamic from 'next/dynamic';



import { AttendanceConfigurationForm, AttendanceConfigData } from "@/app/components/attendance/AttendanceConfigurationForm";

// Remove dynamic import of LocationMap as it is now inside the form
// const LocationMap = dynamic(() => import('@/app/components/maps/LocationMap'), { ssr: false });

interface AttendanceOverrides {
    enabled: boolean;
    features: {
        pwaCheckIn: boolean;
        hardwareIntegration: boolean;
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
                            <Box mt={2}>
                                <AttendanceConfigurationForm
                                    config={{
                                        ...config,
                                        // Ensure generic types match
                                        features: {
                                            pwaCheckIn: config.features?.pwaCheckIn || false,
                                            hardwareIntegration: config.features?.hardwareIntegration || false,
                                            salaryIntegration: config.features?.salaryIntegration || false,
                                        },
                                        // Map root allowedLocations to geoFencing for the component
                                        geoFencing: {
                                            enabled: config.geoFencing?.enabled || false,
                                            latitude: config.geoFencing?.latitude || 0,
                                            longitude: config.geoFencing?.longitude || 0,
                                            radiusMeters: config.geoFencing?.radiusMeters || 100,
                                            enforceValidation: config.geoFencing?.enforceValidation || false,
                                            allowedLocations: config.allowedLocations || []
                                        },
                                        isRemote: config.isRemote || false
                                    }}
                                    onChange={(newConfig) => {
                                        // Map back to Employee Overrides structure
                                        // allowedLocations moves back to root
                                        const { geoFencing, ...rest } = newConfig;
                                        const { allowedLocations, ...geoRest } = geoFencing;

                                        onUpdateOverrides({
                                            ...config, // Keep original references if needed, but overwrite with new
                                            ...rest,
                                            geoFencing: geoRest,
                                            allowedLocations: allowedLocations || []
                                        });
                                    }}
                                    isEditing={isEditing}
                                    type="employee"
                                />
                            </Box>
                        )}
                    </>
                )}

            </Grid>
        </Box>
    );
};
