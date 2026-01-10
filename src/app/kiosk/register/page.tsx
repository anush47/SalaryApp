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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    IconButton,
    useTheme,
    alpha,
    Tooltip,
} from "@mui/material";
import Link from "next/link";
import {
    ArrowBack,
    CameraAlt,
    CheckCircle,
    PersonAdd,
    Videocam,
    Home,
} from "@mui/icons-material";
import { getEmployees, registerFace, Employee } from "@/app/lib/api/kioskApi";
import { detectFace, loadModels } from "@/app/lib/faceRecognition";
import { ThemeSwitch } from "@/app/theme-provider";

export default function KioskRegisterPage() {
    const router = useRouter();
    const theme = useTheme();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [apiKey, setApiKey] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Check API key on mount and load models
    useEffect(() => {
        const storedKey = localStorage.getItem("kiosk_api_key");
        if (!storedKey) {
            router.push("/kiosk");
            return;
        }
        setApiKey(storedKey);
        loadEmployees(storedKey);
        loadModels().catch(console.error);
    }, []);

    // Attach stream to video element when both are ready
    useEffect(() => {
        if (stream && videoRef.current && cameraActive) {
            console.log("Attaching stream to video element");
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => {
                console.error("Play error:", err);
            });
        }
    }, [stream, cameraActive]);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

    const loadEmployees = async (key: string) => {
        setLoading(true);
        try {
            const emps = await getEmployees(key);
            setEmployees(emps);
        } catch (err: any) {
            setError(err.message || "Failed to load employees");
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        if (cameraActive) {
            console.log("Camera already active");
            return;
        }

        setError(""); // Clear previous errors

        try {
            console.log("Requesting camera access...");
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            });
            console.log("Camera access granted, stream:", mediaStream);

            // Store stream in state and set camera active
            // The useEffect will attach it to the video element
            setStream(mediaStream);
            setCameraActive(true);
            console.log("Camera activated, stream stored");
        } catch (err: any) {
            console.error("Camera Error:", err);
            setError(`Camera access failed: ${err.message || err.name}. Please grant camera permissions.`);
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

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg", 0.9); // Higher quality for recognition
            if (capturedImages.length < 1) { // Limit to 1 good image for now for simplicity, or keep list
                setCapturedImages([imageData]); // Just keep the latest for now if we want single shot
            }
        }
    };

    const handleRegister = async () => {
        const currentSelectedEmployee = employees.find(e => e._id === selectedEmployee);

        if (!currentSelectedEmployee || capturedImages.length === 0) {
            setError("Please select an employee and capture an image.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            // Process the first captured image
            const imageSrc = capturedImages[0];
            const img = new Image();
            img.src = imageSrc;
            await img.decode();

            // Detect face and extract descriptor using face-api.js
            const detection = await detectFace(img);

            if (!detection) {
                setError("No face detected! Please ensure your face is clearly visible and try again.");
                setLoading(false);
                return;
            }

            const faceDescriptor = Array.from(detection.descriptor); // Convert Float32Array to number[]

            const successRegistration = await registerFace(apiKey, currentSelectedEmployee._id, {
                descriptor: faceDescriptor,
                image: imageSrc,
            });

            if (successRegistration) {
                setSuccess("Face registered successfully! Redirecting...");
                setCapturedImages([]);
                setSelectedEmployee("");
                stopCamera();

                // Reload employees to update hasFaceData status
                await loadEmployees(apiKey);

                setTimeout(() => {
                    router.push("/kiosk");
                }, 2000);
            } else {
                setError("Failed to register face. Please try again.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred during registration.");
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
                py: 4,
                color: theme.palette.text.primary,
                position: "relative",
            }}
        >
            <Box sx={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 1, alignItems: "center" }}>
                <ThemeSwitch />
                <Tooltip title="Go to Home">
                    <Link href="/" passHref>
                        <IconButton color="primary">
                            <Home />
                        </IconButton>
                    </Link>
                </Tooltip>
            </Box>

            <Container maxWidth="md">
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <IconButton
                        onClick={() => router.push("/kiosk")}
                        color="primary"
                        sx={{
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            "&:hover": { bgcolor: alpha(theme.palette.background.paper, 0.8) }
                        }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h4" fontWeight="bold">
                        Face Registration
                    </Typography>
                </Stack>

                <Paper
                    elevation={4}
                    sx={{
                        p: 4,
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: "blur(20px)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                >
                    <Stack spacing={3}>
                        {/* Employee Selection */}
                        <FormControl fullWidth>
                            <InputLabel>Select Employee</InputLabel>
                            <Select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                label="Select Employee"
                                disabled={loading}
                            >
                                {employees.map((emp) => (
                                    <MenuItem key={emp._id} value={emp._id}>
                                        <Stack direction="row" spacing={1} alignItems="center" width="100%">
                                            <Typography>
                                                {emp.name} (#{emp.memberNo})
                                            </Typography>
                                            {emp.hasFaceData && (
                                                <Chip
                                                    label="Registered"
                                                    size="small"
                                                    color="success"
                                                    sx={{ ml: "auto" }}
                                                />
                                            )}
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Camera Preview */}
                        <Box
                            sx={{
                                position: "relative",
                                width: "100%",
                                aspectRatio: "4/3",
                                bgcolor: "black",
                                borderRadius: 2,
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {!cameraActive ? (
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<Videocam />}
                                    onClick={startCamera}
                                >
                                    Start Camera
                                </Button>
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted // Ensure no feedback loop
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            )}
                        </Box>

                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} style={{ display: "none" }} />

                        {/* Camera Controls */}
                        {cameraActive && (
                            <Stack direction="row" spacing={2} justifyContent="center">
                                <Button
                                    variant="contained"
                                    startIcon={<CameraAlt />}
                                    onClick={captureImage}
                                    disabled={!selectedEmployee}
                                >
                                    Capture Image
                                </Button>
                                <Button variant="outlined" color="error" onClick={stopCamera}>
                                    Stop Camera
                                </Button>
                            </Stack>
                        )}

                        {/* Captured Images Preview */}
                        {capturedImages.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Captured Image
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {capturedImages.map((img, idx) => (
                                        <Box
                                            key={idx}
                                            component="img"
                                            src={img}
                                            sx={{
                                                width: 100,
                                                height: 100,
                                                objectFit: "cover",
                                                borderRadius: 1,
                                                border: "2px solid",
                                                borderColor: "primary.main",
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {/* Alerts */}
                        {error && (
                            <Alert severity="error" onClose={() => setError("")}>
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert
                                severity="success"
                                icon={<CheckCircle />}
                                onClose={() => setSuccess("")}
                            >
                                {success}
                            </Alert>
                        )}

                        {/* Register Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                            onClick={handleRegister}
                            disabled={loading || !selectedEmployee || capturedImages.length === 0}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? "Registering..." : "Register Face"}
                        </Button>

                        {/* Info */}
                        <Alert severity="info">
                            <Typography variant="body2">
                                <strong>Instructions:</strong>
                                <br />
                                1. Select an employee from the dropdown
                                <br />
                                2. Start the camera and position your face in the frame
                                <br />
                                3. Capture a clear image of your face
                                <br />
                                4. Click "Register Face" to complete setup
                            </Typography>
                        </Alert>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
