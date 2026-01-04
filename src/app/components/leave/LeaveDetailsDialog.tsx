"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Button,
    Chip,
    Typography,
    TextField,
    CircularProgress,
} from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import dayjs from "dayjs";
import { FileViewer } from "@/app/components/FileViewer";
import { useSnackbar } from "@/app/context/SnackbarContext";
import {
    fetchLeaveRequestById,
    updateLeaveRequest,
    LeaveRequest,
} from "@/app/lib/api/leaveRequestApi";

interface LeaveDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    leaveRequestId?: string;
    leaveRequest?: LeaveRequest;
    mode?: "view" | "manage"; // view = read-only, manage = show approve/reject/cancel
    onUpdate?: () => void;
}

export const LeaveDetailsDialog: React.FC<LeaveDetailsDialogProps> = ({
    open,
    onClose,
    leaveRequestId,
    leaveRequest: propLeaveRequest,
    mode = "view",
    onUpdate,
}) => {
    const queryClient = useQueryClient();
    const { showSnackbar } = useSnackbar();
    const [remarks, setRemarks] = useState("");
    const [updatedDocuments, setUpdatedDocuments] = useState<string[]>([]);

    // Fetch leave request if only ID is provided
    const { data: fetchedLeaveRequest, isLoading } = useQuery({
        queryKey: ["leaveRequest", leaveRequestId],
        queryFn: () => fetchLeaveRequestById(leaveRequestId!),
        enabled: !!leaveRequestId && !propLeaveRequest && open,
    });

    const leaveRequest = propLeaveRequest || fetchedLeaveRequest;

    useEffect(() => {
        if (leaveRequest) {
            setRemarks(leaveRequest.remarks || "");
            setUpdatedDocuments(leaveRequest.documents || []);
        }
    }, [leaveRequest]);

    const updateLeaveRequestMutation = useMutation({
        mutationFn: ({
            leaveRequestId,
            action,
            remarks,
            documents,
        }: {
            leaveRequestId: string;
            action: "approve" | "reject" | "cancel";
            remarks?: string;
            documents?: string[];
        }) => updateLeaveRequest({ leaveRequestId, action, remarks, documents }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
            queryClient.invalidateQueries({ queryKey: ["leaveRequest", leaveRequestId] });
            showSnackbar({
                message: `Leave request ${variables.action}d successfully!`,
                severity: "success",
            });
            onUpdate?.();
            onClose();
        },
        onError: (err: Error) => {
            showSnackbar({ message: err.message, severity: "error" });
        },
    });

    const getCleanFilename = (key: string) => {
        try {
            const parts = key.split("/");
            const fileNameWithTimestamp = parts[parts.length - 1];
            const match = fileNameWithTimestamp.match(/^\d{13}-(.+)$/);
            if (match && match[1]) {
                return match[1];
            }
            return fileNameWithTimestamp;
        } catch (e) {
            return "Attachment";
        }
    };

    const handleAction = (action: "approve" | "reject" | "cancel") => {
        if (leaveRequest) {
            updateLeaveRequestMutation.mutate({
                leaveRequestId: leaveRequest._id,
                action,
                remarks,
                documents: updatedDocuments,
            });
        }
    };

    if (isLoading) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogContent>
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    if (!leaveRequest) {
        return null;
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mt: 1 }}>
                    {/* Header Info */}
                    <Box
                        sx={{
                            mb: 3,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                {leaveRequest.employee?.name || "Deleted Employee"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Member No: {leaveRequest.employee?.memberNo || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Designation: {leaveRequest.employee?.designation || "N/A"}
                            </Typography>
                        </Box>
                        <Chip
                            label={leaveRequest.status.toUpperCase()}
                            color={
                                leaveRequest.status === "approved"
                                    ? "success"
                                    : leaveRequest.status === "rejected"
                                        ? "error"
                                        : leaveRequest.status === "pending"
                                            ? "warning"
                                            : "default"
                            }
                            variant="outlined"
                        />
                    </Box>

                    {/* Leave Details Grid */}
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Leave Type
                            </Typography>
                            <Chip
                                label={leaveRequest.leaveType?.name || "Unknown"}
                                size="small"
                                sx={{
                                    bgcolor: leaveRequest.leaveType?.color || "primary.main",
                                    color: "#fff",
                                }}
                            />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Duration
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                                {leaveRequest.leaveType?.isShortLeave ? (
                                    <>
                                        {dayjs(leaveRequest.startDate).format("DD MMM YYYY")}
                                        <Box component="span" sx={{ mx: 1, color: "text.secondary" }}>
                                            |
                                        </Box>
                                        {dayjs(leaveRequest.startDate).format("HH:mm")} -{" "}
                                        {dayjs(leaveRequest.endDate).format("HH:mm")}
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            color="primary"
                                            sx={{ ml: 1 }}
                                        >
                                            ({leaveRequest.totalMinutes} mins)
                                        </Typography>
                                    </>
                                ) : (
                                    <>
                                        {dayjs(leaveRequest.startDate).format("DD MMM YYYY")}
                                        {leaveRequest.startDate !== leaveRequest.endDate &&
                                            ` - ${dayjs(leaveRequest.endDate).format("DD MMM YYYY")}`}
                                        <br />
                                        <Typography component="span" variant="body2" color="text.secondary">
                                            {leaveRequest.totalDays} Days
                                            {leaveRequest.halfDay &&
                                                ` (${leaveRequest.halfDayPeriod} Half)`}
                                        </Typography>
                                    </>
                                )}
                            </Typography>
                        </Box>

                        {leaveRequest.reason && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Reason for Leave
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ p: 1, bgcolor: "action.hover", borderRadius: 1, mb: 2 }}
                                >
                                    {leaveRequest.reason}
                                </Typography>
                            </Box>
                        )}

                        {/* Status Specific Reasons */}
                        {leaveRequest.status === "rejected" && leaveRequest.rejectionReason && (
                            <Box>
                                <Typography variant="subtitle2" color="error.main" gutterBottom>
                                    Rejection Reason
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        p: 1,
                                        bgcolor: "error.lighter",
                                        color: "error.dark",
                                        borderRadius: 1,
                                        mb: 2,
                                        border: "1px solid",
                                        borderColor: "error.light",
                                    }}
                                >
                                    {leaveRequest.rejectionReason}
                                </Typography>
                            </Box>
                        )}

                        {leaveRequest.status === "cancelled" && leaveRequest.cancelReason && (
                            <Box>
                                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                    Cancellation Reason
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        p: 1,
                                        bgcolor: "warning.lighter",
                                        color: "warning.dark",
                                        borderRadius: 1,
                                        mb: 2,
                                        border: "1px solid",
                                        borderColor: "warning.light",
                                    }}
                                >
                                    {leaveRequest.cancelReason}
                                </Typography>
                            </Box>
                        )}

                        {updatedDocuments && updatedDocuments.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Attachments
                                </Typography>
                                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                    {updatedDocuments.map((docKey) => (
                                        <Box
                                            key={docKey}
                                            sx={{
                                                position: "relative",
                                                p: 1,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <FileViewer
                                                fileKey={docKey}
                                                filename={getCleanFilename(docKey)}
                                                showPreview={true}
                                            />
                                            {mode === "manage" && leaveRequest.status === "pending" && (
                                                <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        onClick={() =>
                                                            setUpdatedDocuments((prev) =>
                                                                prev.filter((d) => d !== docKey)
                                                            )
                                                        }
                                                    >
                                                        Remove
                                                    </Button>
                                                </Box>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {mode === "manage" && (
                        <TextField
                            label="Add Remarks / Rejection Reason"
                            multiline
                            rows={2}
                            fullWidth
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            sx={{ mt: 3 }}
                            placeholder="Enter remarks before approving or rejecting..."
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        flexDirection: { xs: "column-reverse", sm: "row" },
                        gap: 2,
                    }}
                >
                    <Button
                        onClick={onClose}
                        color="inherit"
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                    >
                        Close
                    </Button>

                    {mode === "manage" && (
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                flexDirection: { xs: "column", sm: "row" },
                                width: { xs: "100%", sm: "auto" },
                            }}
                        >
                            {leaveRequest.status === "pending" && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Close />}
                                    onClick={() => handleAction("reject")}
                                    sx={{ width: { xs: "100%", sm: "auto" } }}
                                >
                                    Reject
                                </Button>
                            )}

                            {(leaveRequest.status === "pending" ||
                                leaveRequest.status === "approved") && (
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={() => handleAction("cancel")}
                                        sx={{ width: { xs: "100%", sm: "auto" } }}
                                    >
                                        Cancel Leave
                                    </Button>
                                )}

                            {leaveRequest.status === "pending" && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    endIcon={<Check />}
                                    onClick={() => handleAction("approve")}
                                    sx={{ width: { xs: "100%", sm: "auto" } }}
                                >
                                    Approve
                                </Button>
                            )}
                        </Box>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
};
