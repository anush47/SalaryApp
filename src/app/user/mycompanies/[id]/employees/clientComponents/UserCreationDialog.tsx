import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    IconButton,
    Box,
    InputAdornment,
} from "@mui/material";
import { Close as CloseIcon, ContentCopy as CopyIcon } from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
    open: boolean;
    onClose: () => void;
    defaultEmail: string;
    employeeId: string | null;
    userId: string | null;
}

const UserCreationDialog: React.FC<Props> = ({
    open,
    onClose,
    defaultEmail,
    employeeId,
    userId,
}) => {
    const [step, setStep] = useState<"input" | "success">("input");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{
        email: string;
        password: string;
    } | null>(null);

    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (open) {
            setEmail(defaultEmail || "");
            setStep("input");
            setError(null);
            setCredentials(null);
        }
    }, [open, defaultEmail]);

    const handleCreateUser = async () => {
        if (!email) {
            setError("Email is required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/employees/enable-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId,
                    userId,
                    email,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create user account");
            }

            setCredentials({
                email: email,
                password: data.temporaryPassword,
            });
            setStep("success");

            // Invalidate queries to update employee list/details
            queryClient.invalidateQueries({
                queryKey: ["employees"],
            });
        } catch (err: any) {
            setError(err.message);
            showSnackbar({ message: err.message, severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCredentials = () => {
        if (credentials) {
            const textToCopy = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
            navigator.clipboard.writeText(textToCopy);
            showSnackbar({ message: "Credentials copied to clipboard", severity: "success" });
        }
    };

    const handleClose = () => {
        onClose();
        // Reset state after closing animation would typically finish, 
        // but here just resetting on next open via useEffect is fine.
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {step === "input" ? "Create User Account" : "User Account Created"}
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Box display="flex" flexDirection="column" gap={2}>
                    <Alert severity="info">
                        This will create a user account for the employee. They will be able
                        to log in using these credentials.
                    </Alert>

                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField
                        label="Email Address"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter employee email"
                        type="email"
                        disabled={loading || step === "success"}
                        helperText={step === "input" ? "You can change this email if needed." : ""}
                    />
                </Box>

                {step === "success" && (
                    <Box display="flex" flexDirection="column" gap={3} mt={3}>
                        <Alert severity="success">
                            User account created successfully! Please share these credentials
                            with the employee.
                        </Alert>

                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                border: "1px solid",
                            }}
                        >
                            <TextField
                                label="Email"
                                fullWidth
                                value={credentials?.email}
                                InputProps={{
                                    readOnly: true,
                                }}
                                variant="standard"
                                margin="normal"
                            />
                            <TextField
                                label="Temporary Password"
                                fullWidth
                                value={credentials?.password}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleCopyCredentials} title="Copy All">
                                                <CopyIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                variant="standard"
                                margin="normal"
                            />
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                            Note: The employee will be prompted to change this password upon first login.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {step === "input" ? (
                    <>
                        <Button onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateUser}
                            variant="contained"
                            disabled={loading || !email}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            Create Account
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            onClick={handleCopyCredentials}
                            startIcon={<CopyIcon />}
                            color="primary"
                        >
                            Copy Credentials
                        </Button>
                        <Button onClick={handleClose} variant="contained" color="primary">
                            Done
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default UserCreationDialog;
