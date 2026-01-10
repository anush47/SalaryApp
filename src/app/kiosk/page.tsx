"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import { Business, VpnKey, CheckCircle, Logout, Home, Warning } from "@mui/icons-material";
import { validateApiKey, CompanyInfo } from "@/app/lib/api/kioskApi";
import Link from "next/link";

import { ThemeSwitch } from "@/app/theme-provider";

export default function KioskPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [newApiKey, setNewApiKey] = useState("");
    const [changeError, setChangeError] = useState("");
    const [changing, setChanging] = useState(false);

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

    const openChangeDialog = () => {
        setNewApiKey("");
        setChangeError("");
        setConfirmLogout(true);
    };

    const handleChangeKey = async () => {
        if (!newApiKey.trim()) {
            setChangeError("Please enter a new API key");
            return;
        }

        if (newApiKey === apiKey) {
            setChangeError("Invalid API key");
            return;
        }

        setChanging(true);
        setChangeError("");

        try {
            const info = await validateApiKey(newApiKey);
            // Validation successful
            setCompanyInfo(info);
            setApiKey(newApiKey);
            localStorage.setItem("kiosk_api_key", newApiKey);
            setConfirmLogout(false);
        } catch (err: any) {
            setChangeError(err.message || "Invalid API key");
        } finally {
            setChanging(false);
        }
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
                flexDirection: "column",
                alignItems: "center",
                justifyContent: { xs: "flex-start", md: "center" },
                p: { xs: 2, md: 4 },
                pt: { xs: 10, md: 4 }, // Add top padding for mobile to clear status bar/notch
                color: theme.palette.text.primary,
                position: "relative",
                overflowY: "auto", // Allow scrolling
            }}
        >
            <Box sx={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 2, alignItems: "center" }}>
                <ThemeSwitch />
                <Tooltip title="Go to Home">
                    <Link href="/" passHref>
                        <IconButton color="primary">
                            <Home />
                        </IconButton>
                    </Link>
                </Tooltip>
                {session?.user ? (
                    <>
                        <Chip
                            avatar={<Avatar src={session.user.image || undefined} />}
                            label={session.user.name}
                            variant="outlined"
                            sx={{
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                backdropFilter: "blur(8px)",
                            }}
                        />
                        <Tooltip title="Sign Out">
                            <IconButton
                                onClick={() => (window.location.href = "/api/auth/signout")}
                                color="primary"
                            >
                                <Logout />
                            </IconButton>
                        </Tooltip>
                    </>
                ) : (
                    <Button
                        variant="outlined"
                        href="/api/auth/signin?callbackUrl=/kiosk"
                        sx={{ borderRadius: "20px" }}
                    >
                        Sign In
                    </Button>
                )}
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

                    {/* Admin Warning */}
                    {session?.user && (
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            Admin/Setup Mode Active. Sign out for normal kiosk operation.
                        </Alert>
                    )}

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

                            {/* Show disabled register button if signed in as employer but no API Key */}
                            {session?.user && (session.user.role === "employer" || session.user.role === "admin") && (
                                <Tooltip title="Please validate an API key first">
                                    <Box>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            disabled
                                            sx={{ py: 1.5, borderRadius: 2 }}
                                            startIcon={<Business />}
                                        >
                                            Register Employee Faces
                                        </Button>
                                    </Box>
                                </Tooltip>
                            )}
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


                                {(session?.user?.role === "employer" || session?.user?.role === "admin") && (
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
                                )}

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
                                    variant="text"
                                    color="inherit"
                                    onClick={openChangeDialog}
                                    sx={{ py: 1.5, borderRadius: 2, color: "text.secondary" }}
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

            {/* Verification Dialog */}
            <Dialog
                open={confirmLogout}
                onClose={() => setConfirmLogout(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Change API Key</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter the new API key below. The current key will remain active if the new one is invalid.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New API Key"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        disabled={changing}
                        error={!!changeError}
                        helperText={changeError}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmLogout(false)} color="inherit" disabled={changing}>
                        Cancel
                    </Button>
                    <Button onClick={handleChangeKey} color="primary" variant="contained" disabled={changing}>
                        {changing ? <CircularProgress size={24} color="inherit" /> : "Validate & Change"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
