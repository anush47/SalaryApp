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
    Backdrop,
    Zoom,
} from "@mui/material";
import {
    ArrowBack,
    CheckCircle,
    Error as ErrorIcon,
    AccessTime,
    Videocam,
    VideocamOff,
    FaceRetouchingNatural,
    Coffee,
    Warning as WarningIcon,
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
    const [mounted, setMounted] = useState(false);

    // Overlay State
    const [overlayData, setOverlayData] = useState<{
        name: string;
        type: "in" | "out" | "info" | "warning";
        greeting: string;
        time: string;
        isError?: boolean;
        shiftName?: string;
    } | null>(null);
    const [overlayOpen, setOverlayOpen] = useState(false);

    // Auto-hide overlay after 3 seconds
    useEffect(() => {
        if (overlayOpen) {
            const timer = setTimeout(() => {
                setOverlayOpen(false);
                // Don't clear overlayData immediately to allow exit animation
                setLastResult(null); // Clear the small alert too
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [overlayOpen]);

    const getGreeting = () => {
        const hour = dayjs().hour();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

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

            // Show Overlay
            const greeting = result.type === 'in' ? getGreeting() : "Goodbye";
            setOverlayData({
                name: result.employeeName,
                type: result.type,
                greeting: greeting,
                time: dayjs().format("h:mm A"),
                shiftName: result.shiftName // Pass shift name to overlay
            });

            setOverlayOpen(true);

        } catch (err: any) {
            const errorMessage = err.message || "Failed to mark attendance";

            // Check for "wait" message (Cooldown)
            if (errorMessage.toLowerCase().includes("wait") && errorMessage.toLowerCase().includes("minute")) {
                const match = errorMessage.match(/(\d+)\s*more minute/);
                const minutes = match ? match[1] : "?";

                // Show Warning Overlay
                setOverlayData({
                    name: "", // Remove "Take a breather" / "Please Wait" text
                    type: "warning",
                    greeting: "Already Scanned",
                    time: `Wait ${minutes}m`,
                    isError: true
                });
                setOverlayOpen(true);
            } else {
                setError(errorMessage);
            }
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

            <Container maxWidth={false}>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <IconButton
                        onClick={() => router.push("/kiosk")}
                        sx={{ bgcolor: "background.paper" }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h5" fontWeight="bold">
                        Mark Attendance
                    </Typography>
                </Stack>

                {/* Main Content */}
                {/* Main Content */}
                {/* Main Content */}
                {/* Main Content */}
                <Box sx={{ position: "relative", display: "flex", flexDirection: { xs: "column", lg: "row" }, justifyContent: "center", alignItems: "center" }}>
                    {/* Centered Camera Section */}
                    <Box sx={{ width: "100%", maxWidth: "600px", zIndex: 2 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 4,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider",
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ py: 1, position: 'relative' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <AccessTime sx={{ fontSize: 32, color: "primary.main" }} />
                                    <Box>
                                        <Typography
                                            variant="h3"
                                            fontWeight="800"
                                            sx={{
                                                letterSpacing: -1,
                                                lineHeight: 1,
                                                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" }
                                            }}
                                        >
                                            {mounted ? currentTime.format("hh:mm:ss A") : "--:--:-- --"}
                                        </Typography>
                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
                                            {mounted ? currentTime.format("dddd, D MMMM YYYY") : "Loading..."}
                                        </Typography>
                                    </Box>
                                </Box>
                                {cameraActive && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={stopCamera}
                                        sx={{
                                            position: { sm: 'absolute' },
                                            right: { sm: 0 },
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Stop
                                    </Button>
                                )}
                            </Stack>

                            <Divider />

                            {/* Camera Section */}
                            <Box
                                sx={{
                                    position: "relative",
                                    width: "100%",
                                    height: { xs: "50vh", sm: "60vh", md: "400px" },
                                    bgcolor: "black",
                                    borderRadius: 3,
                                    overflow: "hidden",
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
                                            bgcolor: "action.hover",
                                        }}
                                    >
                                        <Videocam sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                                        <Typography color="text.secondary">Camera Stopped</Typography>
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
                                                maxHeight: "350px",
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

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
                                {cameraActive && (
                                    null
                                )}
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    color="primary"
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
                                        py: 1.5,
                                        fontSize: "1.1rem",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: 700,
                                        boxShadow: "none",
                                    }}
                                >
                                    {loading ? "Verifying..." : (cameraActive ? "Mark Attendance Now" : "Start Camera")}
                                </Button>
                            </Stack>

                            {error && (
                                <Alert severity="error" icon={<ErrorIcon />} onClose={() => setError("")} sx={{ borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            {lastResult && (
                                <Alert
                                    severity="success"
                                    icon={<CheckCircle fontSize="large" />}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {lastResult.employeeName} - {lastResult.type.toUpperCase()}
                                    </Typography>
                                </Alert>
                            )}
                        </Paper>
                    </Box>

                    {/* Recent Activity - Absolute Right on Desktop */}
                    {recentAttendance.length > 0 && (
                        <Box
                            sx={{
                                position: { xs: "static", lg: "absolute" },
                                right: 0,
                                top: 0,
                                width: { xs: "100%", lg: 300 },
                                mt: { xs: 3, lg: 0 },
                                zIndex: 1,
                                height: { lg: "100%" },
                                overflowY: { lg: "auto" },
                                maxHeight: { lg: "calc(100vh - 100px)" }
                            }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 4,
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <AccessTime color="action" />
                                        <Typography variant="h6" fontWeight="bold">
                                            Recent Activity
                                        </Typography>
                                    </Stack>
                                </Stack>
                                <Divider sx={{ mb: 2 }} />
                                <Stack spacing={1.5}>
                                    {recentAttendance.map((record, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: "action.hover",
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        bgcolor: record.type === "in" ? "success.main" : "info.main",
                                                        fontSize: "0.8rem",
                                                        fontWeight: "bold",
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
                                                <Typography
                                                    variant="caption"
                                                    fontWeight="bold"
                                                    sx={{
                                                        color: record.type === "in" ? "success.main" : "info.main",
                                                        textTransform: "uppercase"
                                                    }}
                                                >
                                                    {record.type}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Container>

            {/* Success Overlay */}
            <Backdrop
                sx={{
                    color: '#fff',
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    backdropFilter: 'blur(10px)',
                    flexDirection: 'column',
                    cursor: 'pointer'
                }}
                open={overlayOpen}
                onClick={() => {
                    setOverlayOpen(false);
                    setLastResult(null);
                }}
            >
                <Zoom in={overlayOpen} style={{ transitionDelay: overlayOpen ? '100ms' : '0ms' }}>
                    <Stack alignItems="center" spacing={4} sx={{ textAlign: 'center', p: 3 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    borderRadius: '50%',
                                    boxShadow: `0 0 60px ${overlayData?.type === 'warning' ? theme.palette.warning.main : (overlayData?.isError ? theme.palette.info.main : theme.palette.success.main)}`,
                                    opacity: 0.5,
                                    animation: 'pulse 2s infinite'
                                }}
                            />
                            {/* Icon Selection */}
                            {overlayData?.type === 'warning' ? (
                                <WarningIcon
                                    sx={{
                                        fontSize: 140,
                                        color: 'warning.main',
                                        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                        position: 'relative'
                                    }}
                                />
                            ) : overlayData?.isError ? (
                                <Coffee
                                    sx={{
                                        fontSize: 140,
                                        color: 'info.main',
                                        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                        position: 'relative'
                                    }}
                                />
                            ) : (
                                <CheckCircle
                                    sx={{
                                        fontSize: 140,
                                        color: 'success.main',
                                        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                        position: 'relative'
                                    }}
                                />
                            )}
                        </Box>

                        <Box>
                            <Typography
                                variant="h3"
                                fontWeight="700"
                                sx={{
                                    textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                                    mb: 1,
                                    color: 'rgba(255,255,255,0.9)'
                                }}
                            >
                                {overlayData?.greeting}
                            </Typography>

                            <Typography
                                variant="h4"
                                fontWeight="500"
                                sx={{
                                    opacity: 0.9,
                                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                    mb: 2
                                }}
                            >
                                {overlayData?.name}
                            </Typography>

                            <Typography
                                variant="h2"
                                fontWeight="900"
                                sx={{
                                    textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                                    mb: 2,
                                    letterSpacing: -1,
                                    maxWidth: '90vw', // Responsive width
                                    fontSize: { xs: '3rem', sm: '4rem', md: '5rem' } // Responsive font size
                                }}
                            >
                                {overlayData?.time}
                            </Typography>

                            {/* Show Shift Name if available */}
                            {overlayData?.shiftName && !overlayData?.isError && (
                                <Box sx={{ mb: 2 }}>
                                    <Chip
                                        label={`Shift: ${overlayData.shiftName}`}
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            fontSize: '1.2rem',
                                            height: 48,
                                            px: 2,
                                            mb: 2
                                        }}
                                    />
                                </Box>
                            )}

                            {!overlayData?.isError && (
                                <Chip
                                    label={overlayData?.type?.toUpperCase()}
                                    color={overlayData?.type === 'in' ? 'success' : 'info'}
                                    sx={{
                                        fontSize: '2rem',
                                        height: 56,
                                        px: 4,
                                        borderRadius: 28,
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                                        border: '2px solid rgba(255,255,255,0.2)'
                                    }}
                                />
                            )}
                        </Box>
                    </Stack>
                </Zoom>
            </Backdrop>

            <style jsx global>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.2; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
            `}</style>
        </Box >
    );

}
