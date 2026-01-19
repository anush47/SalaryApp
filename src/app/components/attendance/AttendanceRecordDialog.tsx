import React, { useState, useEffect, useMemo } from "react";
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
import { CheckCircle, Cancel, LocationOn, Delete, AddCircle, Warning, Smartphone } from "@mui/icons-material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { getEffectiveShifts, getEffectiveAttendanceConfig } from "@/app/lib/utils/overrides";
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
            } catch (e) {
                // Silent error
            }
            finally { setChecking(false); }
        };

        checkPrevious();
    }, [currentLog, employeeId, companyId]);

    if (checking) return <Typography variant="caption" color="text.secondary">Checking device history...</Typography>;

    if (!previousLog) {
        return (
            <Alert severity="warning" icon={<Smartphone />} sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">New Device / First Record</Typography>
                <Typography variant="body2">No previous records found for comparison. This device identity is being established now.</Typography>
            </Alert>
        );
    }

    const currentId = currentLog.deviceId || "";
    const prevId = previousLog.deviceId || "";

    if (!currentId) {
        return (
            <Alert severity="warning" icon={<Smartphone />} sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">Device Identity Missing</Typography>
                <Typography variant="body2">This record lacks a unique device ID. This can happen with manual entries or browser refreshes. This entry has been flagged.</Typography>
            </Alert>
        );
    }

    if (!prevId) {
        return (
            <Alert severity="warning" icon={<Smartphone />} sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">New Device Identity</Typography>
                <Typography variant="body2">The previous record had no device ID. This record is establishing a new identity: <code>{currentId.substring(0, 8)}...</code></Typography>
            </Alert>
        );
    }

    if (currentId !== prevId) {
        return (
            <Alert severity="warning" icon={<Smartphone />} sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">New device detected - This will be flagged</Typography>
                <Typography variant="body2">
                    Current device <code>{currentId.substring(0, 8)}...</code> differs from previous record <code>{prevId.substring(0, 8)}...</code>.
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
    userRole?: 'employer' | 'manager' | 'employee';
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
    disableShiftChange = false,
    userRole = 'employer'
}) => {
    const { showSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));




    // State for multiple sessions/logs
    const [fetchedLogs, setFetchedLogs] = useState<Record<string, any>>({});
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState(0); // 0 for IN, 1 for OUT

    // Session Deletion State
    const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
    const [deletingSession, setDeletingSession] = useState(false);

    // Dirty Tracking & Confirmation
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'switch_session' | 'switch_tab' | 'close', payload?: any } | null>(null);
    const [lastSavedTimes, setLastSavedTimes] = useState<Record<string, number>>({}); // To track saves helper
    // Local overrides for session log IDs (to reflect saved state immediately without parent refresh)
    const [sessionOverrides, setSessionOverrides] = useState<Record<string, { inLogId?: string, outLogId?: string }>>({});


    // Header Metadata (Holidays/Leaves) - especially for All view where dailyRecord is partial
    const [headerMetadata, setHeaderMetadata] = useState<{
        isHoliday: boolean;
        holidayName?: string;
        isOffDay: boolean;
        isLeave: boolean;
        leaveType?: string;
        leaveStatus?: string;
        isLate?: boolean;
        isLeftEarly?: boolean;
        isLessHours?: boolean;
    }>({
        isHoliday: dailyRecord?.isHoliday || false,
        holidayName: dailyRecord?.holidayName,
        isOffDay: dailyRecord?.isOffDay || false,
        isLeave: dailyRecord?.status === 'Leave' || !!dailyRecord?.leaveType,
        leaveType: dailyRecord?.leaveType,
        leaveStatus: dailyRecord?.leaveStatus,
        isLate: dailyRecord?.isLate || false,
        isLeftEarly: dailyRecord?.isLeftEarly || false
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
                leaveStatus: dailyRecord.leaveStatus,
                isLate: dailyRecord.isLate || false,
                isLeftEarly: dailyRecord.isLeftEarly || false,
                isLessHours: dailyRecord.isLessHours || false
            });
        }
    }, [dailyRecord]);

    // Persistent Form Data for Tabs and Sessions
    // Key: `${sessionIdx}-${type}` where type is 'in' or 'out'
    const [sessionFormData, setSessionFormData] = useState<Record<string, any>>({});

    // Virtual sessions (newly created but not saved)
    const [manualSessions, setManualSessions] = useState<any[]>([]);

    // Compute Effective Shifts (Employee Overrides vs Company Defaults)
    const effectiveShifts = useMemo(() => {
        return getEffectiveShifts(companyConfig, employee);
    }, [employee, companyConfig]);

    // Compute Effective Zone Overrides
    const effectiveAttendanceOverrides = useMemo(() => {
        return getEffectiveAttendanceConfig(companyConfig, employee);
    }, [employee, companyConfig]);

    // Helper to get defaults based on shift
    const getShiftDefaults = (shiftId: string, type: 'in' | 'out', dateStr: string) => {
        const shift = effectiveShifts.find((s: any) => (s._id || s.shiftId) === shiftId);
        let defaultTime = null;

        if (shift) {
            const timeStr = type === 'in' ? shift.startTime : shift.endTime;
            if (timeStr) {
                // Parse "HH:mm" from shift settings
                const [h, m] = timeStr.split(':').map(Number);
                defaultTime = dayjs(dateStr).hour(h).minute(m).second(0);
            }
        }

        // Fallbacks if no shift time: 9 AM for IN, 6 PM for OUT
        if (!defaultTime) {
            defaultTime = type === 'in'
                ? dayjs(dateStr).hour(9).minute(0).second(0)
                : dayjs(dateStr).hour(18).minute(0).second(0);
        }

        return defaultTime;
    };

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
                    // 1. Collect all Log IDs to fetch
                    const sessionData = dailyRecord.sessions || [];
                    const logIds = new Set<string>();
                    sessionData.forEach(s => {
                        if (s.inLogId) logIds.add(s.inLogId);
                        if (s.outLogId) logIds.add(s.outLogId);
                    });
                    if (dailyRecord.inLogId) logIds.add(dailyRecord.inLogId);
                    if (dailyRecord.outLogId) logIds.add(dailyRecord.outLogId);

                    const results = await Promise.all(
                        Array.from(logIds).map(id => fetch(`/api/attendance/${id}`).then(r => r.json()))
                    );

                    const logsMap: Record<string, any> = {};
                    results.forEach(res => {
                        if (res.success) {
                            logsMap[res.data._id] = res.data;
                        }
                    });

                    setFetchedLogs(logsMap);

                    // If no logs found but we have dailyRecord date, initialize for new log
                    const firstSession = sessionData[0];
                    if (firstSession) {
                        setSelectedSessionIdx(0);
                        setActiveSubTab(0);
                    } else {
                        setSelectedSessionIdx(0);
                        // Auto-select tab based on provided Log IDs (e.g., for All Logs view where we target specific punch)
                        if (dailyRecord.outLogId && !dailyRecord.inLogId) {
                            setActiveSubTab(1);
                        } else {
                            setActiveSubTab(0);
                        }
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
            setFetchedLogs({});
        }
    }, [open, dailyRecord]);

    // Reset manualSessions when dialog opens to prevent stale virtual sessions
    useEffect(() => {
        if (open) {
            setManualSessions([]);
        }
    }, [open]);

    // Derived Sessions from Fetched Logs (Time-based reconstruction as per user request)
    const sessions = useMemo(() => {
        const logs = Object.values(fetchedLogs);
        if (logs.length === 0) {
            // Fallback to dailyRecord sessions if fetched logs are empty (e.g. initial load)
            // But usually we prefer fetching. 
            if (dailyRecord?.sessions?.length) return dailyRecord.sessions.map((s: any) => ({ ...s, id: s.inLogId || s.outLogId || `legacy-${Math.random()}` }));
            return [];
        }

        // Sort by timestamp
        const sortedLogs = logs.sort((a: any, b: any) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf());

        const reconstructedSessions: any[] = [];
        let currentSession: any = {};

        sortedLogs.forEach((log: any) => {
            if (log.type === 'in') {
                if (currentSession.inLogId) {
                    // Start new session if we already have an IN (implies missing OUT for previous)
                    reconstructedSessions.push({ ...currentSession, id: currentSession.inLogId || `session-${Math.random()}` });
                    currentSession = {};
                }
                currentSession.inLogId = log._id;
                currentSession.checkInTime = log.timestamp;
            } else if (log.type === 'out') {
                currentSession.outLogId = log._id;
                currentSession.checkOutTime = log.timestamp;
                // Close session
                reconstructedSessions.push({ ...currentSession, id: currentSession.inLogId || currentSession.outLogId || `session-${Math.random()}` });
                currentSession = {};
            }
        });

        // Push pending session
        if (currentSession.inLogId || currentSession.outLogId) {
            reconstructedSessions.push({ ...currentSession, id: currentSession.inLogId || currentSession.outLogId || `session-${Math.random()}` });
        }

        return reconstructedSessions;
    }, [fetchedLogs, dailyRecord]);

    // Combined sessions: Reconstructed + New Manual Sessions
    // No more complex overrides or state mgmt for saves
    const allSessions = useMemo(() => {
        return [...sessions, ...manualSessions];
    }, [sessions, manualSessions]);

    const currentSession = allSessions[selectedSessionIdx] || null;
    const currentLogId = activeSubTab === 0 ? currentSession?.inLogId : currentSession?.outLogId;
    const currentLog = currentLogId ? fetchedLogs[currentLogId] : null;

    // Update form when session or sub-tab changes
    // Initialize or Update Form Data on Tab/Log Change
    useEffect(() => {
        const type = activeSubTab === 0 ? 'in' : 'out';
        // Use Stable Session ID
        const formKey = currentSession?.id ? `${currentSession.id}-${type}` : '';
        if (!formKey) return;

        // Priority: IN Log Shift (if exists and matching session) > dailyRecord.shiftId > employee.shift > empty
        const inLogShift = (currentSession?.inLogId && Array.isArray(fetchedLogs)) ? fetchedLogs.find((l: any) => l._id === currentSession.inLogId)?.shift : null;
        const inLogShiftId = inLogShift?.shiftId || inLogShift?._id || (typeof inLogShift === 'string' ? inLogShift : undefined);

        const shiftIdToUse = inLogShiftId
            || dailyRecord?.shiftId
            || employee?.shift?._id
            || employee?.shift?.shiftId
            || (typeof employee?.shift === 'string' ? employee?.shift : '')
            || "";

        setSessionFormData(prev => {
            const currentData = prev[formKey];
            let baseData: any = {};

            if (currentLog) {
                // Edit Mode: Sync with DB Log always, but ensure shift is set
                const shiftId = currentLog.shift?.shiftId
                    || currentLog.shift?._id
                    || (typeof currentLog.shift === 'string' ? currentLog.shift : '')
                    || shiftIdToUse; // Fallback to employee's shift if log has no shift

                baseData = {
                    timestamp: currentLog.resolutionMode === 'status_only' ? null : dayjs(currentLog.timestamp),
                    status: currentLog.status || 'approved',
                    remarks: currentLog.remarks || '',
                    shiftId: shiftId,
                    dayStatus: currentLog.dayStatus || 'full',
                    mode: 'edit'
                };
            } else {
                // Create Mode - Initialize Defaults
                const defaultTimestamp = getShiftDefaults(shiftIdToUse, type, dailyRecord?.date || dayjs().format('YYYY-MM-DD'));
                baseData = {
                    timestamp: defaultTimestamp,
                    status: 'approved',
                    remarks: '',
                    shiftId: shiftIdToUse,
                    dayStatus: dailyRecord?.isOffDay || dailyRecord?.isHoliday ? 'off' : 'full',
                    mode: 'create'
                };
            }

            // Merge calculated base data with any existing currentData (which may contain user edits or sync'd values)
            // currentData props take precedence (e.g. user changed shiftId)
            return {
                ...prev,
                [formKey]: {
                    ...baseData,
                    ...(currentData || {})
                }
            };
        });

        if (currentLog) {
            const shiftId = currentLog.shift?.shiftId || currentLog.shift?._id || (typeof currentLog.shift === 'string' ? currentLog.shift : '');
            setOriginalShiftId(shiftId);
            setOriginalDayStatus(currentLog.dayStatus || 'full');
        }

    }, [selectedSessionIdx, activeSubTab, fetchedLogs, dailyRecord, allSessions]);

    // Current Form Data Accessor
    const activeFormKey = currentSession?.id ? `${currentSession.id}-${activeSubTab === 0 ? 'in' : 'out'}` : '';
    const formData = sessionFormData[activeFormKey] || {
        timestamp: null,
        status: 'approved',
        remarks: '',
        shiftId: '',
        dayStatus: 'full'
    };

    const handleFormChange = (field: string, value: any) => {
        setSessionFormData(prev => {
            const updates: any = {};
            updates[activeFormKey] = {
                ...prev[activeFormKey],
                [field]: value
            };

            // Sync Shift and Day Status from IN to OUT automatically
            // This ensures saving OUT uses the updated values even if we don't switch to it
            if (activeSubTab === 0 && (field === 'shiftId' || field === 'dayStatus')) {
                const outKey = activeFormKey.replace(/-in$/, '-out');
                if (outKey && outKey !== activeFormKey) {
                    updates[outKey] = {
                        ...(prev[outKey] || {}),
                        [field]: value
                    };
                }
            }

            return {
                ...prev,
                ...updates
            };
        });
    };




    const isFormDirty = (specificKey?: string) => {
        const key = specificKey || activeFormKey;
        const currentData = sessionFormData[key];
        if (!currentData) return false;

        const session = allSessions[selectedSessionIdx];
        if (!session) return false;

        const isIn = key.endsWith('-in');
        const logId = isIn ? session.inLogId : session.outLogId;
        const targetLog = logId ? fetchedLogs[logId] : null;

        // New Record Check
        if (!logId) {
            // Check if form data is just the default values
            const type = isIn ? 'in' : 'out';

            // Re-calculate defaults to compare
            const inLogShift = (currentSession?.inLogId && Array.isArray(fetchedLogs))
                ? fetchedLogs.find((l: any) => l._id === currentSession.inLogId)?.shift
                : null;
            const inLogShiftId = inLogShift?.shiftId || inLogShift?._id || (typeof inLogShift === 'string' ? inLogShift : undefined);
            const shiftIdToUse = inLogShiftId
                || dailyRecord?.shiftId
                || employee?.shift?._id
                || employee?.shift?.shiftId
                || (typeof employee?.shift === 'string' ? employee?.shift : '')
                || "";

            const defaultTimestamp = getShiftDefaults(shiftIdToUse, type, dailyRecord?.date || dayjs().format('YYYY-MM-DD'));
            const defaultDayStatus = dailyRecord?.isOffDay || dailyRecord?.isHoliday ? 'off' : 'full';

            const isTimeSame = (!currentData.timestamp && !defaultTimestamp) ||
                (currentData.timestamp && defaultTimestamp && currentData.timestamp.isSame(defaultTimestamp));
            const isShiftSame = (currentData.shiftId || "") === (shiftIdToUse || "");
            const isDayStatusSame = (currentData.dayStatus || 'full') === defaultDayStatus;
            const isRemarksClean = !currentData.remarks;
            const isStatusClean = currentData.status === 'approved';

            // If everything matches defaults, it's not dirty
            if (isTimeSame && isShiftSame && isDayStatusSame && isRemarksClean && isStatusClean) {
                return false;
            }
            return true;
        }

        // Existing Record: Compare fields
        const initialShiftId = targetLog.shift?.shiftId || targetLog.shift?._id || (typeof targetLog.shift === 'string' ? targetLog.shift : '') || "";
        const currentShiftId = currentData.shiftId || "";
        if (currentShiftId !== initialShiftId) return true;

        if ((currentData.remarks || '') !== (targetLog.remarks || '')) return true;
        if (currentData.status !== targetLog.status) return true;
        if ((currentData.dayStatus || 'full') !== (targetLog.dayStatus || 'full')) return true;

        // Time comparison
        const initialTime = targetLog.timestamp ? dayjs(targetLog.timestamp) : null;
        const currentTime = currentData.timestamp;

        if (!initialTime && currentTime) return true;
        if (initialTime && !currentTime) return true;

        if (initialTime && currentTime) {
            // Use second precision to avoid ms mismatch
            if (!initialTime.isSame(currentTime, 'second')) return true;
        }

        return false;
    };

    // Navigation now performs action immediately without dirty checks (User requested stateless simplicity)
    const handleNavigation = (action: { type: 'switch_session' | 'switch_tab' | 'close', payload?: any }) => {
        performAction(action);
    };
    const handleSave = async () => {
        setIsUpdating(true);
        try {
            const employeeId = employee?._id || (dailyRecord as any).employeeId;
            if (!employeeId) throw new Error("Employee ID required");

            const promises: Promise<any>[] = [];

            // Iterate through every session and check for form data to save
            for (const session of allSessions) {
                // Check IN and OUT forms
                ['in', 'out'].forEach(type => {
                    const key = `${session.id}-${type}`;
                    const form = sessionFormData[key];

                    // Proceed only if form exists, has timestamp, and mode is set (implies user interaction or init)
                    // We save if it exists in formData.
                    if (form && form.timestamp) {
                        const logId = type === 'in' ? session.inLogId : session.outLogId;

                        // Construct Shift Object if needed
                        let shiftObject = null;
                        if (form.shiftId && shifts?.length > 0) {
                            const foundShift = shifts.find((s: any) => s._id === form.shiftId || s.shiftId === form.shiftId);
                            if (foundShift) {
                                shiftObject = {
                                    shiftId: foundShift._id || foundShift.shiftId,
                                    name: foundShift.name,
                                    startTime: foundShift.startTime,
                                    endTime: foundShift.endTime,
                                    type: foundShift.type
                                };
                            }
                        }

                        if (logId) {
                            // UPDATE
                            const p = fetch('/api/attendance', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: logId,
                                    status: form.status,
                                    timestamp: form.timestamp.toISOString(),
                                    shiftId: form.shiftId,
                                    shift: shiftObject,
                                    remarks: form.remarks,
                                    dayStatus: form.dayStatus
                                })
                            }).then(r => r.json());
                            promises.push(p);
                        } else {
                            // CREATE
                            // Chain: POST -> Check Success -> If status is not pending, PUT to enforce status
                            // This works around backend potentially ignoring 'status' strictly on creation
                            const p = createAttendance({
                                employeeId,
                                timestamp: form.timestamp.toDate(),
                                type: type as 'in' | 'out',
                                shiftId: form.shiftId,
                                shift: shiftObject,
                                dayStatus: form.dayStatus,
                                remarks: form.remarks || '',
                                status: form.status
                            }).then(async (res: any) => {
                                if (res && (res.success === true || res.id)) {
                                    const newId = res.id || res.data?._id || res.data?.id;
                                    // If we have an ID and we wanted 'approved'/'rejected', but backend might have defaulted to 'pending'
                                    // We force an update.
                                    if (newId && form.status && form.status !== 'pending') {
                                        await fetch('/api/attendance', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                id: newId,
                                                status: form.status,
                                                timestamp: form.timestamp.toISOString(),
                                                // Re-send other fields to be safe
                                                shiftId: form.shiftId,
                                                shift: shiftObject,
                                                remarks: form.remarks,
                                                dayStatus: form.dayStatus
                                            })
                                        });
                                    }
                                }
                                return res;
                            });
                            promises.push(p);
                        }
                    }
                });
            }

            if (promises.length === 0) {
                showSnackbar({ message: "No valid data to save", severity: "info" });
                return;
            }

            const results = await Promise.all(promises);
            // Check if any failed
            const failed = results.find(r => !r || (r.hasOwnProperty('success') && !r.success));
            if (failed) {
                throw new Error(failed.error?.message || "Some records failed to save");
            }

            showSnackbar({ message: "All records saved successfully", severity: "success" });

            // Simple: Refresh and Close
            onSaveSuccess?.();
            onClose();

        } catch (e) {
            console.error('[Attendance] Save error:', e);
            showSnackbar({
                message: e instanceof Error ? e.message : "Error saving records",
                severity: "error"
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const performAction = (action: { type: 'switch_session' | 'switch_tab' | 'close', payload?: any }) => {
        if (action.type === 'switch_session') {
            setSelectedSessionIdx(action.payload);
            setActiveSubTab(0);
        } else if (action.type === 'switch_tab') {
            setActiveSubTab(action.payload);
        } else if (action.type === 'close') {
            onClose();
        }
    };



    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

    // Session Deletion
    const handleSessionDelete = async () => {
        if (sessionToDelete === null) return;
        setDeletingSession(true);

        const session = allSessions[sessionToDelete];
        // If it's a new virtual session (no IDs), just remove it from state by effectively ignoring it
        // If it's a new virtual session (no inLogId/outLogId means likely manual)
        // Check if it's in the manual sessions range
        if (sessionToDelete >= sessions.length) {
            const manualIdx = sessionToDelete - sessions.length;
            setManualSessions(prev => prev.filter((_, i) => i !== manualIdx));
            setSessionToDelete(null);
            setDeletingSession(false);

            // Adjust selection logic - switch to previous or 0
            setSelectedSessionIdx(prev => Math.max(0, prev - 1));
            return;
        }

        try {
            const idsToDelete = [];
            if (session.inLogId) idsToDelete.push({ id: session.inLogId, type: 'IN' });
            if (session.outLogId) idsToDelete.push({ id: session.outLogId, type: 'OUT' });

            // Perform deletions sequentially to ensure we catch failures properly
            for (const item of idsToDelete) {
                const res = await deleteAttendance(item.id);
                if (!res.success) {
                    throw new Error(`Failed to delete ${item.type} record (${item.id}): ${res.error?.message || 'Unknown error'}`);
                }
            }

            console.log(`[SessionDelete] Successfully deleted session ${sessionToDelete}`);
            showSnackbar({ message: "Session deleted successfully", severity: 'success' });
            onSaveSuccess?.();
            onClose();
        } catch (e: any) {
            console.error("[SessionDelete] Error:", e);
            const msg = e instanceof Error ? e.message : "Failed to delete session";
            showSnackbar({ message: msg, severity: 'error' });
        } finally {
            setDeletingSession(false);
            setSessionToDelete(null);
        }
    };

    // Single Log Deletion (for "Delete Log" button in DialogActions)
    const handleDelete = async () => {
        const targetLog = currentLog;
        if (!targetLog) return;

        setIsUpdating(true);
        try {
            const res = await deleteAttendance(targetLog._id);
            if (res.success) {
                console.log(`[LogDelete] Successfully deleted log ${targetLog._id}`);
                showSnackbar({ message: "Log deleted", severity: 'success' });
                onSaveSuccess?.();
                onClose();
            } else {
                throw new Error(res.error?.message || 'Unknown error');
            }
        } catch (e: any) {
            console.error("[LogDelete] Error:", e);
            const msg = e instanceof Error ? e.message : "Error deleting";
            showSnackbar({ message: msg, severity: 'error' });
        } finally {
            setIsUpdating(false);
            setDeleteConfirmationOpen(false);
        }
    };



    if (!dailyRecord) return null;

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
                            {headerMetadata.isLate && (
                                <Chip
                                    label="LATE"
                                    color="error"
                                    size="small"
                                />
                            )}
                            {headerMetadata.isLeftEarly && (
                                <Chip
                                    label="EARLY"
                                    color="warning"
                                    size="small"
                                />
                            )}
                            {headerMetadata.isLessHours && (
                                <Chip
                                    label="SHORT"
                                    color="warning"
                                    size="small"
                                />
                            )}
                        </Stack>
                    </Box>
                    <IconButton onClick={() => handleNavigation({ type: 'close' })} size="small"><Cancel /></IconButton>
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
                            bgcolor: 'background.neutral',
                            maxHeight: isMobile ? '200px' : 'none',
                            overflowY: 'auto'
                        }}>
                            <Box sx={{ p: 2 }}>
                                <Typography variant="overline" color="text.secondary">Sessions</Typography>
                            </Box>
                            <Tabs
                                orientation="vertical"
                                variant="scrollable"
                                value={selectedSessionIdx}
                                onChange={(_, v) => {
                                    handleNavigation({ type: 'switch_session', payload: v });
                                }}
                                sx={{
                                    borderRight: isMobile ? 'none' : 1,
                                    borderColor: 'divider',
                                    '& .MuiTabs-indicator': { left: 0, right: 'auto', width: 3 },
                                    '& .MuiTab-root': {
                                        alignItems: 'flex-start',
                                        textAlign: 'left',
                                        py: 1.5,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        maxWidth: '100%'
                                    }
                                }}
                            >
                                {allSessions.map((s, idx) => (
                                    <Tab
                                        component="div"
                                        key={idx}
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">Session {idx + 1}</Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {s.checkInTime ? dayjs(s.checkInTime).format("hh:mm A") : "No IN"} - {s.checkOutTime ? dayjs(s.checkOutTime).format("hh:mm A") : "No OUT"}
                                                    </Typography>
                                                </Box>
                                                {!readOnly && userRole !== 'manager' && !disableTabSwitch && (
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent tab switch
                                                            setSessionToDelete(idx);
                                                        }}
                                                        sx={{ ml: 1, opacity: 0.6, '&:hover': { opacity: 1 } }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        }
                                        value={idx}
                                        onClick={(e) => {
                                            // Handled by Tabs onChange usually, but if using onClick prop
                                            // Not needed if using Tabs value/onChange
                                        }}
                                        sx={{ flexGrow: 1, alignItems: 'flex-start', textAlign: 'left', maxWidth: '100%', cursor: 'pointer' }}
                                    />
                                ))}
                            </Tabs>
                            <Box p={1} borderTop="1px solid" borderColor="divider">
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<AddCircle />}
                                    size="small"
                                    onClick={() => {
                                        // Adding session is safe (no switch), but switching TO it afterwards needs guard?
                                        // The current logic adds and then switches.
                                        // If current form is dirty, we should probably warn before adding?
                                        // Or allow adding but warn on auto-switch?
                                        // Let's check dirty before adding.
                                        if (isFormDirty()) {
                                            // Warn that they must save current session first?
                                            // Or allow switch?
                                            // Let's just warn.
                                            // Reuse switch logic? 
                                            // "Adding a new session will switch to it. Discard current changes?"
                                            // A bit complex to pass "Add Action".
                                            // Let's just block if dirty.
                                            handleNavigation({
                                                type: 'switch_session',
                                                payload: allSessions.length // Target new index
                                            });
                                            // Note: This won't actually ADD the session if declined.
                                            // But if specific action needed...
                                            // Simplified: Just allow adding if clean.
                                        } else {
                                            const newId = crypto.randomUUID();
                                            setManualSessions(prev => [...prev, {
                                                id: newId,
                                                inLogId: null,
                                                outLogId: null,
                                                checkInTime: null,
                                                checkOutTime: null,
                                                inDeviceChange: false,
                                                outDeviceChange: false
                                            }]);
                                            setTimeout(() => {
                                                setSelectedSessionIdx(allSessions.length);
                                                setActiveSubTab(0);
                                            }, 0);
                                        }
                                    }}
                                    disabled={disableTabSwitch} // Disable in logs view
                                >
                                    Add Session
                                </Button>
                            </Box>
                        </Grid>

                        {/* Content Area */}
                        <Grid item xs={12} sm={9} sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <Tabs
                                    value={activeSubTab}
                                    onChange={(_, v) => {
                                        if (!disableTabSwitch) {
                                            handleNavigation({ type: 'switch_tab', payload: v });
                                        }
                                    }}
                                    variant="fullWidth"
                                >
                                    <Tab
                                        disabled={disableTabSwitch && activeSubTab !== 0}
                                        label={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="subtitle2">IN PUNCH</Typography>
                                                {currentSession?.inLogId ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="disabled" fontSize="small" />}
                                            </Box>
                                        }
                                    />
                                    <Tab
                                        disabled={disableTabSwitch && activeSubTab !== 1}
                                        label={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="subtitle2">OUT PUNCH</Typography>
                                                {currentSession?.outLogId ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="disabled" fontSize="small" />}
                                            </Box>
                                        }
                                    />
                                </Tabs>
                            </Box>

                            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                                {allSessions.length === 0 ? (
                                    // Empty State: No Sessions
                                    <Box
                                        display="flex"
                                        flexDirection="column"
                                        alignItems="center"
                                        justifyContent="center"
                                        height="100%"
                                        gap={3}
                                        sx={{ minHeight: 300 }}
                                    >
                                        <Box textAlign="center">
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No Session Available
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                                                Please create a session first to add attendance records. Each session represents a check-in and check-out pair.
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddCircle />}
                                            onClick={() => {
                                                const newId = crypto.randomUUID();
                                                setManualSessions([{
                                                    id: newId,
                                                    inLogId: null,
                                                    outLogId: null,
                                                    checkInTime: null,
                                                    checkOutTime: null,
                                                    inDeviceChange: false,
                                                    outDeviceChange: false
                                                }]);
                                                // setNewSessionCount removed
                                                setTimeout(() => {
                                                    setSelectedSessionIdx(0);
                                                    setActiveSubTab(0);
                                                }, 0);
                                            }}
                                            disabled={readOnly}
                                        >
                                            Create First Session
                                        </Button>
                                    </Box>
                                ) : (
                                    // Existing Form Content
                                    <>
                                        {/* Header Status of the specific log */}
                                        <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                            <Typography variant="h6" color="primary">
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
                                                        value={sessionFormData[activeFormKey]?.timestamp || null}
                                                        onChange={(v) => {
                                                            // Lock to selected day ONLY for IN punch
                                                            // OUT punch can be on subsequent days (overnight shifts)
                                                            if (activeSubTab === 0 && v && dailyRecord?.date) {
                                                                const [year, month, day] = dailyRecord.date.split('-').map(Number);
                                                                const lockedDate = v
                                                                    .year(year)
                                                                    .month(month - 1)
                                                                    .date(day);
                                                                handleFormChange('timestamp', lockedDate);
                                                            } else {
                                                                // OUT punch: Full freedom
                                                                handleFormChange('timestamp', v);
                                                            }
                                                        }}
                                                        minDate={
                                                            activeSubTab === 1 && currentSession?.id
                                                                ? (sessionFormData[`${currentSession.id}-in`]?.timestamp || (dailyRecord?.date ? dayjs(dailyRecord.date) : undefined))
                                                                : (dailyRecord?.date ? dayjs(dailyRecord.date) : undefined)
                                                        }
                                                        maxDate={undefined} // Remove max date restriction to allow future/next day
                                                        slotProps={{
                                                            textField: {
                                                                fullWidth: true,
                                                                size: 'small',
                                                                helperText: activeSubTab === 0 && dailyRecord?.date
                                                                    ? `Date locked to ${dayjs(dailyRecord.date).format('MMM D')}`
                                                                    : (activeSubTab === 1 ? "Date can be different for overnight shifts" : undefined)
                                                            }
                                                        }}
                                                        disabled={readOnly || userRole === 'manager'}
                                                    />
                                                </LocalizationProvider>
                                                {isNew && !readOnly && userRole !== 'manager' && (
                                                    <Box mt={1}>
                                                        <Typography variant="caption" display="flex" alignItems="center" gap={1}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!sessionFormData[activeFormKey]?.timestamp}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) handleFormChange('timestamp', dayjs());
                                                                    else handleFormChange('timestamp', null);
                                                                }}
                                                            /> Record Time? (Uncheck for Status Only)
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {userRole === 'manager' && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                        Time editing is disabled for managers.
                                                    </Typography>
                                                )}
                                            </Grid>

                                            <Grid item xs={6}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Status"
                                                    value={sessionFormData[activeFormKey]?.status}
                                                    onChange={(e) => handleFormChange('status', e.target.value)}
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
                                                    value={sessionFormData[activeFormKey]?.shiftId}
                                                    onChange={(e) => {
                                                        handleFormChange('shiftId', e.target.value);
                                                    }}
                                                    SelectProps={{ native: true }}
                                                    helperText={
                                                        activeSubTab === 1
                                                            ? "Shift inherited from Check-In"
                                                            : (disableShiftChange || userRole === 'manager' ? "Shift editing disabled" : (sessionFormData[activeFormKey]?.shiftId ? "Select the shift for this attendance" : "⚠️ Please select a shift"))
                                                    }
                                                    disabled={readOnly || disableShiftChange || userRole === 'manager' || activeSubTab === 1}
                                                    error={!sessionFormData[activeFormKey]?.shiftId && !readOnly && activeSubTab === 0}
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
                                                    value={sessionFormData[activeFormKey]?.dayStatus}
                                                    onChange={(e) => handleFormChange('dayStatus', e.target.value)}
                                                    SelectProps={{ native: true }}
                                                    helperText={
                                                        activeSubTab === 1
                                                            ? "Inherited from IN punch"
                                                            : (userRole === 'manager' || disableTabSwitch ? "Override disabled" : "Overrides calculated status")
                                                    }
                                                    disabled={readOnly || userRole === 'manager' || disableTabSwitch || activeSubTab === 1}
                                                >
                                                    <option value="full">Full Day</option>
                                                    <option value="half">Half Day</option>
                                                    <option value="off">Off Day</option>
                                                </TextField>
                                            </Grid>

                                            {!readOnly && userRole !== 'manager' && currentLog && (sessionFormData[activeFormKey]?.shiftId !== originalShiftId || sessionFormData[activeFormKey]?.dayStatus !== originalDayStatus) && (
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
                                                    value={sessionFormData[activeFormKey]?.remarks}
                                                    onChange={(e) => handleFormChange('remarks', e.target.value)}
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
                                                            employeeOverrides={effectiveAttendanceOverrides}
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
                                    </>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {!readOnly && (
                    <Button
                        onClick={() => setDeleteConfirmationOpen(true)}
                        color="error"
                        disabled={!currentLog || isUpdating}
                    >
                        Delete Log
                    </Button>
                )}
                <Box flexGrow={1} />
                <Button onClick={() => handleNavigation({ type: 'close' })} disabled={isUpdating}>Close</Button>
                {!readOnly && (
                    <Button variant="contained" onClick={handleSave} disabled={isUpdating}>
                        {isUpdating ? "Saving..." : "Save All Changes"}
                    </Button>
                )}
            </DialogActions>

            {/* Session Delete Confirmation Dialog */}
            <Dialog open={sessionToDelete !== null} onClose={() => setSessionToDelete(null)}>
                <DialogTitle>Confirm Session Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>Session {sessionToDelete !== null ? sessionToDelete + 1 : ''}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This will permanently remove both the Check-IN and Check-OUT records associated with this session. This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSessionToDelete(null)} disabled={deletingSession}>Cancel</Button>
                    <Button onClick={handleSessionDelete} color="error" variant="contained" autoFocus disabled={deletingSession}>
                        {deletingSession ? "Deleting..." : "Delete Session"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Unsaved Changes Warning */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Unsaved Changes</DialogTitle>
                <DialogContent>
                    <Typography>
                        You have unsaved changes in the <strong>{activeSubTab === 0 ? "IN" : "OUT"}</strong> record for <strong>Session {selectedSessionIdx + 1}</strong>.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Do you want to discard these changes?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            setConfirmOpen(false);
                            if (pendingAction) {
                                performAction(pendingAction);
                                setPendingAction(null);
                            }
                        }}
                        color="error"
                        variant="contained"
                        autoFocus
                    >
                        Discard Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Log Delete Confirmation Dialog (Existing single log delete) */}
            < Dialog open={deleteConfirmationOpen} onClose={() => setDeleteConfirmationOpen(false)}>
                <DialogTitle>Confirm Log Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this <strong>{activeSubTab === 0 ? "IN" : "OUT"}</strong> record?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmationOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" autoFocus>
                        Delete Record
                    </Button>
                </DialogActions>
            </Dialog >
        </Dialog >
    );
};
