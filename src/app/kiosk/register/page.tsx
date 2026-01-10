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
    const [currentStep, setCurrentStep] = useState(0); // 0: Center, 1: Turn Left, 2: Turn Right
    const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
    const [stepImages, setStepImages] = useState<string[]>([]);

    const steps = [
        { label: "Look Center", instruction: "Look directly at the camera" },
        { label: "Turn Left", instruction: "Turn your head slightly to the left" },
        { label: "Turn Right", instruction: "Turn your head slightly to the right" },
        { label: "Look Up", instruction: "Tilt your head slightly upwards" },
        { label: "Look Down", instruction: "Tilt your head slightly downwards" },
    ];

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

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setLoading(true);
        setError("");

        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");

            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg", 0.9);

            // Detect face
            const img = new Image();
            img.src = imageData;
            await img.decode();

            const detection = await detectFace(img);

            if (!detection) {
                setError("No face detected! Please ensure your face is clearly visible.");
                setLoading(false);
                return;
            }

            const descriptor = Array.from(detection.descriptor);

            // Success for this step
            setCapturedDescriptors(prev => [...prev, descriptor]);
            setStepImages(prev => [...prev, imageData]);

            if (currentStep < 4) {
                // Move to next step
                setCurrentStep(prev => prev + 1);
            } else {
                // All steps done, ready to register
                // We'll auto-register or let user confirm. Let's auto-register for seamlessness.
                await finishRegistration([...capturedDescriptors, descriptor], [...stepImages, imageData]);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Capture failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const finishRegistration = async (finalDescriptors: number[][], finalImages: string[]) => {
        const currentSelectedEmployee = employees.find(e => e._id === selectedEmployee);

        if (!currentSelectedEmployee) {
            setError("No employee selected.");
            return;
        }

        try {
            const successRegistration = await registerFace(apiKey, currentSelectedEmployee._id, {
                descriptors: finalDescriptors,
                images: finalImages,
            });

            if (successRegistration) {
                setSuccess("All poses captured & registered successfully!");
                stopCamera();
                setCurrentStep(0);
                setCapturedDescriptors([]);
                setStepImages([]);
                setSelectedEmployee("");

                // Reload employees
                await loadEmployees(apiKey);

                setTimeout(() => {
                    router.push("/kiosk");
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || "Failed to save registration data.");
            // Reset to start on critical failure? Or just let them retry?
            // Let's reset for consistency
            setCapturedDescriptors([]);
            setStepImages([]);
            setCurrentStep(0);
        }
    };

    const resetProcess = () => {
        setCapturedDescriptors([]);
        setStepImages([]);
        setCurrentStep(0);
        setError("");
        setSuccess("");
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
                                borderRadius: 3,
                                overflow: "hidden",
                                border: `2px solid ${alpha(theme.palette.divider, 0.2)}`,
                                boxShadow: theme.shadows[4],
                            }}
                        >
                            {!cameraActive ? (
                                <Stack
                                    alignItems="center"
                                    justifyContent="center"
                                    sx={{ height: "100%", color: "text.secondary", gap: 2 }}
                                >
                                    <Videocam sx={{ fontSize: 64, opacity: 0.5 }} />
                                    <Typography>Select an employee and start camera</Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<CameraAlt />}
                                        onClick={startCamera}
                                        disabled={!selectedEmployee}
                                    >
                                        Start Camera
                                    </Button>
                                </Stack>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        muted
                                        playsInline
                                    />
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            p: 2,
                                            background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            flexDirection: "column",
                                            gap: 2
                                        }}
                                    >
                                        <Typography sx={{ color: "white", fontWeight: "bold", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                                            Step {currentStep + 1}/3: {steps[currentStep].label}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                                            {steps[currentStep].instruction}
                                        </Typography>

                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleCapture}
                                                disabled={loading}
                                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
                                            >
                                                {loading ? "Processing..." : "Capture"}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => {
                                                    stopCamera();
                                                    resetProcess();
                                                }}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </Button>
                                        </Stack>
                                    </Box>
                                </>
                            )}

                            <Box sx={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 1 }}>
                                {[0, 1, 2, 3, 4].map(step => (
                                    <Box
                                        key={step}
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: "50%",
                                            bgcolor: currentStep >= step ? "success.main" : "grey.500",
                                            border: "2px solid white",
                                            boxShadow: 1
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <canvas ref={canvasRef} style={{ display: "none" }} />

                        {error && <Alert severity="error">{error}</Alert>}
                        {success && <Alert severity="success">{success}</Alert>}


                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
