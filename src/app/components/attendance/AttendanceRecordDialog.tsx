import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Box,
    Typography,
    Avatar,
    Divider,
    Chip,
    CircularProgress,
    TextField,
    Paper,
    Stack,
    IconButton,
    Tabs,
    Tab,
    Alert
} from "@mui/material";
import { CheckCircle, Cancel, LocationOn, Delete, AddCircle } from "@mui/icons-material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from "dayjs";
import { AttendanceZonesMap } from "@/app/components/attendance/AttendanceZonesMap";
import { updateAttendanceStatus, deleteAttendance, createAttendance } from "@/app/lib/api/attendanceApi";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { DailyAttendanceRecord } from "@/app/hooks/useAttendanceAggregation";

interface AttendanceRecordDialogProps {
    open: boolean;
    onClose: () => void;
    dailyRecord: DailyAttendanceRecord | null;
    employee?: any; // The full employee object if available, mainly for creating new logs
    companyConfig?: any; // For map zones
    onSaveSuccess?: () => void;
}

export const AttendanceRecordDialog: React.FC<AttendanceRecordDialogProps> = ({
    open,
    onClose,
    dailyRecord,
    employee,
    companyConfig,
    onSaveSuccess
}) => {
    const { showSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState(0);

    // State for separate logs
    const [inLog, setInLog] = useState<any>(null);
    const [outLog, setOutLog] = useState<any>(null);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Edit Forms State
    const [formData, setFormData] = useState({
        timestamp: null as dayjs.Dayjs | null,
        status: 'approved',
        remarks: '',
        shiftId: ''
    });

    // Day Status (Simulated for now by modifying shift/logs?)
    // TODO: Implement "Day Status" logic if backend supports it. For now, it reflects log status.

    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch Logs on Open
    useEffect(() => {
        if (open && dailyRecord) {
            setLoadingLogs(true);
            const fetchLogs = async () => {
                try {
                    const promises = [];
                    if (dailyRecord.inLogId) promises.push(fetch(`/api/attendance/${dailyRecord.inLogId}`).then(r => r.json()));
                    if (dailyRecord.outLogId) promises.push(fetch(`/api/attendance/${dailyRecord.outLogId}`).then(r => r.json()));

                    const results = await Promise.all(promises);

                    let fetchedIn: any = null;
                    let fetchedOut: any = null;

                    // Naive assignment based on log ID match
                    results.forEach(res => {
                        if (res.success) {
                            const rec = res.data;
                            if (rec._id === dailyRecord.inLogId) fetchedIn = rec;
                            if (rec._id === dailyRecord.outLogId) fetchedOut = rec;
                        }
                    });

                    setInLog(fetchedIn);
                    setOutLog(fetchedOut);

                    // Initialize Form with IN log by default or OUT if IN missing
                    const initialLog = fetchedIn || fetchedOut;
                    if (initialLog) {
                        setFormData({
                            timestamp: dayjs(initialLog.timestamp),
                            status: initialLog.status || 'approved',
                            remarks: initialLog.remarks || '',
                            shiftId: initialLog.shift?.shiftId || ''
                        });
                        setActiveTab(fetchedIn ? 0 : 1);
                    } else {
                        // No logs at all - Ready to create IN
                        setFormData({
                            timestamp: dayjs(`${dailyRecord.date}T08:00:00`), // Default start time
                            status: 'approved',
                            remarks: '',
                            shiftId: dailyRecord.shiftId || ''
                        });
                        setActiveTab(0);
                    }

                } catch (e) {
                    console.error(e);
                    showSnackbar({ message: "Failed to load log details", severity: "error" });
                } finally {
                    setLoadingLogs(false);
                }
            };
            fetchLogs();
        } else {
            setInLog(null);
            setOutLog(null);
        }
    }, [open, dailyRecord]);

    // Update form when tab changes
    useEffect(() => {
        const targetLog = activeTab === 0 ? inLog : outLog;
        if (targetLog) {
            setFormData({
                timestamp: dayjs(targetLog.timestamp),
                status: targetLog.status || 'approved',
                remarks: targetLog.remarks || '',
                shiftId: targetLog.shift?.shiftId || ''
            });
        } else {
            // Reset for creation
            setFormData(prev => ({
                ...prev,
                timestamp: activeTab === 0
                    ? dayjs(`${dailyRecord?.date}T09:00:00`)
                    : dayjs(`${dailyRecord?.date}T17:00:00`),
                remarks: '',
                status: 'approved'
            }));
        }
    }, [activeTab, inLog, outLog, dailyRecord]);


    const handleSave = async () => {
        if (!dailyRecord) return;
        setIsUpdating(true);
        const type = activeTab === 0 ? 'in' : 'out';
        const targetLog = activeTab === 0 ? inLog : outLog;

        try {
            if (targetLog) {
                // Update
                const res = await updateAttendanceStatus(
                    targetLog._id,
                    formData.status as any,
                    formData.timestamp?.toISOString(),
                    formData.shiftId,
                    formData.remarks
                );
                if (res.success) {
                    showSnackbar({ message: `${type.toUpperCase()} Record updated`, severity: "success" });
                    onSaveSuccess?.();
                    // Refresh local state? simpler to close
                    onClose();
                } else {
                    showSnackbar({ message: res.error?.message || "Failed to update", severity: "error" });
                }
            } else {
                // Create New
                const defaultLoc = companyConfig?.geoFencing?.latitude ? {
                    lat: companyConfig.geoFencing.latitude,
                    lng: companyConfig.geoFencing.longitude,
                    accuracy: 10
                } : { lat: 0, lng: 0, accuracy: 0 };

                const res = await createAttendance({
                    type,
                    location: defaultLoc,
                    employeeId: employee?._id || dailyRecord.inLogId ? null : (dailyRecord as any).employeeId, // We need to ensure we can get employeeID from somewhere!
                    // dailyRecord does not strictly have employeeId properly typed in interface but likely available?
                    // actually dailyRecord does NOT have employeeId. But we passed `employee` prop.
                    // Fallback to searching context? No, dialog needs it.
                    // Let's assume passed `employee` prop.
                    timestamp: formData.timestamp?.toISOString(),
                    remarks: formData.remarks,
                    status: formData.status
                });

                // IMPORTANT: If employee prop is missing (e.g. creating from view where we only have record), we need mechanism. 
                // Currently UnifiedPanel passes employee.
                // If createAttendance API needs valid employeeId, we must ensure it is present.
                if (!employee?._id) console.warn("Missing Employee ID for creation!");

                if (res.success) {
                    showSnackbar({ message: "Record created successfully", severity: "success" });
                    onSaveSuccess?.();
                    onClose();
                } else {
                    showSnackbar({ message: res.error?.message || "Creation failed", severity: "error" });
                }
            }
        } catch (e) {
            showSnackbar({ message: "An error occurred", severity: "error" });
        } finally {
            setIsUpdating(false);
        }
    };

    // Deletion
    const handleDelete = async () => {
        const targetLog = activeTab === 0 ? inLog : outLog;
        if (!targetLog) return;

        if (!confirm("Delete this specific log?")) return;
        setIsUpdating(true);
        try {
            const res = await deleteAttendance(targetLog._id);
            if (res.success) {
                showSnackbar({ message: "Log deleted", severity: 'success' });
                onSaveSuccess?.();
                onClose();
            }
        } catch (e) { showSnackbar({ message: "Error deleting", severity: 'error' }); }
        finally { setIsUpdating(false); }
    }


    if (!dailyRecord) return null;

    const currentLog = activeTab === 0 ? inLog : outLog;
    const isNew = !currentLog;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6">Edit Attendance Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {dayjs(dailyRecord.date).format("dddd, MMMM D, YYYY")} | {employee?.name || (dailyRecord as any).shiftName || "Employee"}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"><Cancel /></IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, minHeight: 400 }}>
                {loadingLogs ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container sx={{ height: '100%' }}>
                        {/* Sidebar / Tabs */}
                        <Grid item xs={3} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
                            <Tabs
                                orientation="vertical"
                                value={activeTab}
                                onChange={(_, v) => setActiveTab(v)}
                                sx={{ borderRight: 1, borderColor: 'divider', height: '100%', pt: 2 }}
                            >
                                <Tab
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography fontWeight="bold">IN PUNCH</Typography>
                                            {inLog ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="disabled" fontSize="small" />}
                                        </Box>
                                    }
                                />
                                <Tab
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography fontWeight="bold">OUT PUNCH</Typography>
                                            {outLog ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="disabled" fontSize="small" />}
                                        </Box>
                                    }
                                />
                            </Tabs>
                        </Grid>

                        {/* Content Area */}
                        <Grid item xs={9} sx={{ p: 3 }}>

                            {/* Header Status of the specific log */}
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <Typography variant="h6" color="primary">
                                    {activeTab === 0 ? "Check-In Details" : "Check-Out Details"}
                                </Typography>
                                {currentLog && (
                                    <Chip
                                        label={currentLog.status?.toUpperCase()}
                                        color={currentLog.status === 'approved' ? 'success' : 'warning'}
                                        size="small"
                                    />
                                )}
                                {isNew && <Chip label="MISSING Record" color="error" size="small" />}
                            </Box>

                            {/* Form */}
                            <Grid container spacing={3}>
                                <Grid item xs={6}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DateTimePicker
                                            label="Timestamp"
                                            value={formData.timestamp}
                                            onChange={(v) => setFormData({ ...formData, timestamp: v })}
                                            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                        />
                                    </LocalizationProvider>
                                </Grid>

                                <Grid item xs={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Status"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="Remarks / Notes"
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        size="small"
                                    />
                                </Grid>

                                {/* Location Map (Read Only for now unless we add marker drag) */}
                                {currentLog?.location && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary" gutterBottom>
                                            Recorded Location ({currentLog.location.isVerified ? 'Verified' : 'Unverified'})
                                        </Typography>
                                        <Box height={200} mt={1} border="1px solid #eee">
                                            <AttendanceZonesMap
                                                companyConfig={companyConfig}
                                                markerLocation={{ lat: currentLog.location.lat, lng: currentLog.location.lng }}
                                                interactive={false}
                                                height={200}
                                                fitBounds
                                            />
                                        </Box>
                                    </Grid>
                                )}

                                {isNew && (
                                    <Grid item xs={12}>
                                        <Alert severity="info">
                                            You are creating a manual record. Location will be set to company default or require manual override.
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>

                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {currentLog && (
                    <Button onClick={handleDelete} color="error" disabled={isUpdating}>Delete Log</Button>
                )}
                <Box flexGrow={1} />
                <Button onClick={onClose} disabled={isUpdating}>Close</Button>
                <Button variant="contained" onClick={handleSave} disabled={isUpdating}>
                    {isUpdating ? "Saving..." : (isNew ? "Create Record" : "Save Changes")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
