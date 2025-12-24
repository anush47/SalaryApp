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

        setLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                try {
                    const res = await markAttendance({
                        type,
                        location: { lat: latitude, lng: longitude, accuracy }
                    });

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
            },
            (error) => {
                setLoading(false);
                let msg = "Unable to retrieve your location";
                if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied. Please allow location access.";
                showSnackbar({ message: msg, severity: "error" });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
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
                                py: 6,
                                borderRadius: 4,
                                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.2)'
                            }}>
                                <AccessTime sx={{ fontSize: 80, mb: 1, opacity: 0.9 }} />
                                <Typography variant="h1" fontWeight="bold" sx={{ letterSpacing: -2 }}>
                                    {currentTime.format("HH:mm:ss")}
                                </Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
                                    {currentTime.format("dddd, D MMMM YYYY")}
                                </Typography>
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
                                <Alert severity="info" sx={{ borderRadius: 2 }} icon={<LocationOn />}>
                                    Location verification is active. Ensure GPS is enabled.
                                </Alert>
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
            </CardContent>
        </Card>
    );
};

export default EmployeeAttendance;

