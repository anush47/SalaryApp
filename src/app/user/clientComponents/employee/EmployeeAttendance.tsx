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
import { getActiveShift } from "@/app/lib/api/shiftsApi";
import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEffectiveAllowedZones, calculateDistance } from "@/app/lib/utils/attendanceUtils";
import { AttendanceZonesMap } from "@/app/components/attendance/AttendanceZonesMap";

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

    // 2. Compute Effective Zones using Shared Logic
    const { zones, isGeofencingEnabled, isRemoteAllowed } = useMemo(() => {
        if (!employee) return { zones: [], isGeofencingEnabled: false, isRemoteAllowed: false };

        const companyConfig = employee.company?.attendanceConfig || {};
        const employeeOverrides = employee.attendanceOverrides;

        const effectiveData = getEffectiveAllowedZones(employee.company, employeeOverrides);

        // Check for remote check-in flag
        const isRemoteAllowed = employeeOverrides?.enabled && employeeOverrides.isRemote;
        const allowRemote = isRemoteAllowed ||
            employeeOverrides?.allowRemoteCheckIn ||
            employee.company?.attendanceConfig?.allowRemoteCheckIn ||
            employee.company?.allowRemoteCheckIn;

        return {
            zones: effectiveData.zones,
            isGeofencingEnabled: effectiveData.isGeofencingEnabled,
            isRemoteAllowed: !!allowRemote
        };
    }, [employee]);


    const shouldShowMap = true; // User requested to show map in all cases
    const isVerificationRequired = isGeofencingEnabled && !isRemoteAllowed;


    useEffect(() => {
        if (!shouldShowMap) {
            setLocationStatus(prev => ({ ...prev, isInside: true, error: null, fetching: false, distance: null, coords: null }));
            return;
        }

        if (!navigator.geolocation) {
            setLocationStatus(prev => ({ ...prev, error: "Geolocation not supported", fetching: false, coords: null }));
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                let isInsideAny = false;
                let minDistance = Infinity;

                if (zones.length > 0) {
                    zones.forEach(zone => {
                        const dist = calculateDistance(latitude, longitude, zone.lat, zone.lng);
                        if (dist < minDistance) minDistance = dist;
                        if (dist <= zone.radius) isInsideAny = true;
                    });
                } else {
                    isInsideAny = !isGeofencingEnabled;
                }

                setLocationStatus({
                    isInside: isInsideAny,
                    distance: minDistance === Infinity ? 0 : minDistance,
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
    }, [zones, shouldShowMap, isGeofencingEnabled]);


    // 2. Fetch Recent Logs
    const companyId = employee?.company?._id || employee?.company;
    const todayStr = dayjs().format("YYYY-MM-DD");
    const startDate = useMemo(() => dayjs().subtract(1, 'day').startOf('day').toISOString(), []);
    const endDate = useMemo(() => dayjs().endOf('day').toISOString(), []);

    const { data: logsResponse, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ["attendanceLogs", companyId, startDate, endDate],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate, endDate),
        enabled: !!companyId
    });

    const { data: activeShiftData } = useQuery({
        queryKey: ["activeShift", employee?._id, todayStr],
        queryFn: () => getActiveShift(employee._id, todayStr, currentTime.format("HH:mm")),
        enabled: !!employee?._id
    });

    const activeShift = activeShiftData?.success ? activeShiftData.data : null;

    const logs = useMemo(() => {
        if (!logsResponse?.success) return [];
        return (logsResponse.data || []).filter((log: any) => log.employee?._id === employee?._id || log.employee === employee?._id);
    }, [logsResponse, employee]);

    const lastLog = logs.length > 0 ? logs[0] : null;
    const isClockedIn = lastLog?.type === 'in';
    const currentStatus = isClockedIn ? 'Clocked In' : 'Clocked Out';
    const isPending = lastLog?.status === 'pending';
    const isRejected = lastLog?.status === 'rejected';

    const handleAttendance = async (type: "in" | "out") => {
        if (!navigator.geolocation) {
            showSnackbar({ message: "Geolocation is not supported by your browser", severity: "error" });
            return;
        }
        if (isVerificationRequired && !locationStatus.isInside && locationStatus.coords) {
            showSnackbar({ message: "You are outside the allowed area. Cannot check in.", severity: "error" });
            return;
        }
        setLoading(true);

        const getLocation = (): Promise<{ lat: number, lng: number, accuracy: number } | null> => {
            return new Promise((resolve, reject) => {
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
                        if (locationStatus.coords) {
                            resolve({
                                lat: locationStatus.coords.latitude,
                                lng: locationStatus.coords.longitude,
                                accuracy: (locationStatus.coords as any).accuracy || 20
                            });
                        } else {
                            if (isVerificationRequired) reject(error);
                            else resolve(null);
                        }
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
                );
            });
        };

        getLocation().then(async (location) => {
            let deviceId = localStorage.getItem("attendance_device_id");
            if (!deviceId) {
                deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
                localStorage.setItem("attendance_device_id", deviceId);
            }
            const deviceDetails = navigator.userAgent || "Unknown Device";
            try {
                const payload: any = { type, deviceId, deviceDetails };
                if (location) {
                    payload.location = location;
                } else {
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
            if (error.code === 1) msg = "Location permission denied. Please allow location access.";
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
        <Card sx={{ minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" }, overflowY: "auto", }}>
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
                    <Grid item xs={12} lg={5}>
                        <Stack spacing={4}>
                            <Paper elevation={0} sx={{
                                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                color: "white",
                                textAlign: "center",
                                py: 2,
                                borderRadius: 3,
                                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.2)'
                            }}>
                                <AccessTime sx={{ fontSize: 32, mb: 0.5, opacity: 0.9 }} />
                                <Typography variant="h3" fontWeight="bold" sx={{ letterSpacing: -1 }}>
                                    {currentTime.format("HH:mm:ss")}
                                </Typography>
                                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
                                    {currentTime.format("dddd, D MMM YYYY")}
                                </Typography>

                                {activeShift && (
                                    <Box mt={1} bgcolor="rgba(255,255,255,0.15)" borderRadius={2} p={0.5} mx={2}>
                                        <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.7rem' }}>
                                            ACTIVE SHIFT
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {activeShift.shift ? `${activeShift.shift.name} (${activeShift.shift.startTime} - ${activeShift.shift.endTime})` : (activeShift.isOffDay ? "Off Day" : "No Shift Assigned")}
                                        </Typography>
                                    </Box>
                                )}

                                {isClockedIn && lastLog && (
                                    <Box mt={1} bgcolor="rgba(255,255,255,0.15)" borderRadius={2} p={0.5} mx={2}>
                                        <Stack direction="row" justifyContent="space-around" divider={<Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />}>
                                            <Box>
                                                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.7rem' }}>
                                                    IN AT
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {dayjs(lastLog.timestamp).format("hh:mm A")}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.7rem' }}>
                                                    DURATION
                                                </Typography>
                                                <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                                                    {(() => {
                                                        const diff = currentTime.diff(dayjs(lastLog.timestamp));
                                                        if (diff < 0) return "00:00:00";
                                                        const h = Math.floor(diff / 3600000);
                                                        const m = Math.floor((diff % 3600000) / 60000);
                                                        const s = Math.floor((diff % 60000) / 1000);
                                                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                                                    })()}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                )}
                            </Paper>

                            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom color="text.secondary" fontWeight="bold">
                                    Control Panel
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Stack direction="row" spacing={2} width="100%" mb={2}>
                                    <LoadingButton
                                        variant="contained"
                                        color="success"
                                        size="medium"
                                        fullWidth
                                        loading={loading}
                                        disabled={lastLog?.type === 'in'}
                                        onClick={() => handleAttendance("in")}
                                        startIcon={<Place />}
                                        sx={{ py: 1.5, borderRadius: 2 }}
                                    >
                                        Check In
                                    </LoadingButton>

                                    <LoadingButton
                                        variant="contained"
                                        color="warning"
                                        size="medium"
                                        fullWidth
                                        loading={loading}
                                        disabled={!lastLog || lastLog.type === 'out'}
                                        onClick={() => handleAttendance("out")}
                                        startIcon={<Logout />}
                                        sx={{ py: 1.5, borderRadius: 2 }}
                                    >
                                        Check Out
                                    </LoadingButton>
                                </Stack>

                                {/* Geolocaton Status Alert */}
                                <Paper elevation={0} sx={{
                                    p: 2,
                                    mb: 2,
                                    borderRadius: 2,
                                    bgcolor: locationStatus.fetching ? 'info.50' : locationStatus.error ? 'error.50' : locationStatus.isInside ? 'success.50' : 'warning.50',
                                    border: '1px solid',
                                    borderColor: locationStatus.fetching ? 'info.main' : locationStatus.error ? 'error.main' : locationStatus.isInside ? 'success.main' : 'warning.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}>
                                    {locationStatus.fetching ? (
                                        <CircularProgress size={24} color="info" />
                                    ) : locationStatus.error ? (
                                        <LocationOn color="error" fontSize="large" />
                                    ) : (
                                        <LocationOn color={locationStatus.isInside ? "success" : "warning"} fontSize="large" />
                                    )}
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                                            {locationStatus.fetching ? "Detecting Location..." :
                                                locationStatus.error ? "Location Error" :
                                                    locationStatus.isInside ? "You are in an Allowed Zone" : "You are OUTSIDE Allowed Zone"}
                                        </Typography>
                                        {!locationStatus.fetching && !locationStatus.error && (
                                            <Typography variant="body2" color="text.secondary">
                                                {locationStatus.isInside
                                                    ? "Ready to Check In."
                                                    : `Distance to zone: ${locationStatus.distance ? locationStatus.distance.toFixed(0) + 'm' : 'Unknown'}`
                                                }
                                            </Typography>
                                        )}
                                        {locationStatus.error && (
                                            <Typography variant="body2" color="error">
                                                {locationStatus.error}
                                            </Typography>
                                        )}
                                        {/* Warning if no zones */}
                                        {isGeofencingEnabled && zones.length === 0 && (
                                            <Typography variant="body2" color="error" fontWeight="bold">
                                                ⚠️ No Allowed Zones Configured! Contact Administrator.
                                            </Typography>
                                        )}
                                    </Box>
                                </Paper>

                                {/* Common Map Component */}
                                <Box sx={{
                                    borderRadius: 3,
                                    bgcolor: 'background.default',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    height: 500
                                }}>
                                    <AttendanceZonesMap
                                        companyConfig={employee?.company}
                                        employeeOverrides={employee?.attendanceOverrides}
                                        userLocation={locationStatus.coords ? {
                                            lat: locationStatus.coords.latitude,
                                            lng: locationStatus.coords.longitude,
                                            accuracy: locationStatus.coords.accuracy
                                        } : undefined}
                                        height={500}
                                        interactive={true}
                                        fitBounds={true}
                                    />
                                </Box>
                            </Paper>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} lg={7}>
                        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', height: '100%', maxHeight: 800, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <History color="primary" />
                                <Typography variant="h6" fontWeight="bold">Recent Activity</Typography>
                                <Chip label="Last 20 Records" size="small" variant="outlined" sx={{ ml: 'auto' }} />
                            </Box>
                            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto', flexGrow: 1 }}>
                                <Table size="medium" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Shift</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Time</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Verification</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadingLogs ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                                    <CircularProgress size={24} />
                                                </TableCell>
                                            </TableRow>
                                        ) : logs.length > 0 ? (
                                            logs.slice(0, 20).map((log: any) => (
                                                <TableRow key={log._id} hover>
                                                    <TableCell>
                                                        <Chip
                                                            label={log.type?.toUpperCase()}
                                                            size="small"
                                                            color={log.type === 'in' ? "success" : "warning"}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="500">
                                                            {log.shift?.name || '-'}
                                                        </Typography>
                                                        {log.shift?.startTime && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {log.shift.startTime} - {log.shift.endTime}
                                                            </Typography>
                                                        )}
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
                                                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
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
            </CardContent>
        </Card>
    );
};

export default EmployeeAttendance;
