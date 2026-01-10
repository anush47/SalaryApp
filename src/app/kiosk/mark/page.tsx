"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    Container,
    Paper,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Stack,
    IconButton,
    Card,
    CardContent,
    Divider,
    useTheme,
    alpha,
    Chip,
} from "@mui/material";
import {
    ArrowBack,
    CheckCircle,
    Error,
    AccessTime,
    Videocam,
    FaceRetouchingNatural,
} from "@mui/icons-material";
import { markAttendance, AttendanceResult } from "@/app/lib/api/kioskApi";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime"; // Added relativeTime plugin
import { ThemeSwitch } from "@/app/theme-provider";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime); // Extend with relativeTime

export default function KioskMarkPage() {
    const router = useRouter();
    const theme = useTheme();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [apiKey, setApiKey] = useState("");
    const [companyTimezone, setCompanyTimezone] = useState("Asia/Colombo");
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cameraActive, setCameraActive] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null); // New stream state
    const [lastResult, setLastResult] = useState<AttendanceResult | null>(null);
    const [recentAttendance, setRecentAttendance] = useState<AttendanceResult[]>([]);

    // Load API key and company info
    useEffect(() => {
        const storedKey = localStorage.getItem("kiosk_api_key");
        if (!storedKey) {
            router.push("/kiosk");
            return;
        }
        setApiKey(storedKey);

        // Load company timezone from localStorage if available
        const companyInfo = localStorage.getItem("kiosk_company_info");
        if (companyInfo) {
            try {
                const info = JSON.parse(companyInfo);
                setCompanyTimezone(info.timezone || "Asia/Colombo");
            } catch (e) {
                console.error("Failed to parse company info");
            }
        }

        startCamera();

        return () => {
            stopCamera();
        };
    }, []);

    // Update clock every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(dayjs().tz(companyTimezone));
        }, 1000);

        return () => clearInterval(interval);
    }, [companyTimezone]);

    // Attach stream to video element when active
    useEffect(() => {
        if (cameraActive && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [cameraActive, stream]);

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 },
            });
            setStream(s);
            setCameraActive(true);
        } catch (err) {
            setError("Failed to access camera. Please grant camera permissions.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const captureAndMark = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setLoading(true);
        setError("");
        setLastResult(null);

        try {
            // Capture image
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL("image/jpeg", 0.8);

                // Generate placeholder face descriptor (128 dimensions)
                // In production, this would use face-api.js to extract real descriptors
                const placeholderDescriptor = Array.from({ length: 128 }, () => Math.random());

                // Get location if available
                let location;
                try {
                    // Short timeout for location to not block UI
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            timeout: 3000,
                            enableHighAccuracy: false, // faster
                        });
                    });
                    location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    };
                } catch (e) { /* ignore */ }

                // Mark attendance
                const result = await markAttendance(
                    apiKey,
                    {
                        descriptor: placeholderDescriptor,
                        image: imageData,
                    },
                    location
                );

                setLastResult(result);
                setRecentAttendance((prev) => [result, ...prev.slice(0, 10)]); // Keep last 10 records

                // Clear success message after 3 seconds
                setTimeout(() => {
                    setLastResult(null);
                }, 5000);
            }
        } catch (err: any) {
            setError(err.message || "Failed to mark attendance");
        } finally {
            setLoading(false);
        }
    };

    const gradientBackground =
        theme.palette.mode === "dark"
            ? "radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)"
            : "radial-gradient(circle at 50% 0%, #e0f2fe 0%, #ffffff 100%)";

    return (
        <Box
            sx={{
                height: "100vh", // Full viewport height
                background: gradientBackground,
                color: theme.palette.text.primary,
                position: "relative",
                overflow: "hidden", // Prevent full page scroll
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
                <ThemeSwitch />
            </Box>

            <Container
                maxWidth="xl"
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    pt: 3,
                    pb: 3
                }}
            >
                {/* Header - Compact */}
                <Stack direction="row" alignItems="center" spacing={2} mb={2} flexShrink={0}>
                    <IconButton onClick={() => router.push("/kiosk")} color="primary" sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                        "&:hover": { bgcolor: alpha(theme.palette.background.paper, 0.8) }
                    }}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h5" fontWeight="bold">
                        Mark Attendance
                    </Typography>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch" sx={{ flex: 1, minHeight: 0 }}>
                    {/* Left: Camera and Clock */}
                    <Box flex={1} sx={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
                        <Stack spacing={2} sx={{ height: "100%" }}>
                            {/* Live Clock - More compact */}
                            <Paper variant="outlined" sx={{
                                textAlign: "center",
                                py: 2,
                                px: 2,
                                borderRadius: 3,
                                borderLeft: '6px solid',
                                borderLeftColor: 'primary.main',
                                bgcolor: alpha(theme.palette.background.paper, 0.6),
                                backdropFilter: "blur(20px)",
                                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)',
                                flexShrink: 0,
                            }}>
                                <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                                    <AccessTime sx={{ fontSize: 32, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h3" fontWeight="800" sx={{ letterSpacing: -1, lineHeight: 1 }}>
                                            {currentTime.format("HH:mm:ss")}
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                            {currentTime.format("dddd, D MMMM YYYY")}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            {/* Camera Section - Fills remaining space */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 4,
                                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                                    backdropFilter: "blur(20px)",
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: 0,
                                }}
                            >
                                <Box
                                    sx={{
                                        position: "relative",
                                        flex: 1,
                                        width: "100%",
                                        bgcolor: "black",
                                        borderRadius: 3,
                                        overflow: "hidden",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: `1px solid ${theme.palette.divider}`,
                                        mb: 2,
                                        minHeight: 0,
                                    }}
                                >
                                    {!cameraActive ? (
                                        <Box textAlign="center">
                                            <Videocam sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                            <Typography color="text.secondary">Starting Camera...</Typography>
                                        </Box>
                                    ) : (
                                        <>
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "contain", // contain ensuring full view
                                                }}
                                            />
                                            {/* Face detection overlay */}
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    width: "300px", // fixed size optimal for face
                                                    height: "400px",
                                                    border: "2px dashed",
                                                    borderColor: alpha(theme.palette.success.main, 0.7),
                                                    borderRadius: "40%",
                                                    boxShadow: `0 0 0 9999px ${alpha('#000', 0.5)}`,
                                                    pointerEvents: "none",
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                }}
                                            />
                                        </>
                                    )}
                                </Box>

                                {/* Hidden canvas for capture */}
                                <canvas ref={canvasRef} style={{ display: "none" }} />

                                {/* Mark Attendance Button */}
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    color={cameraActive ? "success" : "inherit"}
                                    startIcon={
                                        loading ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            <FaceRetouchingNatural sx={{ fontSize: 24 }} />
                                        )
                                    }
                                    onClick={captureAndMark}
                                    disabled={loading || !cameraActive}
                                    sx={{
                                        py: 2,
                                        fontSize: "1.1rem",
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        flexShrink: 0
                                    }}
                                >
                                    {loading ? "Verifying..." : "Mark Attendance"}
                                </Button>

                                {/* Error Alert */}
                                {error && (
                                    <Alert severity="error" icon={<Error />} onClose={() => setError("")} sx={{ mt: 1, borderRadius: 2 }}>
                                        {error}
                                    </Alert>
                                )}

                                {/* Success Result */}
                                {lastResult && (
                                    <Alert
                                        severity="success"
                                        icon={<CheckCircle fontSize="large" />}
                                        sx={{ mt: 1, borderRadius: 2, alignItems: 'center' }}
                                    >
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {lastResult.employeeName} - {lastResult.type.toUpperCase()}
                                        </Typography>
                                    </Alert>
                                )}
                            </Paper>
                        </Stack>
                    </Box>

                    {/* Right: Recent Attendance - Scrollable independent list */}
                    <Box width={{ xs: "100%", md: 350, lg: 400 }} sx={{ height: "100%", minHeight: 0 }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 4,
                                bgcolor: alpha(theme.palette.background.paper, 0.6),
                                backdropFilter: "blur(20px)",
                                height: "100%",
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: "hidden"
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexShrink={0}>
                                <Typography variant="h6" fontWeight="800">
                                    Recent Activity
                                </Typography>
                                <Chip label="Live" color="error" size="small" sx={{
                                    height: 20,
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                        '0%': { opacity: 1 },
                                        '50%': { opacity: 0.5 },
                                        '100%': { opacity: 1 },
                                    }
                                }} />
                            </Stack>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={1.5} sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                                {recentAttendance.length === 0 ? (
                                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary" opacity={0.6}>
                                        <AccessTime sx={{ fontSize: 40, mb: 1 }} />
                                        <Typography variant="body2">No recent records</Typography>
                                    </Box>
                                ) : (
                                    recentAttendance.map((record, idx) => (
                                        <Card key={idx} variant="outlined" sx={{
                                            bgcolor: alpha(theme.palette.background.paper, 0.4),
                                            '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.8) }
                                        }}>
                                            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <Box
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                color: theme.palette.primary.main,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.9rem'
                                                            }}
                                                        >
                                                            {record.employeeName.charAt(0)}
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: 140 }}>
                                                                {record.employeeName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {dayjs(record.timestamp).fromNow()}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                    <Chip
                                                        label={record.type === "in" ? "IN" : "OUT"}
                                                        size="small"
                                                        color={record.type === "in" ? "success" : "warning"}
                                                        sx={{ height: 20, fontWeight: 'bold', fontSize: '0.7rem' }}
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </Stack>
                        </Paper>
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}
