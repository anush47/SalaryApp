import React, { useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Checkbox,
    FormControlLabel,
    Grid,
    TextField,
    Typography,
    Button,
    IconButton,
    Paper,
    Divider,
    Alert
} from "@mui/material";
import { Add, Delete, Edit, LocationOn, Save } from "@mui/icons-material";
import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('@/app/components/maps/LocationMap'), { ssr: false });

export interface AttendanceConfigData {
    // Common
    enabled: boolean;
    pwaCheckIn: boolean;
    hardwareIntegration: boolean;
    salaryIntegration: boolean;
    allowRemoteCheckIn: boolean;
    requireApproval: boolean;
    approvalMode?: "automatic" | "always" | "out_of_zone";
    livenessDetection?: boolean;
    features?: {
        pwaCheckIn: boolean;
        hardwareIntegration: boolean;
        salaryIntegration: boolean;
    };

    // Geofencing
    geoFencing: {
        enabled: boolean;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        enforceValidation: boolean;
        allowedLocations?: {
            name: string;
            lat: number;
            lng: number;
            radius: number;
            _id?: string;
        }[];
    };

    // Context Specific
    apiKey?: string; // Company only
    isRemote?: boolean; // Employee only
}

interface AttendanceConfigurationFormProps {
    config: AttendanceConfigData;
    onChange: (config: AttendanceConfigData) => void;
    isEditing: boolean;
    type: "company" | "employee";
}

export const AttendanceConfigurationForm: React.FC<AttendanceConfigurationFormProps> = ({
    config,
    onChange,
    isEditing,
    type
}) => {
    // Local state for map interaction
    const [mapMode, setMapMode] = useState<'view' | 'edit_primary' | 'add_new' | number>('view');
    const [newLocationName, setNewLocationName] = useState("");
    const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [currentBrowserLocation, setCurrentBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Fetch current location on mount
    React.useEffect(() => {
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            console.warn("Geolocation requires HTTPS to function on most devices.");
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentBrowserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn("Could not retrieve current location for map centering", error);
                }
            );
        }
    }, []);

    // -- Handlers --

    const handlePolicyChange = (field: keyof AttendanceConfigData, value: any) => {
        onChange({
            ...config,
            [field]: value
        });
    };

    const handleGeoToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                enabled: e.target.checked
            }
        });
    };

    const handleGeoFieldChange = (field: keyof typeof config.geoFencing, value: any) => {
        onChange({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                [field]: value
            }
        });
    };

    // -- Map & Location Handlers --

    // When map is clicked
    const onMapClick = (lat: number, lng: number) => {
        if (!isEditing) return;

        if (mapMode === 'edit_primary') {
            // Update Primary Location
            onChange({
                ...config,
                geoFencing: {
                    ...config.geoFencing,
                    latitude: lat,
                    longitude: lng
                }
            });
        } else if (mapMode === 'add_new') {
            // Update Temp New Location
            setTempCoords({ lat, lng });
        } else if (typeof mapMode === 'number') {
            // Update Additional Location at Index
            const newLocations = [...(config.geoFencing.allowedLocations || [])];
            newLocations[mapMode] = {
                ...newLocations[mapMode],
                lat,
                lng
            };
            onChange({
                ...config,
                geoFencing: {
                    ...config.geoFencing,
                    allowedLocations: newLocations
                }
            });
        }
    };

    const handleAddNewLocation = () => {
        if (!tempCoords) return;
        const newLoc = {
            name: newLocationName || "New Location",
            lat: tempCoords.lat,
            lng: tempCoords.lng,
            radius: 100
        };
        onChange({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                allowedLocations: [...(config.geoFencing.allowedLocations || []), newLoc]
            }
        });
        setMapMode('view');
        setNewLocationName("");
        setTempCoords(null);
    };

    const handleRemoveLocation = (index: number) => {
        const newLocations = [...(config.geoFencing.allowedLocations || [])];
        newLocations.splice(index, 1);
        onChange({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                allowedLocations: newLocations
            }
        });
        if (mapMode === index) setMapMode('view');
    };

    const handleUpdateLocationField = (index: number, field: string, value: any) => {
        const newLocations = [...(config.geoFencing.allowedLocations || [])];
        newLocations[index] = {
            ...newLocations[index],
            [field]: value
        };
        onChange({
            ...config,
            geoFencing: {
                ...config.geoFencing,
                allowedLocations: newLocations
            }
        });
    };

    // Determine what to show on map based on mode
    const getMapProps = () => {
        const primary = {
            lat: config.geoFencing.latitude || 0,
            lng: config.geoFencing.longitude || 0,
            radius: config.geoFencing.radiusMeters || 100,
            name: "Primary Office"
        };

        const extra = config.geoFencing.allowedLocations || [];

        // Fallback to browser location if primary is 0,0
        const defaultCenterLat = currentBrowserLocation?.lat || 0;
        const defaultCenterLng = currentBrowserLocation?.lng || 0;

        // View Mode: Show All
        if (mapMode === 'view') {
            // Center? Maybe primary or first extra or current location
            const hasPrimary = primary.lat !== 0 || primary.lng !== 0;
            const hasExtra = extra.length > 0;

            const centerLat = hasPrimary ? primary.lat : (hasExtra ? extra[0].lat : defaultCenterLat);
            const centerLng = hasPrimary ? primary.lng : (hasExtra ? extra[0].lng : defaultCenterLng);

            return {
                lat: centerLat,
                lng: centerLng,
                radius: 0, // Don't show generic radius circle
                zoom: (hasPrimary || hasExtra) ? 13 : 15, // Zoom closer if relying on browser location
                additionalZones: [
                    ...(hasPrimary ? [primary] : []),
                    ...extra.map(l => ({ lat: l.lat, lng: l.lng, radius: l.radius, name: l.name }))
                ],
                markerPosition: null,
                userLocation: currentBrowserLocation || undefined
            };
        }

        // Edit Primary
        if (mapMode === 'edit_primary') {
            const hasPrimary = primary.lat !== 0 || primary.lng !== 0;
            return {
                lat: hasPrimary ? primary.lat : defaultCenterLat,
                lng: hasPrimary ? primary.lng : defaultCenterLng,
                radius: primary.radius,
                zoom: 16,
                markerPosition: hasPrimary ? { lat: primary.lat, lng: primary.lng } : null,
                additionalZones: [],
                userLocation: currentBrowserLocation || undefined
            };
        }

        // Add New
        if (mapMode === 'add_new') {
            // Default to primary location or 0,0 if not set
            const startLat = tempCoords?.lat || primary.lat || defaultCenterLat;
            const startLng = tempCoords?.lng || primary.lng || defaultCenterLng;
            return {
                lat: startLat,
                lng: startLng,
                radius: 100, // Temp radius
                zoom: 15,
                markerPosition: tempCoords ? { lat: tempCoords.lat, lng: tempCoords.lng } : null,
                additionalZones: [],
                userLocation: currentBrowserLocation || undefined
            };
        }

        // Edit Extra
        if (typeof mapMode === 'number') {
            const loc = extra[mapMode];
            return {
                lat: loc.lat,
                lng: loc.lng,
                radius: loc.radius,
                zoom: 16,
                markerPosition: { lat: loc.lat, lng: loc.lng },
                additionalZones: [],
                userLocation: currentBrowserLocation || undefined
            };
        }

        return { lat: defaultCenterLat, lng: defaultCenterLng };
    };

    const mapProps = getMapProps();


    return (
        <Box>
            {/* 1. Features & Policies Grid */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Feature Configuration</Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <FormControlLabel
                            control={<Checkbox checked={config.pwaCheckIn || false} onChange={(e) => handlePolicyChange("pwaCheckIn", e.target.checked)} disabled={!isEditing} />}
                            label="PWA Check-In"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={config.salaryIntegration || false} onChange={(e) => handlePolicyChange("salaryIntegration", e.target.checked)} disabled={!isEditing} />}
                            label="Salary Integration"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={config.hardwareIntegration || false} onChange={(e) => handlePolicyChange("hardwareIntegration", e.target.checked)} disabled={!isEditing} />}
                            label="Hardware Integration"
                        />
                        {config.hardwareIntegration && (
                            <FormControlLabel
                                control={<Checkbox checked={config.livenessDetection || false} onChange={(e) => handlePolicyChange("livenessDetection", e.target.checked)} disabled={!isEditing} />}
                                label="Liveness Detection (Anti-Spoofing)"
                            />
                        )}
                    </Box>
                </Grid>

                {/* API Key (Company Only) */}
                {type === 'company' && config.hardwareIntegration && (
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth label="API Key (Hardware)"
                            value={config.apiKey || ''}
                            onChange={(e) => handlePolicyChange('apiKey', e.target.value)}
                            disabled={!isEditing} variant="filled" size="small"
                        />
                    </Grid>
                )}

                <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Policies</Typography>
                    <FormControlLabel
                        control={<Checkbox checked={config.allowRemoteCheckIn || false} onChange={(e) => handlePolicyChange('allowRemoteCheckIn', e.target.checked)} disabled={!isEditing} />}
                        label="Allow Remote Check-In (Disables Geofencing)"
                    />
                    <TextField
                        select
                        label="Approval Policy"
                        value={config.approvalMode || (config.requireApproval ? "always" : "automatic")}
                        onChange={(e) => handlePolicyChange('approvalMode', e.target.value)}
                        disabled={!isEditing}
                        size="small"
                        sx={{ minWidth: 200, mt: 1, display: 'block' }}
                        SelectProps={{ native: true }}
                    >
                        <option value="automatic">Automatic (No Approval)</option>
                        <option value="always">Always Require Approval</option>
                        <option value="out_of_zone">Require if Out of Zone</option>
                    </TextField>
                    {type === 'employee' && (
                        <FormControlLabel
                            control={<Checkbox checked={config.isRemote || false} onChange={(e) => handlePolicyChange('isRemote', e.target.checked)} disabled={!isEditing} />}
                            label="Is Remote Worker (Auto-approves remote)"
                        />
                    )}
                </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* 2. Geofencing Section */}
            <Typography variant="h6" gutterBottom>Geofencing & Locations</Typography>

            <FormControlLabel
                control={<Checkbox checked={config.geoFencing?.enabled || false} onChange={handleGeoToggle} />}
                disabled={!isEditing || config.allowRemoteCheckIn}
                label="Enable Geofencing"
            />

            {config.allowRemoteCheckIn && (
                <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
                    Geofencing is disabled because Remote Check-In is allowed.
                </Alert>
            )}

            {config.geoFencing?.enabled && !config.allowRemoteCheckIn && (
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    {/* Map Interaction Area */}
                    <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle2" color="primary" fontWeight="bold">
                                    {mapMode === 'view' ? 'Overview Map' :
                                        mapMode === 'add_new' ? 'Click map to place New Location' :
                                            mapMode === 'edit_primary' ? 'Click map to set Primary Location' :
                                                'Click map to set Location'}
                                </Typography>
                                {mapMode !== 'view' && (
                                    <Button size="small" variant="outlined" onClick={() => { setMapMode('view'); setTempCoords(null); }}>
                                        Cancel Map Edit
                                    </Button>
                                )}
                            </Box>
                            <LocationMap
                                lat={mapProps.lat}
                                lng={mapProps.lng}
                                radius={mapProps.radius}
                                zoom={mapProps.zoom}
                                interactive={isEditing && mapMode !== 'view'}
                                onLocationSelect={onMapClick}
                                markerPosition={mapProps.markerPosition}
                                additionalZones={mapProps.additionalZones}
                                height="350px"
                            />
                        </Paper>
                    </Grid>

                    {/* Primary Location Config */}
                    <Grid item xs={12} md={5}>
                        <Card variant="outlined" sx={{ height: '100%', borderColor: mapMode === 'edit_primary' ? 'primary.main' : undefined }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <LocationOn color="primary" />
                                    <Typography variant="subtitle1" fontWeight="bold">Primary Office</Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="Latitude" type="number" fullWidth size="small"
                                            value={config.geoFencing.latitude || 0}
                                            onChange={(e) => handleGeoFieldChange('latitude', parseFloat(e.target.value))}
                                            disabled={!isEditing}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="Longitude" type="number" fullWidth size="small"
                                            value={config.geoFencing.longitude || 0}
                                            onChange={(e) => handleGeoFieldChange('longitude', parseFloat(e.target.value))}
                                            disabled={!isEditing}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Radius (Meters)" type="number" fullWidth size="small"
                                            value={config.geoFencing.radiusMeters || 100}
                                            onChange={(e) => handleGeoFieldChange('radiusMeters', parseFloat(e.target.value))}
                                            disabled={!isEditing}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={<Checkbox checked={config.geoFencing.enforceValidation} onChange={(e) => handleGeoFieldChange('enforceValidation', e.target.checked)} disabled={!isEditing} />}
                                            label="Strict Enforce"
                                        />
                                    </Grid>
                                    {isEditing && (
                                        <Grid item xs={12}>
                                            <Button
                                                fullWidth variant={mapMode === 'edit_primary' ? "contained" : "outlined"}
                                                onClick={() => setMapMode('edit_primary')}
                                                startIcon={<LocationOn />}
                                            >
                                                {mapMode === 'edit_primary' ? "Click Map to Update" : "Set on Map"}
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Additional Locations Config */}
                    <Grid item xs={12} md={7}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" fontWeight="bold">Additional Locations</Typography>
                                {isEditing && mapMode !== 'add_new' && (
                                    <Button size="small" startIcon={<Add />} onClick={() => setMapMode('add_new')}>
                                        Add New
                                    </Button>
                                )}
                            </Box>

                            {/* Add New Form */}
                            {mapMode === 'add_new' && (
                                <Box mb={2} p={2} border="1px dashed" borderColor="primary.main" borderRadius={1} bgcolor="action.hover">
                                    <Typography variant="caption" color="primary" display="block" mb={1}>
                                        1. Click Map to set coords  2. Name it  3. Click Add
                                    </Typography>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth size="small" placeholder="Name" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField fullWidth size="small" label="Lat" value={tempCoords?.lat?.toFixed(5) || ''} disabled />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField fullWidth size="small" label="Lng" value={tempCoords?.lng?.toFixed(5) || ''} disabled />
                                        </Grid>
                                        <Grid item xs={12} sm={2}>
                                            <Button fullWidth variant="contained" size="small" onClick={handleAddNewLocation} disabled={!tempCoords}>Add</Button>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* List */}
                            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                {config.geoFencing.allowedLocations?.map((loc, index) => (
                                    <Card key={index} variant="outlined" sx={{ mb: 1, borderColor: mapMode === index ? 'primary.main' : undefined }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Grid container spacing={1} alignItems="center">
                                                <Grid item xs={12} sm={3}>
                                                    <TextField
                                                        fullWidth size="small" label="Name"
                                                        value={loc.name}
                                                        onChange={(e) => handleUpdateLocationField(index, 'name', e.target.value)}
                                                        disabled={!isEditing}
                                                    />
                                                </Grid>
                                                <Grid item xs={4} sm={2.5}>
                                                    <TextField
                                                        fullWidth size="small" label="Lat" type="number"
                                                        value={loc.lat}
                                                        onChange={(e) => handleUpdateLocationField(index, 'lat', parseFloat(e.target.value))}
                                                        disabled={!isEditing} inputProps={{ step: "0.0001" }}
                                                    />
                                                </Grid>
                                                <Grid item xs={4} sm={2.5}>
                                                    <TextField
                                                        fullWidth size="small" label="Lng" type="number"
                                                        value={loc.lng}
                                                        onChange={(e) => handleUpdateLocationField(index, 'lng', parseFloat(e.target.value))}
                                                        disabled={!isEditing} inputProps={{ step: "0.0001" }}
                                                    />
                                                </Grid>
                                                <Grid item xs={4} sm={2}>
                                                    <TextField
                                                        fullWidth size="small" label="Rad" type="number"
                                                        value={loc.radius}
                                                        onChange={(e) => handleUpdateLocationField(index, 'radius', parseFloat(e.target.value))}
                                                        disabled={!isEditing}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={2} display="flex" justifyContent="flex-end">
                                                    {isEditing && (
                                                        <>
                                                            <IconButton size="small" color={mapMode === index ? "primary" : "default"} onClick={() => setMapMode(mapMode === index ? 'view' : index)}>
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                            <IconButton size="small" color="error" onClick={() => handleRemoveLocation(index)}>
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                ))}
                                {(!config.geoFencing.allowedLocations || config.geoFencing.allowedLocations.length === 0) && (
                                    <Typography variant="caption" color="text.secondary" align="center" display="block" py={2}>
                                        No additional locations.
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};
