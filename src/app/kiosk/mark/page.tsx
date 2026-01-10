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
    useTheme,
    alpha,
    Chip,
    Avatar,
    Divider,
} from "@mui/material";
import {
    ArrowBack,
    CheckCircle,
    Error as ErrorIcon,
    AccessTime,
    Videocam,
    VideocamOff,
    FaceRetouchingNatural,
} from "@mui/icons-material";
import { markAttendance, AttendanceResult } from "@/app/lib/api/kioskApi";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import { ThemeSwitch } from "@/app/theme-provider";
import { detectFace, loadModels } from "@/app/lib/faceRecognition";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export default function KioskMarkPage() {
    const router = useRouter();
    const theme = useTheme();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cameraActive, setCameraActive] = useState(false);
    const [lastResult, setLastResult] = useState<AttendanceResult | null>(null);
    const [recentAttendance, setRecentAttendance] = useState<AttendanceResult[]>([]);
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Check API key and load models
    useEffect(() => {
        const storedKey = localStorage.getItem("kiosk_api_key");
        if (!storedKey) {
            router.push("/kiosk");
            return;
        }
        setApiKey(storedKey);
        loadModels().catch(console.error);
        startCamera();
    }, []);

    // Attach stream to video with safe play handling
    useEffect(() => {
        if (stream && videoRef.current && cameraActive) {
            const video = videoRef.current;
            video.srcObject = stream;

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented
                    // Show a UI element to let the user manually start playback
                    console.log("Video play failed:", error);
                });
            }
        }
    }, [stream, cameraActive]);

    // Update clock
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(dayjs()), 1000);
        return () => clearInterval(interval);
    }, []);

    const startCamera = async () => {
        if (cameraActive) return;
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            });
            setStream(mediaStream);
            setCameraActive(true);
        } catch (err: any) {
            setError(`Camera access failed: ${err.message}`);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setCameraActive(false);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    };

    const captureAndMark = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setLoading(true);
        setError("");
        setLastResult(null);

        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            // Ensure video dimensions are available
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                throw new Error("Video stream not ready yet");
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context not available");

            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg", 0.95);

            const img = new Image();
            img.src = imageData;
            await img.decode();

            const detection = await detectFace(img);
            if (!detection) {
                setError("No face detected! Please position your face in the frame.");
                setLoading(false);
                return;
            }

            const faceDescriptor = Array.from(detection.descriptor);

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });

            const result = await markAttendance(apiKey, {
                descriptor: faceDescriptor,
                image: imageData,
            }, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
            });

            setLastResult(result);
            setRecentAttendance(prev => [result, ...prev].slice(0, 10));
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
                minHeight: "100vh",
                background: gradientBackground,
                py: 3,
                color: theme.palette.text.primary,
                position: "relative",
            }}
        >
            <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
                <ThemeSwitch />
            </Box>

            <Container maxWidth="lg">
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <IconButton
                        onClick={() => router.push("/kiosk")}
                        sx={{
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            "&:hover": { bgcolor: alpha(theme.palette.background.paper, 0.8) },
                        }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h5" fontWeight="bold">
                        Mark Attendance
                    </Typography>
                </Stack>

                {/* Main Content */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
                    {/* Left Column: Clock & Camera */}
                    <Stack spacing={3} sx={{ flex: 1, width: "100%" }}>
                        {/* Clock */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                textAlign: "center",
                                borderRadius: 3,
                                bgcolor: alpha(theme.palette.background.paper, 0.6),
                                backdropFilter: "blur(20px)",
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                                <AccessTime sx={{ fontSize: 32, color: "primary.main" }} />
                                <Box>
                                    <Typography variant="h3" fontWeight="800" sx={{ letterSpacing: -1, lineHeight: 1 }}>
                                        {currentTime.format("HH:mm:ss")}
                                    </Typography>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
                                        {currentTime.format("dddd, D MMMM YYYY")}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        {/* Camera Section */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 4,
                                bgcolor: alpha(theme.palette.background.paper, 0.6),
                                backdropFilter: "blur(20px)",
                            }}
                        >
                            <Box
                                sx={{
                                    position: "relative",
                                    width: "100%",
                                    height: { xs: "50vh", sm: "60vh", md: "500px" },
                                    bgcolor: "black",
                                    borderRadius: 2,
                                    overflow: "hidden",
                                    mb: 2,
                                }}
                            >
                                {!cameraActive ? (
                                    <Box
                                        sx={{
                                            height: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <Videocam sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                                        <Typography color="text.secondary">Starting Camera...</Typography>
                                    </Box>
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                width: { xs: "70%", sm: "300px" },
                                                height: { xs: "50%", sm: "400px" },
                                                maxWidth: "300px",
                                                maxHeight: "400px",
                                                border: "2px dashed",
                                                borderColor: alpha(theme.palette.success.main, 0.7),
                                                borderRadius: "40%",
                                                boxShadow: `0 0 0 9999px ${alpha("#000", 0.5)}`,
                                                pointerEvents: "none",
                                            }}
                                        />
                                    </>
                                )}
                            </Box>

                            <canvas ref={canvasRef} style={{ display: "none" }} />

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                {cameraActive && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="large"
                                        startIcon={<VideocamOff />}
                                        onClick={stopCamera}
                                        sx={{
                                            py: 2,
                                            fontSize: "1.1rem",
                                            borderRadius: 3,
                                            textTransform: "none",
                                            fontWeight: 700,
                                            display: { xs: "flex", md: "none" } // Only show on mobile/tablet
                                        }}
                                    >
                                        Stop Camera
                                    </Button>
                                )}
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
                                    onClick={cameraActive ? captureAndMark : startCamera}
                                    disabled={loading}
                                    sx={{
                                        py: 2,
                                        fontSize: "1.1rem",
                                        borderRadius: 3,
                                        textTransform: "none",
                                        fontWeight: 700,
                                    }}
                                >
                                    {loading ? "Verifying..." : (cameraActive ? "Mark Attendance" : "Start Camera")}
                                </Button>
                            </Stack>

                            {error && (
                                <Alert severity="error" icon={<ErrorIcon />} onClose={() => setError("")} sx={{ mt: 2, borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            {lastResult && (
                                <Alert
                                    severity="success"
                                    icon={<CheckCircle fontSize="large" />}
                                    sx={{ mt: 2, borderRadius: 2 }}
                                >
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {lastResult.employeeName} - {lastResult.type.toUpperCase()}
                                    </Typography>
                                </Alert>
                            )}
                        </Paper>
                    </Stack>

                    {/* Right Column: Recent Activity */}
                    {recentAttendance.length > 0 && (
                        <Box sx={{ width: { xs: "100%", md: 350 }, flexShrink: 0 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 4,
                                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                                    backdropFilter: "blur(20px)",
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                    <AccessTime color="primary" />
                                    <Typography variant="h6" fontWeight="bold">
                                        Recent Activity
                                    </Typography>
                                    <Chip
                                        label="Live"
                                        color="error"
                                        size="small"
                                        sx={{
                                            height: 20,
                                            animation: "pulse 2s infinite",
                                            "@keyframes pulse": {
                                                "0%, 100%": { opacity: 1 },
                                                "50%": { opacity: 0.5 },
                                            },
                                        }}
                                    />
                                </Stack>
                                <Divider sx={{ mb: 2 }} />
                                <Stack spacing={1.5}>
                                    {recentAttendance.map((record, idx) => (
                                        <Paper
                                            key={idx}
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor:
                                                    record.type === "in"
                                                        ? alpha(theme.palette.success.main, 0.1)
                                                        : alpha(theme.palette.info.main, 0.1),
                                                border: "1px solid",
                                                borderColor:
                                                    record.type === "in"
                                                        ? alpha(theme.palette.success.main, 0.3)
                                                        : alpha(theme.palette.info.main, 0.3),
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        bgcolor: record.type === "in" ? "success.main" : "info.main",
                                                        fontSize: "0.9rem",
                                                    }}
                                                >
                                                    {record.employeeName.charAt(0)}
                                                </Avatar>
                                                <Box flex={1} minWidth={0}>
                                                    <Typography variant="subtitle2" fontWeight="600" noWrap>
                                                        {record.employeeName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {dayjs(record.timestamp).fromNow()}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={record.type.toUpperCase()}
                                                    size="small"
                                                    color={record.type === "in" ? "success" : "info"}
                                                    sx={{ fontWeight: 700, minWidth: 45 }}
                                                />
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Paper>
                        </Box>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}
