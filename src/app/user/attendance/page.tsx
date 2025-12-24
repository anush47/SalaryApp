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

    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [fetchingLogs, setFetchingLogs] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signIn");
        }
    }, [status, router]);

    // Fetch today's logs on load
    const loadLogs = async () => {
        // We assume the user is an employee and use their first company (simplified for now)
        // In a real scenario, we might need a company selector if they work for multiple
        // But for the check-in PWA, usually it's context-aware or just the primary company
        // ATTENTION: This page needs the CompanyID. We'll look for it or assume the backend validates session user.
        // Actually, the API requires companyId for GET, but POST infers it from Employee record.
        // For GET logs, we need to know the companyID.
        // Let's defer GET Logs for a moment or fetch via a new "my-logs" endpoint which we didn't create yet.
        // OR we can make the GET endpoint generic for employees to find their own logs without passing companyID explicitly if we update the service.
        // For now, let's focus on the Check-In/Out action.
    };

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
                        // Refresh logs
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
            </Card>

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
