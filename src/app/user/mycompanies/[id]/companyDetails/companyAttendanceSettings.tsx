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



import { AttendanceConfigurationForm, AttendanceConfigData } from "@/app/components/attendance/AttendanceConfigurationForm";
const LocationMap = dynamic(() => import('@/app/components/maps/LocationMap'), { ssr: false });

interface CompanyAttendanceSettingsProps {
    isEditing: boolean;
    attendanceConfig: Company["attendanceConfig"] | undefined;
    geoFencing: Company["geoFencing"] | undefined;
    apiKey?: string;
    onUpdate: (fields: Partial<Company>) => void;
}

export const CompanyAttendanceSettings: React.FC<CompanyAttendanceSettingsProps> = ({
    isEditing,
    attendanceConfig,
    geoFencing,
    apiKey,
    onUpdate,
}) => {


    // Ensure we have default values if undefined
    const defaultConfig: AttendanceConfigData = {
        enabled: false,
        pwaCheckIn: false,
        hardwareIntegration: false,
        salaryIntegration: false,
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

    // Combine props into single config object for the form
    const config: AttendanceConfigData = {
        ...defaultConfig,
        ...(attendanceConfig as any), // Spread attendance flags
        geoFencing: geoFencing || defaultConfig.geoFencing, // Override geoFencing
        apiKey: apiKey, // Include apiKey from root level
    };

    const handleConfigChange = (newConfig: AttendanceConfigData) => {
        // Split back into separate updates
        // 1. GeoFencing
        const newGeoFencing = newConfig.geoFencing;

        // 2. Attendance Config (extract flags, remove geoFencing and apiKey)
        const { geoFencing: _, apiKey: extractedApiKey, ...newAttendanceConfig } = newConfig;

        onUpdate({
            attendanceConfig: newAttendanceConfig as any,
            geoFencing: newGeoFencing,
            apiKey: extractedApiKey
        });
    };

    const handleToggleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleConfigChange({
            ...config,
            enabled: e.target.checked,
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
                    {/* Main Enable Toggle - Managed outside to stay consistent with Accordion title logic if needed, 
                        BUT the form expects to control inner config. 
                        The parent passes `attendanceConfig`.
                    */}

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
                        <Grid item xs={12}>
                            <AttendanceConfigurationForm
                                config={config}
                                onChange={handleConfigChange}
                                isEditing={isEditing}
                                type="company"
                            />
                        </Grid>
                    )}
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};
