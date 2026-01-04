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
    Alert,
    useTheme,
    useMediaQuery
} from "@mui/material";
import { CheckCircle, Cancel, LocationOn, Delete, AddCircle, Warning } from "@mui/icons-material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from "dayjs";
import { AttendanceZonesMap } from "@/app/components/attendance/AttendanceZonesMap";
import { updateAttendanceStatus, deleteAttendance, createAttendance, getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { DailyAttendanceRecord } from "@/app/hooks/useAttendanceAggregation";

// Helper Component for Device Check
const PreviousDeviceCheck = ({ currentLog, employeeId, companyId }: { currentLog: any, employeeId: string, companyId: string }) => {
    const [previousLog, setPreviousLog] = useState<any>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!currentLog || !employeeId || !companyId) return;

        const checkPrevious = async () => {
            setChecking(true);
            try {
                // Fetch records ending BEFORE current log time
                // Using endDate = current timestamp (exclusive? API uses <= so might fetch current. Need to filter or use strict < if backend supported, but standard is <=)
                // We will fetch limit=2, sort=-1. The first one should be current (or similar), second is previous.
                // OR ensure endDate is slightly less?
                const endDate = dayjs(currentLog.timestamp).subtract(1, 'second').toISOString();

                // Using the new support for employeeId and limit
                const qs = new URLSearchParams({
                    companyId,
                    employeeId,
                    endDate,
                    limit: "1"
                });

                const res = await fetch(`/api/attendance?${qs.toString()}`);
                const data = await res.json();

                if (data.success && data.data && data.data.length > 0) {
                    setPreviousLog(data.data[0]);
                } else {
                    setPreviousLog(null);
                }
            } catch (e) { console.error("Prev dev check failed", e); }
            finally { setChecking(false); }
        };

        checkPrevious();
    }, [currentLog, employeeId, companyId]);

    if (checking) return <Typography variant="caption" color="text.secondary">Checking device history...</Typography>;

    if (!previousLog) return null; // No history to compare

    // Check if device ID changed
    // If current has no ID (manual/web without ID?), and prev had one, it's a change.
    // Normalized comparison
    const currentId = currentLog.deviceId || "unknown";
    const prevId = previousLog.deviceId || "unknown";

    if (currentId !== prevId) {
        return (
            <Alert severity="warning" icon={<Warning />} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">New Device Detected</Typography>
                <Typography variant="body2">
                    This record was created using a different device than the previous record ({dayjs(previousLog.timestamp).format("MMM D HH:mm")}).
                </Typography>
            </Alert>
        );
    }

    return null;
};

interface AttendanceRecordDialogProps {
    open: boolean;
    onClose: () => void;
    dailyRecord: DailyAttendanceRecord | null;
    employee?: any; // The full employee object if available, mainly for creating new logs
    companyConfig?: any; // For map zones
    shifts?: any[]; // Available shifts for selection
    onSaveSuccess?: () => void;
    disableTabSwitch?: boolean;
    readOnly?: boolean;
    disableShiftChange?: boolean; // New prop to disable shift editing
}

export const AttendanceRecordDialog: React.FC<AttendanceRecordDialogProps> = ({
    open,
    onClose,
    dailyRecord,
    employee,
    companyConfig,
    shifts = [],
    onSaveSuccess,
    disableTabSwitch = false,
    readOnly = false,
    disableShiftChange = false
}) => {
    const { showSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [activeTab, setActiveTab] = useState(0);



    // State for separate logs
    const [inLog, setInLog] = useState<any>(null);
    const [outLog, setOutLog] = useState<any>(null);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Header Metadata (Holidays/Leaves) - especially for All view where dailyRecord is partial
    const [headerMetadata, setHeaderMetadata] = useState<{
        isHoliday: boolean;
        holidayName?: string;
        isOffDay: boolean;
        isLeave: boolean;
        leaveType?: string;
        leaveStatus?: string;
    }>({
        isHoliday: dailyRecord?.isHoliday || false,
        holidayName: dailyRecord?.holidayName,
        isOffDay: dailyRecord?.isOffDay || false,
        isLeave: dailyRecord?.status === 'Leave' || !!dailyRecord?.leaveType,
        leaveType: dailyRecord?.leaveType,
        leaveStatus: dailyRecord?.leaveStatus
    });

    // Reset metadata when dailyRecord changes
    useEffect(() => {
        if (dailyRecord) {
            setHeaderMetadata({
                isHoliday: dailyRecord.isHoliday || false,
                holidayName: dailyRecord.holidayName,
                isOffDay: dailyRecord.isOffDay || false,
                isLeave: dailyRecord.status === 'Leave' || !!dailyRecord.leaveType,
                leaveType: dailyRecord.leaveType,
                leaveStatus: dailyRecord.leaveStatus
            });
        }
    }, [dailyRecord]);

    // Edit Forms State
    const [formData, setFormData] = useState({
        timestamp: null as dayjs.Dayjs | null,
        status: 'approved',
        remarks: '',
        shiftId: '',
        dayStatus: 'full'
    });

    // Track original values to detect changes
    const [originalShiftId, setOriginalShiftId] = useState<string>('');
    const [originalDayStatus, setOriginalDayStatus] = useState<string>('full');



    // Day Status (Simulated for now by modifying shift/logs?)
    // This is now supported by backing field on IN log

    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch Logs on Open
    useEffect(() => {
        if (open && dailyRecord) {
            setLoadingLogs(true);
            const fetchLogs = async () => {
                try {
                    // 1. Fetch Logs
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

                    // If we only have one record (from "All" view), try to fetch the paired record
                    if ((fetchedIn && !fetchedOut) || (!fetchedIn && fetchedOut)) {
                        const singleLog = fetchedIn || fetchedOut;
                        const employeeId = singleLog.employee?._id || singleLog.employee;
                        const companyId = singleLog.company;
                        const logDate = dayjs(singleLog.timestamp).format('YYYY-MM-DD');



                        try {
                            // Fetch all records for this employee on this day
                            const dayRecordsRes = await fetch(`/api/attendance?companyId=${companyId}&employeeId=${employeeId}&startDate=${logDate}&endDate=${logDate}`);
                            const dayRecordsData = await dayRecordsRes.json();

                            if (dayRecordsData.success && dayRecordsData.data) {


                                // Find the paired record
                                const records = dayRecordsData.data;
                                if (fetchedIn && !fetchedOut) {
                                    // We have IN, find the next OUT
                                    const pairedOut = records.find((r: any) =>
                                        r.type === 'out' &&
                                        dayjs(r.timestamp).isAfter(dayjs(fetchedIn.timestamp))
                                    );
                                    if (pairedOut) {
                                        setOutLog(pairedOut);
                                        fetchedOut = pairedOut;
                                    }
                                } else if (fetchedOut && !fetchedIn) {
                                    // We have OUT, find the previous IN
                                    const pairedIn = records
                                        .filter((r: any) =>
                                            r.type === 'in' &&
                                            dayjs(r.timestamp).isBefore(dayjs(fetchedOut.timestamp))
                                        )
                                        .sort((a: any, b: any) => dayjs(b.timestamp).diff(dayjs(a.timestamp)))[0]; // Get the closest IN before OUT

                                    if (pairedIn) {
                                        setInLog(pairedIn);
                                        fetchedIn = pairedIn;
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Failed to fetch paired record:', e);
                        }
                    }

                    // Initialize Form with IN log by default or OUT if IN missing
                    const initialLog = fetchedIn || fetchedOut;


                    if (initialLog) {
                        const shiftId = initialLog.shift?.shiftId || initialLog.shift?._id || (typeof initialLog.shift === 'string' ? initialLog.shift : '');
                        const dayStatus = initialLog.dayStatus || (dailyRecord.isOffDay || dailyRecord.isHoliday ? 'off' : 'full');



                        setFormData({
                            timestamp: initialLog.resolutionMode === 'status_only' ? null : dayjs(initialLog.timestamp),
                            status: initialLog.status || 'approved',
                            remarks: initialLog.remarks || '',
                            shiftId,
                            dayStatus
                        });
                        setOriginalShiftId(shiftId);
                        setOriginalDayStatus(dayStatus);
                        setActiveTab(fetchedIn ? 0 : 1);
                    } else {
                        // No logs at all - Ready to create IN
                        setFormData({
                            timestamp: null, // Default to Status Only as requested
                            status: 'approved',
                            remarks: '',
                            shiftId: dailyRecord.shiftId || '',
                            dayStatus: dailyRecord.isOffDay || dailyRecord.isHoliday ? 'off' : 'full'
                        });
                        setActiveTab(0);
                    }

                    // 2. Fetch Metadata (Holidays/Leaves) if missing (common in "All" view)
                    if (dailyRecord && (!dailyRecord.isHoliday && !dailyRecord.leaveType)) {
                        const dateStr = dayjs(dailyRecord.date).format('YYYY-MM-DD');
                        const cId = companyConfig?._id || (employee?.company?._id || employee?.company);
                        const eId = employee?._id || (dailyRecord as any).employeeId;

                        if (cId && eId) {
                            try {
                                const [hRes, lRes] = await Promise.all([
                                    fetch(`/api/holidays?companyId=${cId}&startDate=${dateStr}&endDate=${dateStr}`).then(r => r.json()),
                                    fetch(`/api/leave-requests?companyId=${cId}&employeeId=${eId}&startDate=${dateStr}&endDate=${dateStr}&status=approved`).then(r => r.json())
                                ]);

                                if (hRes.success && hRes.data?.length > 0) {
                                    setHeaderMetadata(prev => ({
                                        ...prev,
                                        isHoliday: true,
                                        holidayName: hRes.data[0].name
                                    }));
                                }

                                if (lRes.success && lRes.data?.length > 0) {
                                    const leave = lRes.data[0];
                                    setHeaderMetadata(prev => ({
                                        ...prev,
                                        isLeave: true,
                                        leaveType: leave.leaveType?.name,
                                        leaveStatus: leave.halfDay ? (leave.halfDayPeriod === 'first_half' ? 'Half-First' : 'Half-Final') : 'Full'
                                    }));
                                }
                            } catch (metaErr) {
                                console.error('Failed to fetch dialog metadata:', metaErr);
                            }
                        }
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
                timestamp: targetLog.resolutionMode === 'status_only' ? null : dayjs(targetLog.timestamp),
                status: targetLog.status || 'approved',
                remarks: targetLog.remarks || '',
                shiftId: targetLog.shift?.shiftId || '',
                dayStatus: targetLog.dayStatus || 'full'
            });
        } else {
            // Reset for creation
            setFormData(prev => ({
                ...prev,
                timestamp: null,
                remarks: '',
                status: 'approved',
                dayStatus: 'full'
            }));
        }
    }, [activeTab, inLog, outLog, dailyRecord]);


    const handleSave = async () => {
        if (!dailyRecord) return;
        setIsUpdating(true);
        const type = activeTab === 0 ? 'in' : 'out';
        const targetLog = activeTab === 0 ? inLog : outLog;

        // Find the selected shift to get full details
        const selectedShift = formData.shiftId
            ? shifts.find((s: any) => (s._id || s.shiftId) === formData.shiftId)
            : null;

        // If shift found, format it correctly for the API
        const shiftForAPI = selectedShift ? {
            shiftId: selectedShift._id || selectedShift.shiftId,
            name: selectedShift.name || selectedShift.shiftName,
            startTime: selectedShift.startTime,
            endTime: selectedShift.endTime,
            type: selectedShift.type
        } : null;

        try {
            if (targetLog) {
                // Update
                const res = await updateAttendanceStatus(
                    targetLog._id,
                    formData.status as any,
                    formData.timestamp?.toISOString(),
                    formData.shiftId,
                    formData.remarks,
                    formData.dayStatus,
                    shiftForAPI // Pass formatted shift object
                );
                if (res.success) {
                    // If shift was changed, also update the paired record
                    const shiftChanged = formData.shiftId !== originalShiftId;

                    // Determine the paired record based on current record type
                    // If current is OUT, pair with IN (before it)
                    // If current is IN, pair with OUT (after it)
                    const otherLog = type === 'out' ? inLog : outLog;

                    if (shiftChanged && otherLog) {

                        try {
                            await updateAttendanceStatus(
                                otherLog._id,
                                otherLog.status,
                                otherLog.resolutionMode === 'status_only' ? undefined : otherLog.timestamp,
                                formData.shiftId,
                                otherLog.remarks,
                                otherLog.dayStatus,
                                shiftForAPI
                            );
                        } catch (e) {
                            console.error('Failed to update paired record:', e);
                        }
                    }

                    showSnackbar({
                        message: `${type.toUpperCase()} Record updated${shiftChanged && otherLog ? ' (both IN/OUT updated)' : ''}`,
                        severity: "success"
                    });
                    onSaveSuccess?.();
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
                    employeeId: employee?._id || (dailyRecord as any).employeeId || undefined,
                    timestamp: formData.timestamp ? formData.timestamp.toISOString() : dayjs(dailyRecord.date).startOf('day').toISOString(),
                    remarks: formData.remarks,
                    status: formData.status,
                    dayStatus: formData.dayStatus,
                    resolutionMode: formData.timestamp ? undefined : 'status_only',
                    shift: shiftForAPI // Pass formatted shift object
                });



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

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

    // Deletion
    const handleDelete = async () => {
        const targetLog = activeTab === 0 ? inLog : outLog;
        if (!targetLog) return;

        // confirmed via dialog
        setIsUpdating(true);
        try {
            const res = await deleteAttendance(targetLog._id);
            if (res.success) {
                showSnackbar({ message: "Log deleted", severity: 'success' });
                onSaveSuccess?.();
                onClose();
            }
        } catch (e) { showSnackbar({ message: "Error deleting", severity: 'error' }); }
        finally {
            setIsUpdating(false);
            setDeleteConfirmationOpen(false);
        }
    }


    if (!dailyRecord) return null;

    const currentLog = activeTab === 0 ? inLog : outLog;
    const isNew = !currentLog;
    const isManualStatus = currentLog?.resolutionMode === 'status_only';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6">{readOnly ? "View Attendance Details" : "Edit Attendance Details"}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {dayjs(dailyRecord.date).format("dddd, MMMM D, YYYY")} | {employee?.name || (dailyRecord as any).shiftName || "Employee"}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {headerMetadata.isHoliday && (
                                <Chip
                                    label={`Holiday: ${headerMetadata.holidayName || 'Public Holiday'}`}
                                    color="secondary"
                                    size="small"
                                />
                            )}
                            {headerMetadata.isOffDay && !headerMetadata.isHoliday && (
                                <Chip
                                    label="Scheduled Off Day"
                                    color="default"
                                    size="small"
                                />
                            )}
                            {headerMetadata.isLeave && (
                                <Chip
                                    label={`Leave: ${headerMetadata.leaveType}${headerMetadata.leaveStatus ? ` (${headerMetadata.leaveStatus})` : ''}`}
                                    color="primary"
                                    size="small"
                                />
                            )}
                        </Stack>
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
                        <Grid item xs={12} sm={3} sx={{
                            borderRight: isMobile ? 'none' : '1px solid',
                            borderBottom: isMobile ? '1px solid' : 'none',
                            borderColor: 'divider',
                            bgcolor: 'background.neutral'
                        }}>
                            <Tabs
                                orientation={isMobile ? "horizontal" : "vertical"}
                                variant={isMobile ? "fullWidth" : "standard"}
                                value={activeTab}
                                onChange={(_, v) => !disableTabSwitch && setActiveTab(v)}
                                sx={{
                                    borderRight: isMobile ? 'none' : 1,
                                    borderColor: 'divider',
                                    height: isMobile ? 'auto' : '100%',
                                    pt: isMobile ? 0 : 2
                                }}
                            >
                                <Tab
                                    disabled={disableTabSwitch}
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography fontWeight="bold">IN PUNCH</Typography>
                                            {inLog ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="disabled" fontSize="small" />}
                                        </Box>
                                    }
                                />
                                <Tab
                                    disabled={disableTabSwitch}
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
                        <Grid item xs={12} sm={9} sx={{ p: 3 }}>

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
                                {isNew && !headerMetadata.isOffDay && !headerMetadata.isHoliday && !headerMetadata.isLeave && <Chip label="MISSING Record" color="error" size="small" />}
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
                                            disabled={readOnly}
                                        />
                                    </LocalizationProvider>
                                    {isNew && !readOnly && (
                                        <Box mt={1}>
                                            <Typography variant="caption" display="flex" alignItems="center" gap={1}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!formData.timestamp}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setFormData({ ...formData, timestamp: dayjs() });
                                                        else setFormData({ ...formData, timestamp: null });
                                                    }}
                                                /> Record Time? (Uncheck for Status Only)
                                            </Typography>
                                        </Box>
                                    )}
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
                                        disabled={readOnly}
                                    >
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </TextField>
                                </Grid>

                                <Grid item xs={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Shift"
                                        value={formData.shiftId}
                                        onChange={(e) => {
                                            setFormData({ ...formData, shiftId: e.target.value });
                                        }}
                                        SelectProps={{ native: true }}
                                        helperText={disableShiftChange ? "Shift editing disabled in this view" : "Select the shift for this attendance"}
                                        disabled={readOnly || disableShiftChange}
                                    >
                                        <option value="">No Shift</option>
                                        {shifts && shifts.length > 0 ? (
                                            shifts.map((shift: any, index: number) => {
                                                // Shifts use _id and name, not shiftId and shiftName
                                                const id = shift._id || shift.shiftId;
                                                const name = shift.name || shift.shiftName;

                                                return (
                                                    <option key={`shift-${index}`} value={id}>
                                                        {name} ({shift.startTime} - {shift.endTime})
                                                    </option>
                                                );
                                            })
                                        ) : (
                                            <option disabled>No shifts available</option>
                                        )}
                                    </TextField>
                                </Grid>

                                <Grid item xs={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Day Status Override"
                                        value={formData.dayStatus}
                                        onChange={(e) => setFormData({ ...formData, dayStatus: e.target.value })}
                                        SelectProps={{ native: true }}
                                        helperText="Overrides calculated status"
                                        disabled={readOnly}
                                    >
                                        <option value="full">Full Day</option>
                                        <option value="half">Half Day</option>
                                        <option value="off">Off Day</option>
                                    </TextField>
                                </Grid>

                                {!readOnly && currentLog && (formData.shiftId !== originalShiftId || formData.dayStatus !== originalDayStatus) && (
                                    <Grid item xs={12}>
                                        <Alert severity="info" icon={<Warning />}>
                                            <Typography variant="caption">
                                                <strong>Note:</strong> Changing the shift or day status will affect OT calculations in salary generation.
                                                Salaries may need to be regenerated to reflect these changes.
                                            </Typography>
                                        </Alert>
                                    </Grid>
                                )}

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="Remarks / Notes"
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        size="small"
                                        disabled={readOnly}
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

                                {/* Device Info & Comparison */}
                                {currentLog && (
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                                            <Typography variant="subtitle2" gutterBottom>Device Information</Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="text.secondary">Device ID</Typography>
                                                    <Typography variant="body2" fontFamily="monospace">
                                                        {currentLog.deviceId || "N/A"}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="text.secondary">Device Details</Typography>
                                                    <Typography variant="body2">
                                                        {currentLog.deviceDetails || "N/A"}
                                                    </Typography>
                                                </Grid>
                                            </Grid>

                                            {/* Previous Device Check */}
                                            <PreviousDeviceCheck
                                                currentLog={currentLog}
                                                employeeId={currentLog?.employee?._id || currentLog?.employee}
                                                companyId={currentLog?.company}
                                            />
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>

                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {currentLog && !readOnly && (
                    <Button onClick={() => setDeleteConfirmationOpen(true)} color="error" disabled={isUpdating}>Delete Log</Button>
                )}
                <Box flexGrow={1} />
                <Button onClick={onClose} disabled={isUpdating}>Close</Button>
                {!readOnly && (
                    <Button variant="contained" onClick={handleSave} disabled={isUpdating}>
                        {isUpdating ? "Saving..." : (isNew ? "Create Record" : "Save Changes")}
                    </Button>
                )}
            </DialogActions>

            {/* Delete Confirmation Dialog */}
            < Dialog open={deleteConfirmationOpen} onClose={() => setDeleteConfirmationOpen(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this attendance record? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmationOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog >
        </Dialog >
    );
};
