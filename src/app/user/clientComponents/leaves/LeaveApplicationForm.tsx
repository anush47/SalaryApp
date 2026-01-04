"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    CircularProgress,
    Chip,
    Switch,
    FormControlLabel,
    RadioGroup,
    Radio,
    FormLabel,
} from "@mui/material";
import { Send, Add } from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { FileUpload } from "@/app/components/FileUpload";
import { FileViewer } from "@/app/components/FileViewer";
import { fetchEmployees } from "@/app/lib/api/employeeApi";
import { fetchLeaveTypes } from "@/app/lib/api/leaveTypeApi";
import { createLeaveRequest } from "@/app/lib/api/leaveRequestApi";
import { uploadFile } from "@/app/lib/uploadService";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

interface LeaveApplicationFormProps {
    companyId: string;
    employeeId?: string; // If provided, user is fixed. If undefined, admin mode (select employee).
    onSuccess?: () => void;
    onCancel?: () => void;
    isDialog?: boolean; // Adjust styling if in dialog
}

export const LeaveApplicationForm: React.FC<LeaveApplicationFormProps> = ({
    companyId,
    employeeId: propEmployeeId,
    onSuccess,
    onCancel,
    isDialog = false,
}) => {
    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    // State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(propEmployeeId || "");
    const [selectedLeaveType, setSelectedLeaveType] = useState("");
    const [startDate, setStartDate] = useState<Dayjs | null>(null);
    const [endDate, setEndDate] = useState<Dayjs | null>(null);
    const [halfDay, setHalfDay] = useState(false);
    const [halfDayPeriod, setHalfDayPeriod] = useState<"first_half" | "final_half">("first_half");
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [endTime, setEndTime] = useState<Dayjs | null>(null);
    const [reason, setReason] = useState("");
    const [attachments, setAttachments] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [errors, setErrors] = useState({
        employeeId: "",
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        startTime: "",
        endTime: "",
        halfDayPeriod: "",
    });

    // Effect to update employeeId if prop changes
    useEffect(() => {
        if (propEmployeeId) {
            setSelectedEmployeeId(propEmployeeId);
        }
    }, [propEmployeeId]);

    // Queries
    const { data: employeesData = [], isLoading: loadingEmployees } = useQuery({
        queryKey: ["employees", companyId, "forLeaveRequest"],
        queryFn: () => fetchEmployees({ companyId: companyId }),
        enabled: !propEmployeeId,
        staleTime: 5 * 60 * 1000,
    });

    const employees = Array.isArray(employeesData) ? employeesData : (employeesData.employees || []);


    const { data: leaveTypes = [], isLoading: loadingLeaveTypes } = useQuery({
        queryKey: ["leaveTypes", companyId],
        queryFn: () => fetchLeaveTypes(companyId),
        enabled: !!companyId,
    });

    // Derived Data
    const selectedTypeData = leaveTypes.find((lt: any) => lt._id === selectedLeaveType);
    const isShortLeave = selectedTypeData?.isShortLeave;
    const allowPastDays = selectedTypeData?.allowPastDays ?? true;

    const employeeNIC = !propEmployeeId && selectedEmployeeId
        ? employees.find((e: any) => e._id === selectedEmployeeId)?.nic
        : null;
    // Note: Getting gender from NIC for filtering types might be tricky if we don't have NIC parsing utility here.
    // But typically leave type filtering by gender happens. 
    // If we don't impl filtering here, it might show all types. 
    // For now, I'll skip complex gender filtering unless I import the utility.
    // It's safer to show all or let backend validate.

    // Mutation
    const createLeaveMutation = useMutation({
        mutationFn: createLeaveRequest,
        onSuccess: () => {
            showSnackbar({
                message: "Leave request submitted successfully",
                severity: "success",
            });
            // Reset form
            if (!propEmployeeId) setSelectedEmployeeId("");
            setSelectedLeaveType("");
            setStartDate(null);
            setEndDate(null);
            setStartTime(null);
            setEndTime(null);
            setHalfDay(false);
            setHalfDayPeriod("first_half");
            setReason("");
            setAttachments([]);
            setSelectedFile(null);
            setErrors({
                employeeId: "",
                leaveType: "",
                startDate: "",
                endDate: "",
                reason: "",
                startTime: "",
                endTime: "",
                halfDayPeriod: "",
            });

            queryClient.invalidateQueries({ queryKey: ["myLeaves"] });
            queryClient.invalidateQueries({ queryKey: ["leaveRequests", companyId] });
            queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });

            if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
            showSnackbar({
                message: error.message || "Failed to submit leave request",
                severity: "error",
            });
        },
    });

    const validateForm = (): boolean => {
        const newErrors = {
            employeeId: "",
            leaveType: "",
            startDate: "",
            endDate: "",
            reason: "",
            startTime: "",
            endTime: "",
            halfDayPeriod: "",
        };

        let isValid = true;

        if (!selectedEmployeeId) {
            newErrors.employeeId = "Please select an employee";
            isValid = false;
        }

        if (!selectedLeaveType) {
            newErrors.leaveType = "Please select a leave type";
            isValid = false;
        }

        if (!startDate) {
            newErrors.startDate = "Date is required";
            isValid = false;
        } else {
            const today = dayjs().startOf('day');
            if (!allowPastDays && startDate.isBefore(today)) {
                newErrors.startDate = "Start date cannot be in the past for this leave type";
                isValid = false;
            }
        }

        if (isShortLeave) {
            if (!startTime) { newErrors.startTime = "Start time is required"; isValid = false; }
            if (!endTime) { newErrors.endTime = "End time is required"; isValid = false; }
            if (startTime && endTime && endTime.isBefore(startTime)) {
                newErrors.endTime = "End time must be after start time";
                isValid = false;
            }
            // Max duration check could be added here
        } else {
            if (!endDate) {
                newErrors.endDate = "End date is required";
                isValid = false;
            } else if (startDate && endDate && endDate.isBefore(startDate)) {
                newErrors.endDate = "End date must be on or after start date";
                isValid = false;
            }
            if (halfDay && !halfDayPeriod) {
                newErrors.halfDayPeriod = "Select period";
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showSnackbar({ message: "Please fix errors", severity: "error" });
            return;
        }

        let uploadedKey = null;
        if (selectedFile) {
            try {
                const result = await uploadFile({
                    file: selectedFile,
                    folder: 'leaves',
                    entityId: selectedEmployeeId,
                    companyId: companyId
                });
                uploadedKey = result.key;
            } catch (error: any) {
                showSnackbar({ message: "Upload failed: " + error.message, severity: "error" });
                return;
            }
        }

        let finalStartDate = startDate;
        let finalEndDate = isShortLeave ? startDate : endDate;

        if (isShortLeave && startTime && endTime && finalStartDate) {
            finalStartDate = finalStartDate.hour(startTime.hour()).minute(startTime.minute());
            finalEndDate = finalStartDate.hour(endTime.hour()).minute(endTime.minute());
        }

        createLeaveMutation.mutate({
            employeeId: selectedEmployeeId,
            leaveTypeId: selectedLeaveType,
            startDate: finalStartDate?.format('YYYY-MM-DD HH:mm') || "",
            endDate: finalEndDate?.format('YYYY-MM-DD HH:mm') || "",
            halfDay: isShortLeave ? false : halfDay,
            halfDayPeriod: (halfDay && !isShortLeave) ? halfDayPeriod : undefined,
            reason: reason.trim(),
            documents: uploadedKey ? [uploadedKey] : [],
        });
    };

    const getCleanFilename = (key: string) => {
        try {
            const parts = key.split('/');
            return parts[parts.length - 1].replace(/^\d{13}-/, '');
        } catch { return key; }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2}>
                {!propEmployeeId && (
                    <Grid item xs={12}>
                        <FormControl fullWidth error={!!errors.employeeId}>
                            <InputLabel>Employee *</InputLabel>
                            <Select
                                value={selectedEmployeeId}
                                label="Employee *"
                                onChange={(e) => {
                                    setSelectedEmployeeId(e.target.value);
                                    setErrors(prev => ({ ...prev, employeeId: "" }));
                                }}
                            >
                                {loadingEmployees ? <MenuItem disabled>Loading...</MenuItem> :
                                    employees.map((emp: any) => (
                                        <MenuItem key={emp._id} value={emp._id}>{emp.name} ({emp.memberNo})</MenuItem>
                                    ))
                                }
                            </Select>
                            {errors.employeeId && <Typography variant="caption" color="error" sx={{ ml: 1 }}>{errors.employeeId}</Typography>}
                        </FormControl>
                    </Grid>
                )}

                <Grid item xs={12}>
                    <FormControl fullWidth error={!!errors.leaveType}>
                        <InputLabel>Leave Type *</InputLabel>
                        <Select
                            value={selectedLeaveType}
                            label="Leave Type *"
                            onChange={(e) => {
                                setSelectedLeaveType(e.target.value);
                                setErrors(prev => ({ ...prev, leaveType: "" }));
                            }}
                        >
                            {loadingLeaveTypes ? <MenuItem disabled>Loading...</MenuItem> :
                                leaveTypes.map((type: any) => (
                                    <MenuItem key={type._id} value={type._id}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Chip label={type.code} size="small" sx={{ bgcolor: type.color, color: 'white' }} />
                                            <Typography>{type.name}</Typography>
                                        </Box>
                                    </MenuItem>
                                ))
                            }
                        </Select>
                        {errors.leaveType && <Typography variant="caption" color="error" sx={{ ml: 1 }}>{errors.leaveType}</Typography>}
                    </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <DatePicker
                        label={isShortLeave ? "Date *" : "Start Date *"}
                        value={startDate}
                        onChange={(val) => { setStartDate(val); setErrors(prev => ({ ...prev, startDate: "" })); }}
                        minDate={!allowPastDays ? dayjs() : undefined}
                        slotProps={{ textField: { fullWidth: true, error: !!errors.startDate, helperText: errors.startDate } }}
                    />
                </Grid>

                {!isShortLeave && (
                    <Grid item xs={12} sm={6}>
                        <DatePicker
                            label="End Date *"
                            value={endDate}
                            onChange={(val) => { setEndDate(val); setErrors(prev => ({ ...prev, endDate: "" })); }}
                            minDate={startDate || undefined}
                            slotProps={{ textField: { fullWidth: true, error: !!errors.endDate, helperText: errors.endDate } }}
                        />
                    </Grid>
                )}

                {isShortLeave && (
                    <>
                        <Grid item xs={6}>
                            <TimePicker label="Start Time" value={startTime} onChange={(val) => { setStartTime(val); setErrors(prev => ({ ...prev, startTime: "" })); }} slotProps={{ textField: { fullWidth: true, error: !!errors.startTime, helperText: errors.startTime } }} />
                        </Grid>
                        <Grid item xs={6}>
                            <TimePicker label="End Time" value={endTime} onChange={(val) => { setEndTime(val); setErrors(prev => ({ ...prev, endTime: "" })); }} slotProps={{ textField: { fullWidth: true, error: !!errors.endTime, helperText: errors.endTime } }} />
                        </Grid>
                    </>
                )}

                {!isShortLeave && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <FormControlLabel
                                control={<Switch checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} />}
                                label="Half Day"
                            />
                            {halfDay && (
                                <RadioGroup row value={halfDayPeriod} onChange={(e) => setHalfDayPeriod(e.target.value as any)}>
                                    <FormControlLabel value="first_half" control={<Radio size="small" />} label="First Half" />
                                    <FormControlLabel value="final_half" control={<Radio size="small" />} label="Final Half" />
                                </RadioGroup>
                            )}
                        </Box>
                        {errors.halfDayPeriod && <Typography variant="caption" color="error">{errors.halfDayPeriod}</Typography>}
                    </Grid>
                )}

                <Grid item xs={12}>
                    <TextField
                        fullWidth multiline rows={2}
                        label="Reason"
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setErrors(prev => ({ ...prev, reason: "" })); }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <FileUpload
                        folder="leaves"
                        entityId={selectedEmployeeId || "temp"}
                        companyId={companyId}
                        label="Attachment (Optional)"
                        mode="manual"
                        onFileSelect={(file) => setSelectedFile(file)}
                    />
                </Grid>

                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    {onCancel && <Button onClick={onCancel}>Cancel</Button>}
                    <Button
                        variant="contained"
                        startIcon={createLeaveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <Send />}
                        onClick={handleSubmit}
                        disabled={createLeaveMutation.isPending}
                    >
                        Submit Request
                    </Button>
                </Grid>
            </Grid>
        </LocalizationProvider>
    );
};
