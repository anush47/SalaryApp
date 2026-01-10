"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    useTheme,
    alpha,
} from "@mui/material";
import { Business, VpnKey, CheckCircle } from "@mui/icons-material";
import { validateApiKey, CompanyInfo } from "@/app/lib/api/kioskApi";

import { ThemeSwitch } from "@/app/theme-provider";

export default function KioskPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

    // Check if API key is already stored
    useEffect(() => {
        const storedKey = localStorage.getItem("kiosk_api_key");
        if (storedKey) {
            // Don't set state, just validate. This keeps the key out of the UI input.
            handleValidate(storedKey);
        }
    }, []);

    const handleValidate = async (key?: string) => {
        const keyToValidate = key || apiKey;

        if (!keyToValidate.trim()) {
            setError("Please enter an API key");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const info = await validateApiKey(keyToValidate);
            setCompanyInfo(info);
            localStorage.setItem("kiosk_api_key", keyToValidate);
        } catch (err: any) {
            setError(err.message || "Invalid API key");
            setCompanyInfo(null);
            localStorage.removeItem("kiosk_api_key");
        } finally {
            setLoading(false);
        }
    };

    const handleClearKey = () => {
        setApiKey("");
        setCompanyInfo(null);
        setError("");
        localStorage.removeItem("kiosk_api_key");
    };

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
                color: theme.palette.text.primary,
                position: "relative",
            }}
        >
            <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                <ThemeSwitch />
            </Box>

            <Container maxWidth="sm">
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
                    {/* Header */}
                    <Stack spacing={2} alignItems="center" mb={4}>
                        <Business sx={{ fontSize: 64, color: "primary.main" }} />
                        <Typography variant="h4" fontWeight="bold" textAlign="center">
                            Kiosk Attendance
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Enter your company API key to get started
                        </Typography>
                    </Stack>

                    {/* API Key Input */}
                    {!companyInfo && (
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="API Key"
                                type="password"
                                variant="outlined"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your kiosk API key"
                                disabled={loading}
                                InputProps={{
                                    startAdornment: <VpnKey sx={{ mr: 1, color: "action.active" }} />,
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        handleValidate();
                                    }
                                }}
                            />

                            {error && (
                                <Alert severity="error" onClose={() => setError("")}>
                                    {error}
                                </Alert>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={() => handleValidate()}
                                disabled={loading || !apiKey.trim()}
                                sx={{ py: 1.5, borderRadius: 2 }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : "Validate & Continue"}
                            </Button>
                        </Stack>
                    )}

                    {/* Company Info Display */}
                    {companyInfo && (
                        <Stack spacing={3}>
                            <Alert
                                severity="success"
                                icon={<CheckCircle fontSize="inherit" />}
                                sx={{ borderRadius: 2 }}
                            >
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Connected to: {companyInfo.companyName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Timezone: {companyInfo.timezone}
                                </Typography>
                            </Alert>

                            <Stack spacing={2}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={() => router.push("/kiosk/register")}
                                    sx={{ py: 1.5, borderRadius: 2 }}
                                    startIcon={<Business />}
                                >
                                    Register Employee Faces
                                </Button>

                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="success"
                                    size="large"
                                    onClick={() => router.push("/kiosk/mark")}
                                    sx={{ py: 1.5, borderRadius: 2 }}
                                    startIcon={<CheckCircle />}
                                >
                                    Mark Attendance
                                </Button>

                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="error"
                                    onClick={handleClearKey}
                                    sx={{ py: 1.5, borderRadius: 2 }}
                                >
                                    Change API Key
                                </Button>
                            </Stack>
                        </Stack>
                    )}

                    {/* Footer */}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                        display="block"
                        mt={4}
                    >
                        SalaryApp Kiosk System v1.0
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
}
