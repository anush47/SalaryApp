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
    attendanceConfig: Company["attendanceConfig"];
    setAttendanceConfig: (config: Company["attendanceConfig"]) => void;
}

export const CompanyAttendanceSettings: React.FC<CompanyAttendanceSettingsProps> = ({
    isEditing,
    attendanceConfig,
    setAttendanceConfig,
}) => {


    // Ensure we have default values if undefined
    const defaultConfig: AttendanceConfigData = {
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
            allowedLocations: [],
        },
        allowRemoteCheckIn: false,
        requireApproval: false,
    };

    // Cast attendanceConfig to AttendanceConfigData to satisfy TS
    const config: AttendanceConfigData = (attendanceConfig as unknown as AttendanceConfigData) || defaultConfig;

    const handleToggleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAttendanceConfig({
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
                                onChange={(newConfig) => setAttendanceConfig(newConfig as any)}
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
