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
    TableRow,
    TextField,
    Tooltip,
    IconButton
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LoadingButton } from "@mui/lab";
import { Place, AccessTime, History, CheckCircle, Logout, LocationOn, Cancel } from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { markAttendance, getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { getActiveShift } from "@/app/lib/api/shiftsApi";
import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEffectiveAllowedZones, calculateDistance } from "@/app/lib/utils/attendanceUtils";
import { AttendanceZonesMap } from "@/app/components/attendance/AttendanceZonesMap";
import { useAttendanceAggregation } from "@/app/hooks/useAttendanceAggregation";
import { AttendanceRecordDialog } from "@/app/components/attendance/AttendanceRecordDialog";
import { DailyAttendanceTable } from "@/app/components/attendance/DailyAttendanceTable";
import { DailyAttendanceRecord } from "@/app/hooks/useAttendanceAggregation";

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
    const [remarks, setRemarks] = useState("");
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [locationStatus, setLocationStatus] = useState<{
        isInside: boolean;
        distance: number | null;
        error: string | null;
        fetching: boolean;
        coords: { latitude: number; longitude: number; accuracy: number } | null;
    }>({ isInside: false, distance: null, error: null, fetching: true, coords: null });

    // View Date Range State
    const [viewStartDate, setViewStartDate] = useState(dayjs().startOf('month'));
    const [viewEndDate, setViewEndDate] = useState(dayjs().endOf('month'));

    const setQuickRange = (range: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
        switch (range) {
            case 'today':
                setViewStartDate(dayjs().startOf('day'));
                setViewEndDate(dayjs().endOf('day'));
                break;
            case 'yesterday':
                setViewStartDate(dayjs().subtract(1, 'day').startOf('day'));
                setViewEndDate(dayjs().subtract(1, 'day').endOf('day'));
                break;
            case 'last7':
                setViewStartDate(dayjs().subtract(7, 'day').startOf('day'));
                setViewEndDate(dayjs());
                break;
            case 'thisMonth':
                setViewStartDate(dayjs().startOf('month'));
                setViewEndDate(dayjs().endOf('month'));
                break;
            case 'lastMonth':
                setViewStartDate(dayjs().subtract(1, 'month').startOf('month'));
                setViewEndDate(dayjs().subtract(1, 'month').endOf('month'));
                break;
        }
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



    // 2. Compute Effective Zones using Shared Logic
    const zonesData = useMemo(() => {
        if (!employee) return { zones: [], isGeofencingEnabled: false, isRemoteAllowed: false };

        const companyConfig = employee.company?.attendanceConfig || {};
        const employeeOverrides = employee.attendanceOverrides;

        const effectiveData = getEffectiveAllowedZones(employee.company, employeeOverrides);
        const { zones, isGeofencingEnabled, enforceValidation } = effectiveData;

        // Check for remote check-in flag
        const isRemoteAllowed = employeeOverrides?.enabled && employeeOverrides.isRemote;
        const allowRemote = isRemoteAllowed ||
            employeeOverrides?.allowRemoteCheckIn ||
            employee.company?.attendanceConfig?.allowRemoteCheckIn ||
            employee.company?.allowRemoteCheckIn;

        return {
            zones,
            isGeofencingEnabled,
            enforceValidation,
            isRemoteAllowed: !!allowRemote
        };
    }, [employee]);

    const allShifts = useMemo(() => {
        if (!employee) return [];
        const companyShifts = employee.company?.shiftSettings?.shifts || [];
        const employeeShifts = employee.shiftSettings?.shifts || [];
        return [...companyShifts, ...employeeShifts];
    }, [employee]);


    const shouldShowMap = true; // User requested to show map in all cases
    // Actually, we should use the resolved enforceValidation from the memo
    const { zones: effectiveZones, isGeofencingEnabled: geoEnabled, enforceValidation: strictEnforce, isRemoteAllowed: remoteOk } = zonesData;
    const isStrictGeofencing = geoEnabled && !remoteOk && strictEnforce;


    useEffect(() => {
        if (!shouldShowMap) {
            setLocationStatus(prev => ({ ...prev, isInside: true, error: null, fetching: false, distance: null, coords: null }));
            return;
        }

        if (!navigator.geolocation) {
            setLocationStatus(prev => ({ ...prev, error: "Geolocation not supported", fetching: false, coords: null }));
            return;
        }

        // Check for secure context (HTTPS)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            setLocationStatus(prev => ({ ...prev, error: "Insecure Context: Geolocation requires HTTPS to function on most devices.", fetching: false, coords: null }));
            return;
        }

        let watchId: number;

        const startWatching = (highAccuracy: boolean) => {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    let isInsideAny = false;
                    let minDistance = Infinity;

                    if (effectiveZones.length > 0) {
                        effectiveZones.forEach(zone => {
                            const dist = calculateDistance(latitude, longitude, zone.lat, zone.lng);
                            if (dist < minDistance) minDistance = dist;
                            if (dist <= zone.radius) isInsideAny = true;
                        });
                    } else {
                        isInsideAny = !geoEnabled;
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
                    console.warn(`Geolocation watch error (highAccuracy=${highAccuracy}):`, error);

                    // Fallback to standard accuracy if High Accuracy fails/times out
                    if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
                        navigator.geolocation.clearWatch(watchId);
                        startWatching(false);
                        return;
                    }

                    let msg = "Unable to retrieve location";
                    if (error.code === error.PERMISSION_DENIED) {
                        msg = "Location permission denied. Please enable location access in your browser settings.";
                    } else if (error.code === error.TIMEOUT) {
                        msg = "Location detection timed out. Try moving to an area with better GPS/Network signal.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        msg = "Location information is unavailable. Ensure GPS is enabled on your device.";
                    }

                    setLocationStatus(prev => ({ ...prev, error: msg, fetching: false, coords: null }));
                },
                { enableHighAccuracy: highAccuracy, maximumAge: 10000, timeout: highAccuracy ? 15000 : 30000 }
            );
        };

        startWatching(true);

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [zonesData, shouldShowMap]);


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

    // 3. Unified Attendance View Hook
    const { records: dailyRecords, stats: dailyStats, loading: loadingDaily } = useAttendanceAggregation(
        employee?._id,
        employee?.company?._id || employee?.company,
        viewStartDate.format("YYYY-MM-DD"),
        viewEndDate.format("YYYY-MM-DD")
    );

    // Filter out days with no activity (neither in nor out)
    const displayRecords = useMemo(() => {
        return dailyRecords.filter(r => r.checkInTime || r.checkOutTime);
    }, [dailyRecords]);

    const [viewRecord, setViewRecord] = useState<DailyAttendanceRecord | null>(null);

    // State for Device ID check
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
    useEffect(() => {
        let deviceId = localStorage.getItem("attendance_device_id");
        if (!deviceId) {
            deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem("attendance_device_id", deviceId);
        }
        setCurrentDeviceId(deviceId);
    }, []);

    const isDeviceChanged = lastLog && currentDeviceId && lastLog.deviceId && lastLog.deviceId !== currentDeviceId;

    const handleAttendance = async (type: "in" | "out") => {
        // Geolocation Check
        if (!navigator.geolocation) {
            showSnackbar({ message: "Geolocation is not supported by your browser", severity: "error" });
            return;
        }

        // If inside Strict Zone and we know we are outside, block.
        if (isStrictGeofencing && !locationStatus.isInside && locationStatus.coords) {
            showSnackbar({ message: "You are outside the allowed area. Cannot check in.", severity: "error" });
            return;
        }

        setLoading(true);

        const getLocation = (highAccuracy: boolean = true): Promise<{ lat: number, lng: number, accuracy: number } | null> => {
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        console.warn(`Geolocation error (highAccuracy=${highAccuracy}):`, error);

                        // Fallback to standard accuracy if High Accuracy fails or times out
                        if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
                            resolve(getLocation(false));
                            return;
                        }

                        // If cached location exists, use it
                        if (locationStatus.coords) {
                            resolve({
                                lat: locationStatus.coords.latitude,
                                lng: locationStatus.coords.longitude,
                                accuracy: (locationStatus.coords as any).accuracy || 20
                            });
                        } else {
                            // Proceed without location (returns null)
                            resolve(null);
                        }
                    },
                    { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 15000 : 30000, maximumAge: 10000 }
                );
            });
        };

        // Determine Location Logic
        let locationPromise: Promise<{ lat: number, lng: number, accuracy: number } | null>;

        if (locationStatus.coords && !locationStatus.error) {
            console.log("Using cached location for ultra-fast check-in");
            locationPromise = Promise.resolve({
                lat: locationStatus.coords.latitude,
                lng: locationStatus.coords.longitude,
                accuracy: locationStatus.coords.accuracy
            });
        } else {
            console.log("No cached location, fetching fresh position...");
            locationPromise = getLocation();
        }

        try {
            const location = await locationPromise;
            // Use state device ID
            const deviceDetails = navigator.userAgent || "Unknown Device";
            const payload: any = { type, deviceId: currentDeviceId, deviceDetails, remarks };

            if (location) {
                payload.location = location;
            } else {
                payload.location = null;
            }

            // Warning for user
            if (!location) {
                showSnackbar({ message: "Checking in without location data (Location not detected).", severity: "warning" });
            }

            const res = await markAttendance(payload);

            if (res.success) {
                showSnackbar({ message: `Successfully Checked ${type === 'in' ? 'In' : 'Out'}!`, severity: "success" });
                setRemarks("");
                refetchLogs();
            } else {
                showSnackbar({ message: res.error?.message || "Failed to mark attendance", severity: "error" });
            }

        } catch (error) {
            console.error("Attendance Error:", error);
            let msg = "An error occurred";
            if (error instanceof Error) msg = error.message;
            showSnackbar({ message: msg, severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (loadingEmployee) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (!employee) {
        return <Box p={4}><Alert severity="error">Employee profile not found.</Alert></Box>;
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
                            <Paper variant="outlined" sx={{
                                textAlign: "center",
                                py: 3,
                                px: 2,
                                borderRadius: 3,
                                borderLeft: '6px solid',
                                borderLeftColor: isClockedIn ? 'success.main' : 'primary.main',
                                bgcolor: 'background.paper',
                                boxShadow: 'none'
                            }}>
                                <AccessTime sx={{ fontSize: 32, mb: 1, color: isClockedIn ? 'success.main' : 'primary.main' }} />
                                <Typography variant="h3" fontWeight="bold" sx={{ letterSpacing: -1, color: 'text.primary' }}>
                                    {currentTime.format("HH:mm:ss")}
                                </Typography>
                                <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                                    {currentTime.format("dddd, D MMM YYYY")}
                                </Typography>

                                {activeShift && (
                                    <Box mt={2} bgcolor="action.hover" borderRadius={2} p={1}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 'bold' }}>
                                            SCHEDULED SHIFT
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {activeShift.shift ? `${activeShift.shift.name} (${activeShift.shift.startTime} - ${activeShift.shift.endTime})` : (activeShift.isOffDay ? "Off Day" : "No Shift Assigned")}
                                        </Typography>
                                    </Box>
                                )}

                                {isClockedIn && lastLog && (
                                    <Box mt={2} bgcolor="success.lighter" borderRadius={2} p={1.5} border="1px solid" borderColor="success.light">
                                        <Stack direction="row" justifyContent="space-around" divider={<Divider orientation="vertical" flexItem />}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'success.dark', display: 'block', fontWeight: 'bold' }}>
                                                    CLOCKED IN
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold" color="success.dark">
                                                    {dayjs(lastLog.timestamp).format("hh:mm A")}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'success.dark', display: 'block', fontWeight: 'bold' }}>
                                                    TOTAL DURATION
                                                </Typography>
                                                <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="success.dark">
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

                                <TextField
                                    label="Remarks (Optional)"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="e.g. Traffic delay, Personal work"
                                    sx={{ mb: 2 }}
                                    multiline
                                    rows={2}
                                />

                                {/* Device Change Warning */}
                                {/* Combined Environment Status */}
                                <Paper elevation={0} sx={{
                                    p: 2,
                                    mb: 2,
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}>
                                    <Stack spacing={2}>
                                        {/* Location Section */}
                                        <Box display="flex" alignItems="center" gap={2} sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: locationStatus.fetching ? 'info.lighter' : locationStatus.error ? 'error.lighter' : locationStatus.isInside ? 'success.lighter' : 'warning.lighter'
                                        }}>
                                            {locationStatus.fetching ? (
                                                <CircularProgress size={24} color="info" />
                                            ) : locationStatus.error ? (
                                                <LocationOn color="error" fontSize="large" />
                                            ) : (
                                                <LocationOn color={locationStatus.isInside ? "success" : (strictEnforce ? "error" : "warning")} fontSize="large" />
                                            )}
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {locationStatus.fetching ? "Detecting Location..." :
                                                        locationStatus.error ? "Location Error" :
                                                            locationStatus.isInside ? "You are in an Allowed Zone" : (strictEnforce ? "Restriction: Outside Allowed Zone" : "Warning: Outside Allowed Zone")}
                                                </Typography>
                                                {!locationStatus.fetching && !locationStatus.error && (
                                                    <Typography variant="caption" display="block">
                                                        {locationStatus.isInside
                                                            ? "GPS verification successful."
                                                            : `Distance to nearest zone: ${locationStatus.distance ? locationStatus.distance.toFixed(0) + 'm' : 'Unknown'}`
                                                        }
                                                    </Typography>
                                                )}
                                                {locationStatus.error && <Typography variant="caption" color="error">{locationStatus.error}</Typography>}
                                            </Box>
                                        </Box>

                                        {/* Device Section */}
                                        {isDeviceChanged && (
                                            <>
                                                {/* <Divider /> */}
                                                <Box display="flex" alignItems="center" gap={2} sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: 'warning.lighter'
                                                }}>
                                                    <History color="warning" fontSize="large" />
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                                                            New Device Detected
                                                        </Typography>
                                                        <Typography variant="caption" color="warning.dark">
                                                            Different from your last record. This event will be flagged.
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </>
                                        )}
                                    </Stack>
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
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <History color="primary" />
                                    <Typography variant="h6" fontWeight="bold">My Attendance</Typography>
                                </Box>
                                <Box ml={{ xs: 0, md: 'auto' }} display="flex" flexDirection="column" gap={1} alignItems={{ xs: 'stretch', md: 'flex-end' }} width={{ xs: '100%', md: 'auto' }}>
                                    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                                        {[
                                            { label: 'Today', value: 'today' },
                                            { label: 'Yesterday', value: 'yesterday' },
                                            { label: 'Last 7 Days', value: 'last7' },
                                            { label: 'This Month', value: 'thisMonth' },
                                            { label: 'Last Month', value: 'lastMonth' }
                                        ].map((r) => (
                                            <Chip
                                                key={r.value}
                                                label={r.label}
                                                size="small"
                                                onClick={() => setQuickRange(r.value as any)}
                                                color={viewStartDate.isSame(dayjs().startOf(r.value === 'today' ? 'day' : (r.value === 'thisMonth' ? 'month' : 'day' as any))) ? 'primary' : 'default'}
                                                variant={viewStartDate.isSame(dayjs().startOf(r.value === 'today' ? 'day' : (r.value === 'thisMonth' ? 'month' : 'day' as any))) ? 'filled' : 'outlined'}
                                                clickable
                                                sx={{ borderRadius: 1 }}
                                            />
                                        ))}
                                    </Stack>
                                    <Box display="flex" gap={2} alignItems="center" flexDirection={{ xs: 'column', sm: 'row' }}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <Box display="flex" gap={1} alignItems="center" width={{ xs: '100%', sm: 'auto' }}>
                                                <DatePicker
                                                    label="From"
                                                    value={viewStartDate}
                                                    onChange={(v) => v && setViewStartDate(v)}
                                                    slotProps={{ textField: { size: 'small', fullWidth: true, sx: { minWidth: 130 } } }}
                                                />
                                                <Typography>-</Typography>
                                                <DatePicker
                                                    label="To"
                                                    value={viewEndDate}
                                                    onChange={(v) => v && setViewEndDate(v)}
                                                    slotProps={{ textField: { size: 'small', fullWidth: true, sx: { minWidth: 130 } } }}
                                                />
                                            </Box>
                                        </LocalizationProvider>
                                        <Stack direction="row" spacing={1} divider={<Divider orientation="vertical" flexItem />}>
                                            <Chip label={`Worked: ${dailyStats.totalHours}h`} size="small" color="primary" variant="outlined" />
                                            <Chip label={`OT: ${dailyStats.totalOT}h`} size="small" color="success" variant="outlined" />
                                        </Stack>
                                    </Box>
                                </Box>
                            </Box>
                            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                                <DailyAttendanceTable
                                    records={displayRecords}
                                    loading={loadingDaily}
                                    userRole="employee"
                                    onEdit={setViewRecord}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </CardContent>

            <AttendanceRecordDialog
                open={!!viewRecord}
                onClose={() => setViewRecord(null)}
                dailyRecord={viewRecord}
                employee={employee} // Pass employee for context if needed, though view only
                companyConfig={employee?.company} // For map
                shifts={allShifts}
                readOnly={true}
                disableTabSwitch={true}
            />
        </Card>
    );
};

export default EmployeeAttendance;
