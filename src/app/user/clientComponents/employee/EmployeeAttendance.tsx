"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    CircularProgress,
    Stack,
    Alert,
    Divider,
    Paper,
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Place, AccessTime, History, CheckCircle, Logout, LocationOn } from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { markAttendance, getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import dynamic from 'next/dynamic';



const LocationMap = dynamic(() => import('@/app/components/maps/LocationMap'), { ssr: false });
import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UserProps {
    user: {
        name: string;
        email: string;
        id: string;
        role: string;
        image: string;
    };
}

const EmployeeAttendance: React.FC<UserProps> = ({ user }) => {
    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [locationStatus, setLocationStatus] = useState<{
        isInside: boolean;
        distance: number | null;
        error: string | null;
        fetching: boolean;
        coords: { latitude: number; longitude: number; accuracy: number } | null;
    }>({ isInside: false, distance: null, error: null, fetching: true, coords: null });

    // Haversine formula to calculate distance in meters
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ1) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(dayjs());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 1. Fetch Employee Profile to get Company ID
    const { data: employee, isLoading: loadingEmployee } = useQuery({
        queryKey: ["employeeProfile", user.id],
        queryFn: async () => {
            const response = await fetch(`/api/employees?user=${user.id}`);
            if (!response.ok) throw new Error("Failed to fetch profile");
            const data = await response.json();
            const employees = data.employees || data.data?.employees || [];
            return employees[0];
        }
    });

    const effectiveConfig = useMemo(() => {
        if (!employee) return null;

        const companyConfig = employee.company?.attendanceConfig || {};
        const employeeOverrides = employee.attendanceOverrides || {};
        const isOverrideEnabled = employee.attendanceOverrides?.enabled;

        // Base config: Default to company config
        // Assuming the logic is: If override enabled, use override settings.
        // If not, use company settings.
        // However, checks like 'pwaCheckIn' are boolean flags.
        // Let's deduce the specific Geofencing requirement:

        let geoConfig = companyConfig.geoFencing || {};
        let allowRemote = companyConfig.allowRemoteCheckIn;

        if (isOverrideEnabled) {
            // If employee overrides are enabled, check if specific geo-fencing override is populated/enabled
            // Note: The schema shows `attendanceOverrides.geoFencing` exists.
            if (employeeOverrides.geoFencing) {
                geoConfig = employeeOverrides.geoFencing;
            }
            if (employeeOverrides.allowRemoteCheckIn !== undefined) {
                allowRemote = employeeOverrides.allowRemoteCheckIn;
            }
        }

        return {
            geoFencing: geoConfig,
            allowRemoteCheckIn: allowRemote
        };
    }, [employee]);

    const companyLocation = useMemo(() => {
        if (!effectiveConfig) return null;

        const { geoFencing } = effectiveConfig;

        // Use coordinates from the active configuration (Company or Employee Override)
        return {
            lat: geoFencing.latitude,
            lng: geoFencing.longitude,
            radius: geoFencing.radiusMeters || 100 // Default 100m radius if not set
        };
    }, [effectiveConfig]);

    // 2. Watch User Location

    // Logic Split:
    // 1. shouldShowMap: If Geofencing is configured (Enabled in settings), we show the map.
    // 2. isVerificationRequired: If Geofencing is Enabled AND Remote Check-in is Disabled, we ENFORCE it.

    const isGeofencingEnabled = effectiveConfig?.geoFencing?.enabled;
    const isRemoteAllowed = effectiveConfig?.allowRemoteCheckIn;

    // Determine all allowed zones
    const allowedLocations = useMemo(() => {
        if (!effectiveConfig) return [];

        const zones = [];
        const { geoFencing } = effectiveConfig;

        // Primary Zone (Company or Main Override)
        if (geoFencing && geoFencing.latitude && geoFencing.longitude) {
            zones.push({
                lat: geoFencing.latitude,
                lng: geoFencing.longitude,
                radius: geoFencing.radiusMeters || 100, // Default 100m
                name: "Primary Office"
            });
        }

        // Add Company Multiple Locations
        if (geoFencing?.allowedLocations?.length > 0) {
            geoFencing.allowedLocations.forEach((loc: any, idx: number) => {
                if (loc.lat && loc.lng) {
                    zones.push({
                        lat: loc.lat,
                        lng: loc.lng,
                        radius: loc.radius || 100,
                        name: loc.name || `Allowed Zone ${idx + 2}`
                    });
                }
            });
        }

        // Add additional allowed locations from employee profile if any exist
        // Assuming employee.attendanceOverrides.allowedLocations might exist in future schema or user requested "stufff" implying extras.
        // For now, based on schema available, we'll stick to the single source derived in effectiveConfig.
        // IF the user implies "additional allowed locations" lists, we check if they exist in the employee object.
        const extraLocations = employee?.attendanceOverrides?.allowedLocations || [];
        if (Array.isArray(extraLocations)) {
            extraLocations.forEach((loc: any, idx: number) => {
                if (loc.lat && loc.lng) {
                    zones.push({
                        lat: loc.lat,
                        lng: loc.lng,
                        radius: loc.radius || 100,
                        name: loc.name || `Allowed Zone ${idx + 1}`
                    });
                }
            });
        }

        return zones;
    }, [effectiveConfig, employee]);

    const shouldShowMap = allowedLocations.length > 0;
    const isVerificationRequired = isGeofencingEnabled && !isRemoteAllowed;


    useEffect(() => {
        // If map is hidden, we don't need to watch location (unless we want background tracking, but let's save battery)
        if (!shouldShowMap) {
            setLocationStatus(prev => ({ ...prev, isInside: true, error: null, fetching: false, distance: null, coords: null }));
            return;
        }

        if (allowedLocations.length === 0) {
            setLocationStatus(prev => ({
                ...prev,
                error: "No allowed locations configured.",
                fetching: false,
                coords: null
            }));
            return;
        }


        if (!navigator.geolocation) {
            setLocationStatus(prev => ({ ...prev, error: "Geolocation not supported", fetching: false, coords: null }));
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Check distance to ALL allowed zones
                let isInsideAny = false;
                let minDistance = Infinity;
                let closestZoneRadius = 0;

                allowedLocations.forEach(zone => {
                    const dist = calculateDistance(latitude, longitude, zone.lat, zone.lng);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestZoneRadius = zone.radius;
                    }
                    if (dist <= zone.radius) {
                        isInsideAny = true;
                    }
                });

                setLocationStatus({
                    isInside: isInsideAny,
                    distance: minDistance,
                    error: null,
                    fetching: false,
                    coords: { latitude, longitude, accuracy: position.coords.accuracy }
                });
            },
            (error) => {
                let msg = "Unable to retrieve location";
                if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied";
                setLocationStatus(prev => ({ ...prev, error: msg, fetching: false, coords: null }));
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [allowedLocations, shouldShowMap]);

    const companyId = employee?.company?._id || employee?.company;
    const todayStr = dayjs().format("YYYY-MM-DD");

    // 2. Fetch Recent Logs (Last 48 Hours to handle overnight shifts)
    const startDate = useMemo(() => dayjs().subtract(1, 'day').startOf('day').toISOString(), []);
    const endDate = useMemo(() => dayjs().endOf('day').toISOString(), []);

    const { data: logsResponse, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ["attendanceLogs", companyId, startDate, endDate],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate, endDate),
        enabled: !!companyId
    });

    const logs = useMemo(() => {
        if (!logsResponse?.success) return [];
        // Filter logs to only show THIS employee's logs (since the API returns company-wide logs for given date)
        // Note: The service might need adjustment if we want a more private endpoint, 
        // but for now we filter client-side or assume the API handles it if user is employee.
        // Looking at AttendanceService.getAttendance, it returns all logs for company.
        return (logsResponse.data || []).filter((log: any) => log.employee?._id === employee?._id || log.employee === employee?._id);
    }, [logsResponse, employee]);

    const lastLog = logs.length > 0 ? logs[0] : null; // Sorted by timestamp desc in API
    const isClockedIn = lastLog?.type === 'in';
    const currentStatus = isClockedIn ? 'Clocked In' : 'Clocked Out';
    const isPending = lastLog?.status === 'pending';
    const isRejected = lastLog?.status === 'rejected';

    const handleAttendance = async (type: "in" | "out") => {
        if (!navigator.geolocation) {
            showSnackbar({ message: "Geolocation is not supported by your browser", severity: "error" });
            return;
        }

        // If location verification is required, check if user is allowed
        if (isVerificationRequired && !locationStatus.isInside && locationStatus.coords) {
            showSnackbar({ message: "You are outside the allowed area. Cannot check in.", severity: "error" });
            return;
        }

        setLoading(true);

        // Helper to get location with timeout and fallback
        const getLocation = (): Promise<{ lat: number, lng: number, accuracy: number } | null> => {
            return new Promise((resolve, reject) => {
                // Return cached location if available immediately? 
                // Better to try fresh first, but if it fails, use cached.

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        console.warn("Geolocation error:", error);
                        // If watchPosition has a location, use it as fallback
                        if (locationStatus.coords) {
                            console.log("Using cached location from watchPosition");
                            resolve({
                                lat: locationStatus.coords.latitude,
                                lng: locationStatus.coords.longitude,
                                accuracy: (locationStatus.coords as any).accuracy || 20
                            });
                        } else {
                            if (isVerificationRequired) {
                                reject(error);
                            } else {
                                resolve(null); // Proceed without location if not required
                            }
                        }
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 } // Reduced timeout, allow slightly older cache
                );
            });
        };

        getLocation().then(async (location) => {
            // Device ID Logic
            let deviceId = localStorage.getItem("attendance_device_id");
            if (!deviceId) {
                deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
                localStorage.setItem("attendance_device_id", deviceId);
            }
            const deviceDetails = navigator.userAgent || "Unknown Device";

            try {
                // Construct payload
                const payload: any = { type, deviceId, deviceDetails };
                if (location) {
                    payload.location = location;
                } else {
                    // If no location and verification not required, send dummy/empty location or handle in API?
                    // The API schema expects location. Let's send 0,0 if allowed, or handle API side?
                    // Checking API service: createAttendance expects location object.
                    // We should send 0,0 if not available but authorized.
                    payload.location = { lat: 0, lng: 0, accuracy: 0 };
                }

                const res = await markAttendance(payload);

                if (res.success) {
                    showSnackbar({ message: `Successfully Checked ${type === 'in' ? 'In' : 'Out'}!`, severity: "success" });
                    refetchLogs();
                } else {
                    showSnackbar({ message: res.error?.message || "Failed to mark attendance", severity: "error" });
                }
            } catch (error) {
                showSnackbar({ message: "An error occurred", severity: "error" });
            } finally {
                setLoading(false);
            }
        }).catch((error: GeolocationPositionError) => {
            setLoading(false);
            let msg = "Unable to retrieve your location";
            if (error.code === 1) msg = "Location permission denied. Please allow location access."; // 1 is PERMISSION_DENIED
            showSnackbar({ message: msg, severity: "error" });
        });
    };

    if (loadingEmployee) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Card
            sx={{
                minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
                overflowY: "auto",
            }}
        >
            <CardHeader
                title={
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
                        <Typography variant="h4" component="h1" fontWeight="bold">
                            Live Attendance
                        </Typography>
                        {lastLog && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                {isPending && (
                                    <Chip label="Pending Approval" size="small" color="warning" variant="outlined" />
                                )}
                                {isRejected && (
                                    <Chip label="Rejected" size="small" color="error" variant="outlined" />
                                )}
                                <Chip
                                    icon={isClockedIn ? <CheckCircle /> : <Logout />}
                                    label={currentStatus}
                                    color={isClockedIn ? "success" : "default"}
                                    variant="filled"
                                    sx={{ height: 40, px: 2, fontSize: '1rem', fontWeight: 'bold' }}
                                />
                            </Stack>
                        )}
                    </Box>
                }
            />
            <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
                <Grid container spacing={4}>
                    {/* Left Column: Clock and Actions */}
                    <Grid item xs={12} lg={5}>
                        <Stack spacing={4}>
                            {/* Time Card */}
                            <Paper elevation={0} sx={{
                                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                color: "white",
                                textAlign: "center",
                                py: 4,
                                borderRadius: 4,
                                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.2)'
                            }}>
                                <AccessTime sx={{ fontSize: 50, mb: 1, opacity: 0.9 }} />
                                <Typography variant="h2" fontWeight="bold" sx={{ letterSpacing: -2 }}>
                                    {currentTime.format("HH:mm:ss")}
                                </Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
                                    {currentTime.format("dddd, D MMMM YYYY")}
                                </Typography>

                                {/* Show Check-in Time if Clocked In */}
                                {isClockedIn && lastLog && (
                                    <Box mt={2} bgcolor="rgba(255,255,255,0.15)" borderRadius={2} p={1} mx={4}>
                                        <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                                            CHECKED IN AT
                                        </Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {dayjs(lastLog.timestamp).format("hh:mm A")}
                                        </Typography>

                                        {/* Duration Timer */}
                                        <Box mt={1} pt={1} borderTop="1px solid rgba(255,255,255,0.2)">
                                            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                                                DURATION
                                            </Typography>
                                            <Typography variant="h5" fontFamily="monospace" fontWeight="bold" sx={{ letterSpacing: 1 }}>
                                                {(() => {
                                                    const diff = currentTime.diff(dayjs(lastLog.timestamp));
                                                    // Check for negative duration (if log time is slightly in future due to server skew)
                                                    if (diff < 0) return "00:00:00";

                                                    const h = Math.floor(diff / 3600000);
                                                    const m = Math.floor((diff % 3600000) / 60000);
                                                    const s = Math.floor((diff % 60000) / 1000);

                                                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                                                })()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            </Paper>

                            {/* Actions Card */}
                            <Paper variant="outlined" sx={{ borderRadius: 4, p: 3 }}>
                                <Typography variant="h6" gutterBottom color="text.secondary" fontWeight="bold">
                                    Shift Controls
                                </Typography>
                                <Divider sx={{ mb: 3 }} />
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} width="100%" mb={3}>
                                    <LoadingButton
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        fullWidth
                                        loading={loading}
                                        disabled={lastLog?.type === 'in'}
                                        onClick={() => handleAttendance("in")}
                                        startIcon={<Place />}
                                        sx={{ py: 2, fontSize: "1.1rem", borderRadius: 3 }}
                                    >
                                        Check In
                                    </LoadingButton>

                                    <LoadingButton
                                        variant="contained"
                                        color="warning"
                                        size="large"
                                        fullWidth
                                        loading={loading}
                                        disabled={!lastLog || lastLog.type === 'out'}
                                        onClick={() => handleAttendance("out")}
                                        startIcon={<Logout />}
                                        sx={{ py: 2, fontSize: "1.1rem", borderRadius: 3 }}
                                    >
                                        Check Out
                                    </LoadingButton>
                                </Stack>

                                {/* Location Status Indicator - Only Show if Verification is Required OR Map is desired */}
                                {shouldShowMap && (
                                    <Box mt={2} sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: locationStatus.fetching ? 'action.hover' : locationStatus.error ? 'error.lighter' : locationStatus.isInside ? 'success.lighter' : 'error.lighter',
                                        border: '1px solid',
                                        borderColor: locationStatus.fetching ? 'divider' : locationStatus.error ? 'error.light' : locationStatus.isInside ? 'success.light' : 'error.light',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2
                                    }}>
                                        <LocationMap
                                            // Initial center: User's location OR First Allowed Location
                                            lat={locationStatus.coords?.latitude || allowedLocations[0]?.lat || 0}
                                            lng={locationStatus.coords?.longitude || allowedLocations[0]?.lng || 0}
                                            radius={0} // We use additionalZones for the actual circles
                                            height={250}
                                            zoom={15}
                                            interactive={false}

                                            // User Position
                                            userLocation={locationStatus.coords ? {
                                                lat: locationStatus.coords.latitude,
                                                lng: locationStatus.coords.longitude
                                            } : undefined}

                                            // All Allowed Zones
                                            additionalZones={allowedLocations.map(loc => ({
                                                lat: loc.lat,
                                                lng: loc.lng,
                                                radius: loc.radius,
                                                name: loc.name
                                            }))}

                                            markerPosition={null}
                                        />

                                        <Box display="flex" alignItems="center" gap={2}>
                                            {locationStatus.fetching ? (
                                                <>
                                                    <CircularProgress size={20} />
                                                    <Typography variant="body2">Locating...</Typography>
                                                </>
                                            ) : locationStatus.error ? (
                                                <>
                                                    <LocationOn color="error" />
                                                    <Typography variant="body2" color="error.main" fontWeight="bold">{locationStatus.error}</Typography>
                                                </>
                                            ) : (
                                                <>
                                                    <LocationOn color={locationStatus.isInside ? "success" : "error"} />
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold" color={locationStatus.isInside ? "success.main" : "error.main"}>
                                                            {locationStatus.isInside ? "Inside Allowed Zone" : "Outside Allowed Zone"}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Distance: {locationStatus.distance?.toFixed(0)}m
                                                        </Typography>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </Paper>
                        </Stack>
                    </Grid>

                    {/* Right Column: History */}
                    <Grid item xs={12} lg={7}>
                        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', height: '100%', minHeight: 500 }}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <History color="primary" />
                                <Typography variant="h6" fontWeight="bold">Recent Activity</Typography>
                            </Box>
                            <TableContainer>
                                <Table size="medium">
                                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Verification</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadingLogs ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                                    <CircularProgress size={24} />
                                                </TableCell>
                                            </TableRow>
                                        ) : logs.length > 0 ? (
                                            logs.map((log: any) => (
                                                <TableRow key={log._id} hover>
                                                    <TableCell>
                                                        <Chip
                                                            label={log.type?.toUpperCase()}
                                                            size="small"
                                                            color={log.type === 'in' ? "success" : "warning"}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{dayjs(log.timestamp).format("hh:mm:ss A")}</TableCell>
                                                    <TableCell sx={{ color: 'text.secondary' }}>{dayjs(log.timestamp).format("MMM D, YYYY")}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={log.location?.isVerified ? "Verified" : "Unverified"}
                                                            size="small"
                                                            color={log.location?.isVerified ? "success" : "error"}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={(log.status || 'approved').toUpperCase()}
                                                            size="small"
                                                            color={log.status === 'pending' ? "warning" : log.status === 'rejected' ? "error" : "success"}
                                                            variant="filled"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                                    <Typography color="text.secondary">No activity found.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </CardContent >
        </Card >
    );
};

export default EmployeeAttendance;

