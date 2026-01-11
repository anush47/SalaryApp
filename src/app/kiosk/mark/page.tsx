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
    Avatar,
    Divider,
    LinearProgress,
} from "@mui/material";
import {
    ArrowBack,
    CheckCircle,
    Error as ErrorIcon,
    AccessTime,
    Videocam,
    FaceRetouchingNatural,
    Security,
} from "@mui/icons-material";
import { markAttendance, AttendanceResult, validateApiKey } from "@/app/lib/api/kioskApi";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import { ThemeSwitch } from "@/app/theme-provider";
import { getAllFaces, loadModels } from "@/app/lib/faceRecognition";
import { KioskOverlay, OverlayData, OverlayType } from "../components/KioskOverlay";
import { antiSpoofing } from "../utils/antiSpoofingClient";

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
    const [companyName, setCompanyName] = useState("");
    const [companyInfo, setCompanyInfo] = useState<Awaited<ReturnType<typeof validateApiKey>> | null>(null);

    // Overlay State
    const [overlayData, setOverlayData] = useState<OverlayData | null>(null);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Auto-hide overlay after 3 seconds
    useEffect(() => {
        if (overlayOpen) {
            const timer = setTimeout(() => {
                setOverlayOpen(false);
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

    /**
     * Unified Overlay Handler
     */
    const triggerOverlay = (
        type: OverlayType,
        opts: {
            name?: string;
            greeting?: string;
            time?: string;
            shiftName?: string;
            isError?: boolean;
            icon?: React.ReactNode;
            color?: string;
        } = {}
    ) => {
        const config: Record<OverlayType, any> = {
            in: {
                greeting: getGreeting(),
                name: opts.name || "Employee",
                time: dayjs().format("h:mm A"),
                isError: false
            },
            out: {
                greeting: "Goodbye",
                name: opts.name || "Employee",
                time: dayjs().format("h:mm A"),
                isError: false
            },
            info: {
                greeting: "Where's the face? 🔍",
                name: "Please position your face in the frame",
                time: "Scan Failed",
                isError: true
            },
            warning: {
                greeting: "Already Scanned",
                name: "Please wait a moment",
                time: opts.time || "Wait",
                isError: true
            },
            spoof: {
                greeting: "Something's Fishy! 🎣",
                name: "The camera might be playing tricks!",
                time: "Try Better Light",
                isError: true
            },
            crowded: {
                greeting: "Crowded! 🧑‍🤝‍🧑",
                name: "Only one person in frame, please",
                time: opts.time || "Faces detected",
                isError: true
            },
            unknown: {
                greeting: "Who's that? 🕵️‍♂️",
                name: "I don't think we've met yet! 😉",
                time: "Face Recognition Failed",
                isError: true
            },
            custom: {
                greeting: opts.greeting || "Custom!",
                name: opts.name || "Something happened",
                time: opts.time || "",
                isError: opts.isError
            }
        };

        const selected = config[type];
        setOverlayData({
            type,
            greeting: opts.greeting || selected.greeting,
            name: opts.name || selected.name,
            time: opts.time || selected.time,
            isError: opts.isError !== undefined ? opts.isError : selected.isError,
            shiftName: opts.shiftName,
            icon: opts.icon,
            color: opts.color
        });
        setOverlayOpen(true);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initialize System (API + Models + Config)
    useEffect(() => {
        const storedKey = localStorage.getItem("kiosk_api_key");
        if (!storedKey) {
            router.push("/kiosk");
            return;
        }
        setApiKey(storedKey);

        const initSystem = async () => {
            try {
                setLoadingProgress(10);

                // 1. Fetch Company Config
                const info = await validateApiKey(storedKey);
                setCompanyName(info.companyName);
                setCompanyInfo(info);
                setLoadingProgress(30);

                const promises: Promise<any>[] = [];

                // 2. Load Face Models
                promises.push(loadModels().then(() => {
                    // Approximate progress bump
                    setLoadingProgress(prev => Math.min(prev + 30, 90));
                }));

                // 3. Eager Load Anti-Spoofing if enabled
                if (info.attendanceConfig?.livenessDetection) {
                    console.log("[Mark] Pre-loading Anti-Spoofing Model...");
                    // This will warm up the WASM backend
                    promises.push(antiSpoofing.initialize().then(() => {
                        console.log("[Mark] Anti-Spoofing Ready");
                        setLoadingProgress(prev => Math.min(prev + 30, 90));
                    }));
                }

                await Promise.all(promises);

                setLoadingProgress(100);
                setModelsLoaded(true);

                // 4. Start Camera Automatically
                startCamera();

            } catch (err) {
                console.error("Initialization failed:", err);
                setError("Failed to initialize security systems. Please refresh.");
            }
        };

        initSystem();
    }, []);

    useEffect(() => {
        if (stream && videoRef.current && cameraActive) {
            const video = videoRef.current;
            video.srcObject = stream;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Video play failed:", error);
                });
            }
        }
    }, [stream, cameraActive]);

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

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
        console.log("[Mark] Starting captureAndMark...");
        if (!videoRef.current || !canvasRef.current) {
            console.log("[Mark] Missing video or canvas ref");
            return;
        }

        setLoading(true);
        setError("");
        setLastResult(null);

        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                throw new Error("Video stream not ready yet");
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context not available");

            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg", 0.95);
            console.log("[Mark] Image captured, length:", imageData.length);

            const img = new Image();
            img.src = imageData;
            await img.decode();

            // Client-Side Anti-Spoofing Check
            if (companyInfo?.attendanceConfig?.livenessDetection) {
                console.log("[Mark] Checking liveness...");
                try {
                    const spoofResult = await antiSpoofing.predict(img);
                    console.log("[Mark] Spoof result:", spoofResult);
                    if (!spoofResult.isReal) {
                        throw new Error("Something's Fishy! 🎣 The camera might be playing tricks. Try again in better light.");
                    }
                } catch (spoofErr) {
                    console.error("[Mark] Anti-spoofing fatal error:", spoofErr);
                    if ((spoofErr as Error).message.includes("Fishy")) {
                        throw spoofErr;
                    } else {
                        throw new Error("Liveness Check Failed");
                    }
                }
            }

            console.log("[Mark] Detecting faces...");
            const detections = await getAllFaces(img);
            console.log("[Mark] Detections found:", detections.length);

            if (detections.length === 0) {
                triggerOverlay("info", {
                    greeting: "No Face Detected",
                    name: "Please position your face in the frame"
                });
                setLoading(false);
                return;
            }

            if (detections.length > 1) {
                triggerOverlay("crowded", {
                    time: `${detections.length} faces detected`
                });
                setLoading(false);
                return;
            }

            const detection = detections[0];
            const faceDescriptor = Array.from(detection.descriptor) as number[];

            console.log("[Mark] Requesting geolocation...");
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            console.log("[Mark] Geolocation obtained:", position.coords);

            console.log("[Mark] Calling markAttendance API...");
            const result = await markAttendance(apiKey, {
                descriptors: [faceDescriptor],
            }, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
            });
            console.log("[Mark] API Result:", result);

            setLastResult(result);
            setRecentAttendance(prev => [result, ...prev].slice(0, 10));

            triggerOverlay(result.type as "in" | "out", {
                name: result.employeeName,
                shiftName: result.shiftName
            });

        } catch (err: any) {
            console.error("[Mark] Error in captureAndMark:", err);
            const errorMessage = err.message || "Failed to mark attendance";

            if (errorMessage.toLowerCase().includes("wait") && errorMessage.toLowerCase().includes("minute")) {
                const match = errorMessage.match(/(\d+)\s*more minute/);
                const minutes = match ? match[1] : "?";
                triggerOverlay("warning", { time: `Wait ${minutes}m` });
            } else if (errorMessage.includes("Something's Fishy")) {
                triggerOverlay("spoof");
            } else if (errorMessage.toLowerCase().includes("face not recognized")) {
                triggerOverlay("unknown");
            } else {
                triggerOverlay("info", { greeting: errorMessage });
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
                <Box sx={{ position: "relative", mb: { xs: 1, md: 3 }, minHeight: { xs: 40, md: 48 }, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconButton
                        onClick={() => router.push("/kiosk")}
                        sx={{
                            bgcolor: "background.paper",
                            padding: { xs: 0.5, md: 1 },
                            position: "absolute",
                            left: 0,
                            zIndex: 1
                        }}
                        size="small"
                    >
                        <ArrowBack fontSize="small" />
                    </IconButton>
                    <Box sx={{ overflow: "hidden", textAlign: "center", width: "100%", px: 5 }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <Typography
                                variant="h4"
                                fontWeight="800"
                                sx={{
                                    fontSize: { xs: "1.25rem", md: "2rem" },
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.2,
                                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    display: "block"
                                }}
                            >
                                {companyName || "Attendance Kiosk"}
                            </Typography>
                        </Stack>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                                fontSize: { xs: "0.75rem", md: "0.875rem" },
                                fontWeight: 500,
                                lineHeight: 1,
                                mt: 0.5
                            }}
                        >
                            Mark Your Attendance
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ position: "relative", display: "flex", flexDirection: { xs: "column", lg: "row" }, justifyContent: "center", alignItems: "center" }}>
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
                                {!modelsLoaded ? (
                                    // LOADING STATE
                                    <Box
                                        sx={{
                                            height: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexDirection: "column",
                                            bgcolor: "background.default",
                                            p: 4
                                        }}
                                    >
                                        <Security sx={{ fontSize: 64, color: "primary.main", mb: 2, opacity: 0.8 }} />
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            Initializing Security System
                                        </Typography>
                                        <Box sx={{ width: '100%', maxWidth: 300, mt: 2 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={loadingProgress}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: "action.hover",
                                                    "& .MuiLinearProgress-bar": {
                                                        borderRadius: 4,
                                                    }
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                            Loading Models ({loadingProgress}%)
                                        </Typography>
                                    </Box>
                                ) : !cameraActive ? (
                                    // STOPPED STATE
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
                                    // ACTIVE CAMERA STATE
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
                                    disabled={loading || !modelsLoaded}
                                    sx={{
                                        py: 1.5,
                                        fontSize: "1.1rem",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: 700,
                                        boxShadow: "none",
                                    }}
                                >
                                    {!modelsLoaded ? "Please Wait..." : (loading ? "Verifying..." : (cameraActive ? "Mark Attendance Now" : "Start Camera"))}
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

            <KioskOverlay
                open={overlayOpen}
                data={overlayData}
                onClose={() => {
                    setOverlayOpen(false);
                    setLastResult(null);
                }}
            />

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
