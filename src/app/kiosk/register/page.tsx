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
} from "@mui/material";
import {
    ArrowBack,
    CameraAlt,
    CheckCircle,
    PersonAdd,
    Videocam,
} from "@mui/icons-material";
import { getEmployees, registerFace, Employee } from "@/app/lib/api/kioskApi";

export default function KioskRegisterPage() {
    const router = useRouter();
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

    // Check API key on mount
    useEffect(() => {
        const storedKey = localStorage.getItem("kiosk_api_key");
        if (!storedKey) {
            router.push("/kiosk");
            return;
        }
        setApiKey(storedKey);
        loadEmployees(storedKey);
    }, []);

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
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            setError("Failed to access camera. Please grant camera permissions.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
            setCameraActive(false);
        }
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
            const imageData = canvas.toDataURL("image/jpeg", 0.8);
            setCapturedImages((prev) => [...prev, imageData]);
        }
    };

    const handleRegister = async () => {
        if (!selectedEmployee) {
            setError("Please select an employee");
            return;
        }

        if (capturedImages.length === 0) {
            setError("Please capture at least one image");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            // Generate placeholder face descriptor (128 dimensions)
            // In production, this would use face-api.js to extract real descriptors
            const placeholderDescriptor = Array.from({ length: 128 }, () => Math.random());

            await registerFace(apiKey, selectedEmployee, {
                descriptor: placeholderDescriptor,
                images: capturedImages,
            });

            setSuccess("Face registered successfully!");
            setCapturedImages([]);
            setSelectedEmployee("");
            stopCamera();

            // Reload employees to update hasFaceData status
            await loadEmployees(apiKey);
        } catch (err: any) {
            setError(err.message || "Failed to register face");
        } finally {
            setLoading(false);
        }
    };

    import { ThemeSwitch } from "@/app/theme-provider";

    const selectedEmp = employees.find((e) => e._id === selectedEmployee);

    const theme = useTheme();

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
            <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                <ThemeSwitch />
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
                                    Capture ({capturedImages.length}/5)
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
                                    Captured Images ({capturedImages.length})
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {capturedImages.map((img, idx) => (
                                        <Box
                                            key={idx}
                                            component="img"
                                            src={img}
                                            sx={{
                                                width: 80,
                                                height: 80,
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
                            startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
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
                                3. Capture 3-5 images from different angles
                                <br />
                                4. Click "Register Face" to save
                            </Typography>
                        </Alert>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
