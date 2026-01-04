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
    TextField,
    Tooltip,
    IconButton,
    Tabs,
    Tab
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LoadingButton } from "@mui/lab";
import { Place, AccessTime, History, CheckCircle, Logout, LocationOn, Cancel, Refresh, Warning, Smartphone } from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { markAttendance, getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { getActiveShift } from "@/app/lib/api/shiftsApi";
import { fetchCompany } from "@/app/lib/api/companyApi";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEffectiveAllowedZones, calculateDistance } from "@/app/lib/utils/attendanceUtils";
import { AttendanceZonesMap } from "@/app/components/attendance/AttendanceZonesMap";
import { useAttendanceAggregation } from "@/app/hooks/useAttendanceAggregation";
import { AttendanceRecordDialog } from "@/app/components/attendance/AttendanceRecordDialog";
import { DailyAttendanceTable } from "@/app/components/attendance/DailyAttendanceTable";
import { DailyAttendanceRecord } from "@/app/hooks/useAttendanceAggregation";
import AttendanceStatsChart from "@/app/components/attendance/AttendanceStatsChart";
import { TrendingUp, TrendingDown, AssignmentInd, EventNote, Map } from "@mui/icons-material";

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'live';

    const [loading, setLoading] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [tabValue, setTabValue] = useState(currentTab === 'history' ? 1 : 0);

    // Sync tabValue with currentTab from URL
    useEffect(() => {
        setTabValue(currentTab === 'history' ? 1 : 0);
    }, [currentTab]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        const tabName = newValue === 1 ? 'history' : 'live';
        router.push(`/user?userPageSelect=attendance&tab=${tabName}`, { scroll: false });
    };
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

    const companyId = employee?.company?._id || employee?.company;

    // 1.1 Fetch Company Details (needed for full configuration and shifts)
    const { data: companyProfile } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: !!companyId
    });



    // 2. Compute Effective Zones using Shared Logic
    const zonesData = useMemo(() => {
        if (!employee || !companyProfile) return { zones: [], isGeofencingEnabled: false, isRemoteAllowed: false };

        const company = companyProfile;
        const companyConfig = company.attendanceConfig || {};
        const employeeOverrides = employee.attendanceOverrides;

        const effectiveData = getEffectiveAllowedZones(company, employeeOverrides);
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
        if (!employee || !companyProfile) return [];
        const companyShifts = companyProfile.shiftSettings?.shifts || [];
        const employeeShifts = employee.shiftSettings?.shifts || [];
        return [...companyShifts, ...employeeShifts];
    }, [employee, companyProfile]);


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

    const refreshLocation = () => {
        if (!navigator.geolocation) return;
        setLocationStatus(prev => ({ ...prev, fetching: true, error: null }));
        navigator.geolocation.getCurrentPosition(
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
                let msg = "Unable to retrieve location";
                if (error.code === error.PERMISSION_DENIED) msg = "Permission denied";
                else if (error.code === error.TIMEOUT) msg = "Timeout - check GPS signal";
                else if (error.code === error.POSITION_UNAVAILABLE) msg = "Location unavailable";
                setLocationStatus(prev => ({ ...prev, error: msg, fetching: false }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };


    // 2. Fetch Recent Logs
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
        viewEndDate.format("YYYY-MM-DD"),
        tabValue === 1
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

    const deviceWarning = useMemo(() => {
        if (!currentDeviceId) return null;
        if (!lastLog) return "New Device: No history found";
        if (!lastLog.deviceId) return "New device detected - Identiy establishing";
        if (lastLog.deviceId !== currentDeviceId) return "New device detected - This will be flagged";
        return null;
    }, [currentDeviceId, lastLog]);

    const isDeviceChanged = !!deviceWarning;

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
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{ xs: "column", sm: "row" }} gap={{ xs: 1, sm: 2 }}>
                        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.25rem', sm: '2.125rem' } }}>
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
                                    sx={{ height: { xs: 32, sm: 40 }, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '1rem' }, fontWeight: 'bold' }}
                                />
                            </Stack>
                        )}
                    </Box>
                }
            />
            <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{ minHeight: { xs: 40, sm: 48 } }}
                    >
                        <Tab
                            icon={<Place sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                            iconPosition="start"
                            label="Live Attendance"
                            sx={{
                                minHeight: { xs: 40, sm: 48 },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                textTransform: 'none'
                            }}
                        />
                        <Tab
                            icon={<History sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                            iconPosition="start"
                            label="My Attendance"
                            sx={{
                                minHeight: { xs: 40, sm: 48 },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                textTransform: 'none'
                            }}
                        />
                    </Tabs>
                </Box>

                {tabValue === 0 && (
                    <Grid container spacing={4}>
                        <Grid item xs={12} lg={4}>
                            <Stack spacing={3}>
                                <Paper variant="outlined" sx={{
                                    textAlign: "center",
                                    py: { xs: 1.5, sm: 3 },
                                    px: 2,
                                    borderRadius: 3,
                                    borderLeft: '6px solid',
                                    borderLeftColor: isClockedIn ? 'success.main' : 'primary.main',
                                    bgcolor: 'background.paper'
                                }}>
                                    <AccessTime sx={{ fontSize: { xs: 18, sm: 32 }, mb: 0.5, color: isClockedIn ? 'success.main' : 'primary.main' }} />
                                    <Typography variant="h3" fontWeight="bold" sx={{ letterSpacing: -1, fontSize: { xs: '2.5rem', sm: '3rem' } }}>
                                        {currentTime.format("HH:mm:ss")}
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 0.5, fontSize: { xs: '0.75rem', sm: '1rem' } }}>
                                        {currentTime.format("dddd, D MMM YYYY")}
                                    </Typography>

                                    {activeShift && (
                                        <Box mt={1} bgcolor="action.hover" borderRadius={2} p={1}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                                                SCHEDULED SHIFT
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {activeShift.shift ? `${activeShift.shift.name} (${activeShift.shift.startTime} - ${activeShift.shift.endTime})` : (activeShift.isOffDay ? "Off Day" : "No Shift Assigned")}
                                            </Typography>
                                        </Box>
                                    )}

                                    {isClockedIn && lastLog && (
                                        <Box mt={1} bgcolor="success.lighter" borderRadius={2} p={1} border="1px solid" borderColor="success.light">
                                            <Stack direction="row" justifyContent="space-around" divider={<Divider orientation="vertical" flexItem />}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'success.dark', display: 'block', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                                        CLOCKED IN
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold" color="success.dark" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        {dayjs(lastLog.timestamp).format("hh:mm A")}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'success.dark', display: 'block', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                                        DURATION
                                                    </Typography>
                                                    <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="success.dark" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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

                                <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 1.5, sm: 2 } }}>
                                    <Typography variant="subtitle2" gutterBottom color="text.secondary" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                        Check In / Out
                                    </Typography>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Stack direction="row" spacing={1} width="100%" mb={1.5}>
                                        <LoadingButton
                                            variant="contained"
                                            color="success"
                                            size="large"
                                            fullWidth
                                            loading={loading || loadingLogs || locationStatus.fetching}
                                            disabled={lastLog?.type === 'in' || loadingLogs || locationStatus.fetching}
                                            onClick={() => handleAttendance("in")}
                                            startIcon={<Place sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                            sx={{
                                                py: { xs: 2.5, sm: 1.5 },
                                                borderRadius: 2,
                                                fontSize: { xs: '0.75rem', sm: '1rem' },
                                                whiteSpace: 'nowrap',
                                                minWidth: 0
                                            }}
                                        >
                                            Check In
                                        </LoadingButton>

                                        <LoadingButton
                                            variant="contained"
                                            color="warning"
                                            size="large"
                                            fullWidth
                                            loading={loading || loadingLogs || locationStatus.fetching}
                                            disabled={(!lastLog && !loadingLogs) || lastLog?.type === 'out' || loadingLogs || locationStatus.fetching}
                                            onClick={() => handleAttendance("out")}
                                            startIcon={<Logout sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                            sx={{
                                                py: { xs: 2.5, sm: 1.5 },
                                                borderRadius: 2,
                                                fontSize: { xs: '0.75rem', sm: '1rem' },
                                                whiteSpace: 'nowrap',
                                                minWidth: 0
                                            }}
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
                                        placeholder="Note for this check-in/out"
                                        sx={{ mb: 2 }}
                                        multiline
                                        rows={1}
                                    />

                                    <Box sx={{
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: locationStatus.fetching ? 'info.light' :
                                            (locationStatus.error || (!locationStatus.coords && !locationStatus.fetching)) ? 'error.light' :
                                                (!locationStatus.isInside || deviceWarning) ? 'warning.light' : 'success.light',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Row 1: Location Status */}
                                        <Box display="flex" alignItems="center" gap={2} sx={{
                                            p: 1.5,
                                            bgcolor: locationStatus.fetching ? 'info.lighter' :
                                                (locationStatus.error || (!locationStatus.coords && !locationStatus.fetching)) ? 'error.lighter' :
                                                    !locationStatus.isInside ? 'warning.lighter' : 'success.lighter',
                                            borderBottom: deviceWarning && !locationStatus.fetching ? '1px solid' : 'none',
                                            borderColor: 'divider'
                                        }}>
                                            {locationStatus.fetching ? (
                                                <CircularProgress size={24} color="info" />
                                            ) : (
                                                <LocationOn color={locationStatus.isInside ? "success" : (locationStatus.error || (!locationStatus.coords && !locationStatus.fetching) ? "error" : (strictEnforce ? "error" : "warning"))} />
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                                                    {locationStatus.fetching ? "Detecting location..." :
                                                        locationStatus.error ? "LOCATION PROBLEM" :
                                                            !locationStatus.coords ? "LOCATION NOT FOUND" :
                                                                locationStatus.isInside ? "Within Allowed Zone" : "OUTSIDE ALLOWED ZONE"}
                                                </Typography>

                                                {locationStatus.error ? (
                                                    <Typography variant="caption" color="error.dark" sx={{ display: 'block', fontWeight: 'bold' }}>
                                                        {locationStatus.error}
                                                    </Typography>
                                                ) : (locationStatus.distance !== null && !locationStatus.isInside) ? (
                                                    <Typography variant="body2" color="error.main" fontWeight="bold">
                                                        {locationStatus.distance.toFixed(0)}m away
                                                    </Typography>
                                                ) : !locationStatus.coords && !locationStatus.fetching ? (
                                                    <Typography variant="caption" color="error.dark" sx={{ display: 'block' }}>
                                                        Please enable GPS or grant permission.
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                            {!locationStatus.fetching && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color={locationStatus.isInside ? "success" : "inherit"}
                                                    onClick={refreshLocation}
                                                    sx={{
                                                        minWidth: 0,
                                                        px: 1.5,
                                                        fontSize: '0.65rem',
                                                        height: 32,
                                                        borderRadius: 1.5
                                                    }}
                                                    startIcon={<Refresh sx={{ fontSize: '0.85rem !important' }} />}
                                                >
                                                    RETRY
                                                </Button>
                                            )}
                                        </Box>

                                        {/* Row 2: Device Warning */}
                                        {deviceWarning && !locationStatus.fetching && (
                                            <Box display="flex" alignItems="center" gap={2} sx={{
                                                p: 1.5,
                                                bgcolor: 'warning.lighter'
                                            }}>
                                                <Smartphone sx={{ color: 'warning.dark', fontSize: '1.2rem' }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem', color: 'warning.dark' }}>
                                                        IDENTITY NOT VERIFIED
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 'bold', display: 'block' }}>
                                                        {deviceWarning}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>

                                </Paper>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} lg={8}>
                            <Box sx={{
                                borderRadius: 3,
                                bgcolor: 'background.default',
                                border: '1px solid',
                                borderColor: 'divider',
                                overflow: 'hidden',
                                height: { xs: 400, lg: 650 },
                                minHeight: 400
                            }}>
                                <AttendanceZonesMap
                                    companyConfig={employee?.company}
                                    employeeOverrides={employee?.attendanceOverrides}
                                    userLocation={locationStatus.coords ? {
                                        lat: locationStatus.coords.latitude,
                                        lng: locationStatus.coords.longitude,
                                        accuracy: locationStatus.coords.accuracy
                                    } : undefined}
                                    height="100%"
                                    interactive={true}
                                    fitBounds={true}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {tabValue === 1 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'action.hover' }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={7}>
                                        <Box display="flex" gap={1} sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                            {[
                                                { label: 'Today', value: 'today' },
                                                { label: 'Yesterday', value: 'yesterday' },
                                                { label: 'Last 7 Days', value: 'last7' },
                                                { label: 'This Month', value: 'thisMonth' },
                                                { label: 'Last Month', value: 'lastMonth' },
                                            ].map((r) => (
                                                <Chip
                                                    key={r.value}
                                                    label={r.label}
                                                    size="small"
                                                    onClick={() => setQuickRange(r.value as any)}
                                                    color={(() => {
                                                        const today = dayjs().startOf('day');
                                                        const yesterday = dayjs().subtract(1, 'day').startOf('day');
                                                        const startOfMonth = dayjs().startOf('month');
                                                        const lastMonthStart = dayjs().subtract(1, 'month').startOf('month');
                                                        const last7Days = dayjs().subtract(7, 'day').startOf('day');

                                                        let isActive = false;
                                                        if (r.value === 'today') isActive = viewStartDate.isSame(today);
                                                        else if (r.value === 'yesterday') isActive = viewStartDate.isSame(yesterday) && viewEndDate.isSame(dayjs().subtract(1, 'day').endOf('day'));
                                                        else if (r.value === 'thisMonth') isActive = viewStartDate.isSame(startOfMonth);
                                                        else if (r.value === 'lastMonth') isActive = viewStartDate.isSame(lastMonthStart);
                                                        else if (r.value === 'last7') isActive = viewStartDate.isSame(last7Days);

                                                        return isActive ? 'primary' : 'default';
                                                    })()}
                                                    variant={(() => {
                                                        const today = dayjs().startOf('day');
                                                        const yesterday = dayjs().subtract(1, 'day').startOf('day');
                                                        const startOfMonth = dayjs().startOf('month');
                                                        const lastMonthStart = dayjs().subtract(1, 'month').startOf('month');
                                                        const last7Days = dayjs().subtract(7, 'day').startOf('day');

                                                        let isActive = false;
                                                        if (r.value === 'today') isActive = viewStartDate.isSame(today);
                                                        else if (r.value === 'yesterday') isActive = viewStartDate.isSame(yesterday) && viewEndDate.isSame(dayjs().subtract(1, 'day').endOf('day'));
                                                        else if (r.value === 'thisMonth') isActive = viewStartDate.isSame(startOfMonth);
                                                        else if (r.value === 'lastMonth') isActive = viewStartDate.isSame(lastMonthStart);
                                                        else if (r.value === 'last7') isActive = viewStartDate.isSame(last7Days);

                                                        return isActive ? 'filled' : 'outlined';
                                                    })()}
                                                    clickable
                                                />
                                            ))}
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={5}>
                                        <Box display="flex" gap={1} alignItems="center" justifyContent={{ md: 'flex-end' }}>
                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                <DatePicker
                                                    label="From"
                                                    value={viewStartDate}
                                                    onChange={(v) => {
                                                        if (v) {
                                                            if (viewEndDate.diff(v, 'month', true) > 3) {
                                                                showSnackbar({ message: "Date range cannot exceed 3 months", severity: "warning" });
                                                                return;
                                                            }
                                                            setViewStartDate(v);
                                                        }
                                                    }}
                                                    slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                                />
                                                <DatePicker
                                                    label="To"
                                                    value={viewEndDate}
                                                    onChange={(v) => {
                                                        if (v) {
                                                            if (v.diff(viewStartDate, 'month', true) > 3) {
                                                                showSnackbar({ message: "Date range cannot exceed 3 months", severity: "warning" });
                                                                return;
                                                            }
                                                            setViewEndDate(v);
                                                        }
                                                    }}
                                                    slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                                />
                                            </LocalizationProvider>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <DailyAttendanceTable
                                    records={displayRecords}
                                    loading={loadingDaily}
                                    userRole="employee"
                                    onEdit={setViewRecord}
                                    maxHeight={600}
                                />
                            </Paper>
                        </Grid>

                        <Grid item xs={12}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={4}>
                                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>Statistics</Typography>
                                            <Divider sx={{ mb: 2 }} />
                                            <Stack spacing={2}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <CheckCircle color="success" sx={{ fontSize: 18 }} />
                                                        <Typography color="text.secondary">Present Days</Typography>
                                                    </Box>
                                                    <Typography fontWeight="bold">{dailyStats.workedDays}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Cancel color="error" sx={{ fontSize: 18 }} />
                                                        <Typography color="text.secondary">Absent Days</Typography>
                                                    </Box>
                                                    <Typography fontWeight="bold" color="error.main">{dailyStats.absent}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <EventNote color="warning" sx={{ fontSize: 18 }} />
                                                        <Typography color="text.secondary">Leaves</Typography>
                                                    </Box>
                                                    <Typography fontWeight="bold" color="warning.main">{dailyStats.leaves}</Typography>
                                                </Box>
                                                <Divider />
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <AccessTime color="primary" sx={{ fontSize: 18 }} />
                                                        <Typography color="text.secondary">Total Hours</Typography>
                                                    </Box>
                                                    <Typography fontWeight="bold">{dailyStats.totalHours}h</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <TrendingUp color="success" sx={{ fontSize: 18 }} />
                                                        <Typography color="text.secondary">OT Hours</Typography>
                                                    </Box>
                                                    <Typography fontWeight="bold" color="success.main">{dailyStats.totalOT}h</Typography>
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>Work Hours Analysis</Typography>
                                            <Divider sx={{ mb: 2 }} />
                                            <Box sx={{ p: 1 }}>
                                                <AttendanceStatsChart data={dailyRecords} height={250} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                )}
            </CardContent>

            <AttendanceRecordDialog
                open={!!viewRecord}
                onClose={() => setViewRecord(null)}
                dailyRecord={viewRecord}
                employee={employee}
                companyConfig={companyProfile}
                shifts={allShifts}
                readOnly={true}
                disableTabSwitch={true}
            />
        </Card>
    );
};

export default EmployeeAttendance;
