"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, Paper } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { getEffectiveAllowedZones, CompanyConfig, AttendanceOverrides } from '@/app/lib/utils/attendanceUtils';

// Dynamic import for the base map component
const LocationMap = dynamic(() => import('@/app/components/maps/LocationMap'), { ssr: false });

interface AttendanceZonesMapProps {
    companyConfig?: CompanyConfig;
    employeeOverrides?: AttendanceOverrides;

    // Mode specific props
    userLocation?: { lat: number; lng: number; accuracy?: number }; // For "Live" tracking
    markerLocation?: { lat: number; lng: number }; // For "View Record" or "Manual Selection"

    height?: number | string;
    interactive?: boolean;
    fitBounds?: boolean;
    showLegend?: boolean;
}

export const AttendanceZonesMap: React.FC<AttendanceZonesMapProps> = ({
    companyConfig,
    employeeOverrides,
    userLocation,
    markerLocation,
    height = 400,
    interactive = true,
    fitBounds = true,
    showLegend = true
}) => {
    // Use the shared utility to get correct zones
    const { zones, primaryZone } = useMemo(() =>
        getEffectiveAllowedZones(companyConfig, employeeOverrides),
        [companyConfig, employeeOverrides]
    );

    const otherZones = zones.filter(z => !z.isPrimary);

    // Prioritize USER location for center, then Marker, then Primary Zone.
    // This allows the map to start centered on the user if available.
    const centerLat = userLocation?.lat || markerLocation?.lat || primaryZone?.lat || 0;
    const centerLng = userLocation?.lng || markerLocation?.lng || primaryZone?.lng || 0;

    return (
        <Box>
            <LocationMap
                // Center Preference: User -> Marker -> Primary Zone
                lat={centerLat}
                lng={centerLng}

                // Primary Zone Circle (Blue) - Pass explicit coords if primary zone exists
                radius={primaryZone?.radius || 0}
                circlePosition={primaryZone ? { lat: primaryZone.lat, lng: primaryZone.lng } : undefined}

                // Additional Zones (Green Circles)
                additionalZones={otherZones.map(z => ({
                    lat: z.lat,
                    lng: z.lng,
                    radius: z.radius,
                    name: z.name
                }))}

                // Markers
                userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
                markerPosition={markerLocation ? { lat: markerLocation.lat, lng: markerLocation.lng } : undefined}

                // Settings
                height={height}
                zoom={16}
                interactive={interactive}
                fitBounds={fitBounds}
            />

            {showLegend && (
                <Box mt={1} display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'blue', opacity: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">Primary Zone</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'green', opacity: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">Additional Zones</Typography>
                    </Box>
                    {userLocation && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3b82f6', border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.3)' }} />
                            <Typography variant="caption" color="text.secondary">Your Location</Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};
