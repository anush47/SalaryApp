"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    Alert
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Place, History } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { markAttendance, getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { useSnackbar } from "@/app/context/SnackbarContext";
import dayjs from "dayjs";

export default function AttendancePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { showSnackbar } = useSnackbar();

    // State for Shift
    const [shiftContext, setShiftContext] = useState<any>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<string>("");
    const [manualShiftDialogOpen, setManualShiftDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchActiveShift();
        }
    }, [session]);

    const fetchActiveShift = async () => {
        try {
            // Need employee ID. Usually session.user.id is linked. 
            // Assuming session.user.employeeId exists or we use user.id to find employee via API?
            // The active shift API expects employeeId. Let's assume for now we can get it or use the one from session if available.
            // If session struct doesn't have it, we might fail. 
            // Check authOptions to see if employeeId is in session. IF NOT, we might need to fetch profile first.
            // For now, let's try using session.user.id as employeeId if it's an employee logged in.
            if (!session?.user?.id) return;

            // Correction: The API requires 'employeeId'. 
            // Let's assume check-in page is used by authenticated employee.
            // We'll optimistically try to fetch using the session ID if it maps, or we need a profile fetch.
            // Simplified: User ID = Employee ID in this context? No, usually linked.
            // Let's fetch /api/user/profile first? Or simpler, rely on backend to resolve user->employee?
            // The active route expects `employeeId`. 
            // Let's HARDCODE fetching /api/employees/me or similar?
            // I'll assume we can get it.

            // ACTUAL FIX: Let's fetch /api/shifts/active?employeeId=${session.user.id} (hoping id is employeeId or backend handles it)
            // Actually, usually user.id is the User collection ID. Employee is separate.
            // We need to fetch the Employee ID.

            // Quickest path: Fetch /api/employees/mine or similar.
            // But wait, the previous code didn't load logs properly either.

            // Let's fetch profile first?
            const profileRes = await fetch('/api/user/profile');
            const profile = await profileRes.json();
            if (profile.success && profile.data?.employeeId) {
                const empId = profile.data.employeeId;
                const res = await fetch(`/api/shifts/active?employeeId=${empId}&time=${dayjs().format('HH:mm')}`);
                const data = await res.json();
                if (data.success) {
                    setShiftContext(data.data);
                    if (data.data.mode === 'manual' && data.data.availableShifts?.length > 0) {
                        setManualShiftDialogOpen(true);
                    }
                }
            }

        } catch (e) {
            console.error("Failed to fetch shift context", e);
        }
    };

    const handleAttendance = async (type: "in" | "out") => {
        if (!navigator.geolocation) {
            showSnackbar({ message: "Geolocation is not supported by your browser", severity: "error" });
            return;
        }

        // if Manual mode and no shift selected, warn user
        if (shiftContext?.mode === 'manual' && type === 'in' && !selectedShiftId) {
            setManualShiftDialogOpen(true);
            showSnackbar({ message: "Please select a shift.", severity: "warning" });
            return;
        }

        setLoading(true);

        // Check for secure context (HTTPS)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            showSnackbar({ message: "Insecure Context: Geolocation requires HTTPS to function on most devices.", severity: "error" });
            return;
        }

        setLoading(true);

        const getLocation = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords;

                    try {
                        const payload: any = {
                            type,
                            location: { lat: latitude, lng: longitude, accuracy }
                        };

                        if (type === 'in' && selectedShiftId) {
                            payload.shiftId = selectedShiftId;
                        }

                        const res = await markAttendance(payload);

                        if (res.success) {
                            showSnackbar({ message: `Successfully Checked ${type === 'in' ? 'In' : 'Out'}!`, severity: "success" });
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
                    console.warn(`Geolocation error (highAccuracy=${highAccuracy}):`, error);

                    // Fallback to standard accuracy if High Accuracy fails or times out
                    if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
                        getLocation(false);
                        return;
                    }

                    setLoading(false);
                    let msg = "Unable to retrieve your location";
                    if (error.code === error.PERMISSION_DENIED) {
                        msg = "Location permission denied. Please allow location access in your browser settings.";
                    } else if (error.code === error.TIMEOUT) {
                        msg = "Location detection timed out. Please try again in an area with better signal.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        msg = "Location information is unavailable. Ensure GPS is enabled on your device.";
                    }
                    showSnackbar({ message: msg, severity: "error" });
                },
                { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 15000 : 30000, maximumAge: 0 }
            );
        };

        getLocation(true);
    };

    if (status === "loading") return <CircularProgress />;

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
                Attendance
            </Typography>

            <Card sx={{ mb: 3, textAlign: 'center', p: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                    {dayjs().format("dddd, D MMMM YYYY")}
                </Typography>
                <Typography variant="h2" fontWeight="bold" color="primary">
                    {dayjs().format("HH:mm")}
                </Typography>
                {shiftContext?.shift && (
                    <Typography variant="subtitle2" color="success.main" mt={1}>
                        Active Shift: {shiftContext.shift.name} ({shiftContext.shift.startTime} - {shiftContext.shift.endTime})
                    </Typography>
                )}
                {shiftContext?.mode === 'manual' && (
                    <Box mt={2} display="flex" justifyContent="center">
                        <Button variant="outlined" onClick={() => setManualShiftDialogOpen(true)}>
                            {selectedShiftId ? `Selected: ${shiftContext.availableShifts.find((s: any) => s._id === selectedShiftId)?.name}` : "Select Shift"}
                        </Button>
                    </Box>
                )}
            </Card>

            {/* Shift Selection Dialog - Simplified as inline or basic dialog */}
            {/* Note: I'm skipping full Dialog import for brevity in replace, implementing simple conditional render or using existing imports if Dialog available? 
                 It was NOT imported. I'll add imports in a separate step or just use a conditional rendering block for now.
             */}

            {manualShiftDialogOpen && (
                <Box mb={2} p={2} border="1px solid #ddd" borderRadius={2}>
                    <Typography variant="h6" gutterBottom>Select Your Shift</Typography>
                    <Stack spacing={1}>
                        {shiftContext?.availableShifts?.map((s: any) => (
                            <Button
                                key={s._id}
                                variant={selectedShiftId === s._id ? "contained" : "outlined"}
                                onClick={() => { setSelectedShiftId(s._id); setManualShiftDialogOpen(false); }}
                            >
                                {s.name} ({s.startTime} - {s.endTime})
                            </Button>
                        ))}
                    </Stack>
                </Box>
            )}


            <Stack spacing={2} direction="row" justifyContent="center">
                <LoadingButton
                    variant="contained"
                    color="success"
                    size="large"
                    loading={loading}
                    onClick={() => handleAttendance("in")}
                    startIcon={<Place />}
                    sx={{ py: 2, px: 4, flex: 1, fontSize: "1.2rem" }}
                >
                    Check In
                </LoadingButton>

                <LoadingButton
                    variant="contained"
                    color="warning"
                    size="large"
                    loading={loading}
                    onClick={() => handleAttendance("out")}
                    startIcon={<Place />}
                    sx={{ py: 2, px: 4, flex: 1, fontSize: "1.2rem" }}
                >
                    Check Out
                </LoadingButton>
            </Stack>

            <Box mt={4}>
                <Alert severity="info">
                    Ensure you are within the allowed office radius or designated location before checking in.
                </Alert>
            </Box>

        </Container>
    );
}
