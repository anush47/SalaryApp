"use client";
import React, { useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    CircularProgress,
    Tabs,
    Tab,
    Paper,
    Divider,
    Stack,
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Autocomplete,
    TextField,
    CardHeader,
} from "@mui/material";
import { AttendanceStatisticsPanel } from "@/app/user/mycompanies/[id]/attendance/AttendanceStatisticsPanel";
import { AttendanceRecordDialog } from "@/app/components/attendance/AttendanceRecordDialog";
import LeaveRequestsManagement from "@/app/user/mycompanies/[id]/leaves/clientComponents/leaveRequestsManagement";
import {
    Groups,
    PendingActions,
    Rule,
    CheckCircle,
    EventBusy,
    Assessment,
    Cancel
} from "@mui/icons-material";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployees, fetchManagerDashboard } from "@/app/lib/api/employeeApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { UnifiedAttendancePanel } from "@/app/user/mycompanies/[id]/attendance/UnifiedAttendancePanel";
import { useAllEmployeesAttendanceAggregation } from "@/app/hooks/useAttendanceAggregation";
import { fetchCompany } from "@/app/lib/api/companyApi";
import dayjs from "dayjs";
import { AttendanceLogsTable } from "@/app/components/attendance/AttendanceLogsTable";
import {
    Visibility,
    ThumbUp,
    ThumbDown,
    LocationOn,
    PhoneIphone,
    Person,
    Refresh
} from "@mui/icons-material";
import { getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// ... existing imports ...

interface TeamManagementProps {
    user: any;
}


const TeamManagement: React.FC<TeamManagementProps> = ({ user }) => {
    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');

    // Convert tab param to index and back
    const getTabIndex = (tab: string | null) => {
        // Handle numeric values
        const numericTab = parseInt(tab || '0');
        if (!isNaN(numericTab) && numericTab >= 0 && numericTab <= 3) {
            return numericTab;
        }

        // Handle string names
        switch (tab) {
            case 'attendance': return 1;
            case 'leaves': return 2;
            case 'stats': return 3;
            default: return 0;
        }
    };

    const getTabName = (index: number) => {
        switch (index) {
            case 1: return 'attendance';
            case 2: return 'leaves';
            case 3: return 'stats';
            default: return 'dashboard';
        }
    };

    const [tabValue, setTabValue] = useState(getTabIndex(tabParam));
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs().endOf('month'));

    // ... Update internal state if URL changes externally ... 
    React.useEffect(() => {
        setTabValue(getTabIndex(tabParam));
    }, [tabParam]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        const newTabName = getTabName(newValue);
        router.push(`/user?userPageSelect=teamManagement&tab=${newTabName}`);
    };

    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [viewLog, setViewLog] = useState<any | null>(null);
    const [openViewDialog, setOpenViewDialog] = useState(false);

    // 1. Fetch Employee Record to get Manager ID and Company ID
    const { data: employee, isLoading: loadingEmployee } = useQuery({
        queryKey: ["employee", user.id],
        queryFn: async () => {
            const employees = await fetchEmployees({ user: user.id });
            return employees[0];
        },
    });

    const employeeId = employee?._id;
    const companyId = employee?.company?._id;

    // 2. Fetch Team Data
    const { data: managerData, isLoading: loadingManager } = useQuery({
        queryKey: ["managerDashboard", employeeId],
        queryFn: () => fetchManagerDashboard(employeeId),
        enabled: !!employeeId,
    });

    // Filter employees to only show subordinates in the selector
    const subordinates = React.useMemo(() => {
        if (!managerData?.team?.members) return [];
        // Map to format that works with our Autocomplete
        return managerData.team.members.map((m: any) => ({
            ...m,
            active: true // Assuming active if returned by manager dashboard
        }));
    }, [managerData]);

    const setQuickRange = (range: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
        switch (range) {
            case 'today':
                setStartDate(dayjs().startOf('day'));
                setEndDate(dayjs().endOf('day'));
                break;
            case 'yesterday':
                setStartDate(dayjs().subtract(1, 'day').startOf('day'));
                setEndDate(dayjs().subtract(1, 'day').endOf('day'));
                break;
            case 'last7':
                setStartDate(dayjs().subtract(7, 'day').startOf('day'));
                setEndDate(dayjs());
                break;
            case 'thisMonth':
                setStartDate(dayjs().startOf('month'));
                setEndDate(dayjs().endOf('month'));
                break;
            case 'lastMonth':
                setStartDate(dayjs().subtract(1, 'month').startOf('month'));
                setEndDate(dayjs().subtract(1, 'month').endOf('month'));
                break;
        }
    };

    // Extract Team IDs for filtering
    const teamIds = React.useMemo(() => {
        if (!managerData?.team?.members) return [];
        return managerData.team.members.map((m: any) => m._id);
    }, [managerData]);

    const teamMemberNos = React.useMemo(() => {
        if (!managerData?.team?.members) return [];
        return managerData.team.members.map((m: any) => m.memberNo);
    }, [managerData]);

    // 3. Fetch Company Data (for Shifts)
    const { data: companyData } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: !!companyId
    });

    // 4. Fetch Stats Data (for Stats Tab)
    const { records: teamRecords, loading: loadingStats } = useAllEmployeesAttendanceAggregation(
        companyId,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD'),
        tabValue === 3, // Only fetch if on Stats tab
        selectedEmployee ? [selectedEmployee._id] : teamIds
    );

    // 5. Fetch Latest Status for "Present Now" (Independent of Date Filters)
    const { data: latestStatusResponse, refetch: refetchLatest } = useQuery({
        queryKey: ["teamAttendanceLatest", companyId, ...teamIds],
        queryFn: () => getAttendanceLogs(companyId, undefined, undefined, undefined, undefined, 'latest_status'),
        enabled: !!companyId && teamIds.length > 0,
        refetchInterval: 60000 // Refresh every minute
    });
    const latestLogs = latestStatusResponse?.success ? latestStatusResponse.data : [];

    const presentEmployees = React.useMemo(() => {
        if (!latestLogs || latestLogs.length === 0 || teamIds.length === 0) return [];

        const now = dayjs();
        // Return list of logs that are currently 'in', not rejected, within 24 hours, and belong to team
        return latestLogs.filter((log: any) => {
            if (log.type !== 'in') return false;
            if (log.status === 'rejected') return false;

            // Check if employee is in team
            const empId = log.employee?._id || log.employee;
            if (!teamIds.includes(empId)) return false;

            // 24 Hour Timeout Check
            const logTime = dayjs(log.timestamp);
            if (now.diff(logTime, 'hour') >= 24) return false;

            return true;
        });
    }, [latestLogs, teamIds]);

    // 5. Fetch Raw Logs (for Attendance Tab) - Filtered Client Side for now or if API supports filtering
    const { data: logsResponse, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ["managerAttendanceLogs", companyId, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")),
        enabled: !!companyId && tabValue === 1
    });

    const logs = React.useMemo(() => {
        if (!logsResponse?.success) return [];
        // Filter logs to ONLY show team members
        let filtered = logsResponse.data.filter((log: any) => {
            const empId = log.employee?._id || log.employee;
            return teamIds.includes(empId);
        });

        // Further filter by selected employee if set
        if (selectedEmployee) {
            filtered = filtered.filter((log: any) => {
                const empId = log.employee?._id || log.employee;
                return empId === selectedEmployee._id;
            });
        }
        return filtered;
    }, [logsResponse, teamIds, selectedEmployee]);

    const handleApproveReject = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const res = await fetch(`/api/attendance/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                showSnackbar({ message: `Record ${status} successfully`, severity: 'success' });
                queryClient.invalidateQueries({ queryKey: ["managerAttendanceLogs"] });
                queryClient.invalidateQueries({ queryKey: ["teamAttendanceLatest"] });
            } else {
                showSnackbar({ message: data.error?.message || "Action failed", severity: 'error' });
            }
        } catch (error) {
            showSnackbar({ message: "An error occurred", severity: 'error' });
        }
    };

    const handleRefresh = async () => {
        await Promise.all([refetchLogs(), refetchLatest()]);
        showSnackbar({ message: "Attendance data refreshed", severity: "success" });
    };



    if (loadingEmployee || loadingManager) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (!employee) {
        return (
            <Box p={3}>
                <Typography color="error">Employee profile not found.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Card sx={{
                minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
                overflowY: "auto",
            }}>
                <CardHeader
                    title={
                        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" gap={1}>
                            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.1rem', sm: '1.8rem', md: '2.125rem' }, fontWeight: 'bold' }}>
                                Team Management
                            </Typography>
                            {managerData?.team?.members && (
                                <Chip
                                    icon={<Person sx={{ fontSize: '1rem !important' }} />}
                                    label={`${managerData.team.members.length} Members`}
                                    color="primary"
                                    variant="filled"
                                    sx={{
                                        height: { xs: 24, sm: 32, md: 40 },
                                        px: { xs: 0.5, sm: 1 },
                                        fontSize: { xs: '0.7rem', sm: '0.85rem', md: '1rem' },
                                        fontWeight: 'bold'
                                    }}
                                />
                            )}
                        </Box>
                    }
                />
                <CardContent sx={{
                    maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" },
                    p: { xs: 1.5, sm: 3 },
                    pt: { xs: 0, sm: 2 }
                }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 1.5, sm: 3 } }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            variant="fullWidth"
                            sx={{ minHeight: { xs: 40, sm: 48 } }}
                        >
                            <Tab
                                icon={<Groups sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                iconPosition="start"
                                label="Overview"
                                sx={{
                                    minHeight: { xs: 40, sm: 48 },
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'none'
                                }}
                            />
                            <Tab
                                icon={<PendingActions sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                iconPosition="start"
                                label="Attendance"
                                sx={{
                                    minHeight: { xs: 40, sm: 48 },
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'none'
                                }}
                            />
                            <Tab
                                icon={<Rule sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                iconPosition="start"
                                label="Leaves"
                                sx={{
                                    minHeight: { xs: 40, sm: 48 },
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'none'
                                }}
                            />
                            <Tab
                                icon={<Assessment sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                iconPosition="start"
                                label="Stats"
                                sx={{
                                    minHeight: { xs: 40, sm: 48 },
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'none'
                                }}
                            />
                        </Tabs>
                    </Box>

                    {tabValue === 0 && (
                        <Grid container spacing={3}>
                            {/* Quick Stats */}
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    {[
                                        { label: "Total Team", val: managerData?.team?.total || 0, icon: Groups, color: "primary" },
                                        { label: "Present Now", val: presentEmployees.length, icon: CheckCircle, color: "success" },
                                        { label: "Pending Leaves", val: managerData?.leaves?.totalPending || 0, icon: EventBusy, color: "warning" },
                                        { label: "Pending Attendance", val: managerData?.attendance?.totalPending || 0, icon: PendingActions, color: "info" },
                                    ].map((stat, idx) => {
                                        const Icon = stat.icon;
                                        return (
                                            <Grid item xs={6} sm={3} key={idx}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        borderLeft: `4px solid`,
                                                        borderColor: `${stat.color}.main`,
                                                        textAlign: "center"
                                                    }}
                                                >
                                                    <Icon sx={{ color: `${stat.color}.main`, mb: 1 }} />
                                                    <Typography variant="h4" fontWeight="bold">{stat.val}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">{stat.label}</Typography>
                                                </Paper>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Grid>

                            {/* Present Now Panel */}
                            {presentEmployees.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                                        <Typography variant="h6" gutterBottom fontWeight="bold">
                                            Present Now ({presentEmployees.length})
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                            <Stack spacing={1}>
                                                {presentEmployees.map((log: any) => (
                                                    <Paper key={log._id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="bold">
                                                                    {log.employee?.name || 'Unknown'}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Clocked in at {dayjs(log.timestamp).format("hh:mm A")}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Paper>
                                </Grid>
                            )}

                            {/* Team Members List */}
                            <Grid item xs={12} md={presentEmployees.length > 0 ? 6 : 12}>
                                <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                                    <Typography variant="h6" gutterBottom fontWeight="bold">
                                        Team Members ({managerData?.team?.members?.length || 0})
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                        <Stack spacing={1}>
                                            {managerData?.team?.members?.map((member: any) => (
                                                <Paper key={member._id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {member.name}
                                                            </Typography>
                                                            {member.memberNo && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    ID: {member.memberNo}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}

                    {tabValue === 1 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'action.hover' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Box display="flex" gap={1} sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                                {[
                                                    { label: 'Today', value: 'today' },
                                                    { label: 'Yesterday', value: 'yesterday' },
                                                    { label: 'Last 7 Days', value: 'last7' },
                                                    { label: 'This Month', value: 'thisMonth' },
                                                    { label: 'Last Month', value: 'lastMonth' },
                                                ].map((r) => (
                                                    <Chip
                                                        key={r.value}
                                                        label={r.label}
                                                        size="small"
                                                        onClick={() => setQuickRange(r.value as any)}
                                                        variant="outlined"
                                                        clickable
                                                        sx={{ borderRadius: 1, fontSize: '0.7rem' }}
                                                    />
                                                ))}
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} sm={6} md={4}>
                                            <Autocomplete
                                                options={subordinates}
                                                getOptionLabel={(option) => `${option.name}${option.memberNo ? ` (${option.memberNo})` : ''}`}
                                                value={selectedEmployee}
                                                onChange={(_, newValue) => setSelectedEmployee(newValue)}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Employee"
                                                        size="small"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            startAdornment: (
                                                                <Person sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
                                                            ),
                                                        }}
                                                    />
                                                )}
                                                fullWidth
                                                isOptionEqualToValue={(option, value) => option._id === value._id}
                                                clearOnEscape
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6} md={8}>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                    <DatePicker
                                                        label="Start Date"
                                                        value={startDate}
                                                        onChange={(newValue) => newValue && setStartDate(newValue)}
                                                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                                    />
                                                    <DatePicker
                                                        label="End Date"
                                                        value={endDate}
                                                        onChange={(newValue) => newValue && setEndDate(newValue)}
                                                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                                    />
                                                </LocalizationProvider>
                                                <Button variant="outlined" startIcon={<Refresh />} onClick={() => handleRefresh()} sx={{ minWidth: 40 }}>
                                                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Refresh</Box>
                                                </Button>
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            <Grid item xs={12}>
                                <Box sx={{ height: 600, width: '100%' }}>
                                    <AttendanceLogsTable
                                        logs={logs}
                                        loading={loadingLogs}
                                        userRole="manager"
                                        onView={(log) => {
                                            setViewLog(log);
                                            setOpenViewDialog(true);
                                        }}
                                        onApproveReject={handleApproveReject}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    )}

                    {tabValue === 2 && (
                        <Box sx={{ overflowX: 'auto' }}>
                            <LeaveRequestsManagement
                                user={user}
                                companyId={companyId}
                                mode="pending-approvals"
                            />
                        </Box>
                    )}

                    {tabValue === 3 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'action.hover' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Box display="flex" gap={1} sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                                {[
                                                    { label: 'Today', value: 'today' },
                                                    { label: 'Yesterday', value: 'yesterday' },
                                                    { label: 'Last 7 Days', value: 'last7' },
                                                    { label: 'This Month', value: 'thisMonth' },
                                                    { label: 'Last Month', value: 'lastMonth' },
                                                ].map((r) => (
                                                    <Chip
                                                        key={r.value}
                                                        label={r.label}
                                                        size="small"
                                                        onClick={() => setQuickRange(r.value as any)}
                                                        variant="outlined"
                                                        clickable
                                                        sx={{ borderRadius: 1, fontSize: '0.7rem' }}
                                                    />
                                                ))}
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} sm={6} md={4}>
                                            <Autocomplete
                                                options={subordinates}
                                                getOptionLabel={(option) => `${option.name}${option.memberNo ? ` (${option.memberNo})` : ''}`}
                                                value={selectedEmployee}
                                                onChange={(_, newValue) => setSelectedEmployee(newValue)}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Employee"
                                                        size="small"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            startAdornment: (
                                                                <Person sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
                                                            ),
                                                        }}
                                                    />
                                                )}
                                                fullWidth
                                                isOptionEqualToValue={(option, value) => option._id === value._id}
                                                clearOnEscape
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6} md={8}>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                    <DatePicker
                                                        label="Start Date"
                                                        value={startDate}
                                                        onChange={(newValue) => newValue && setStartDate(newValue)}
                                                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                                    />
                                                    <DatePicker
                                                        label="End Date"
                                                        value={endDate}
                                                        onChange={(newValue) => newValue && setEndDate(newValue)}
                                                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                                    />
                                                </LocalizationProvider>
                                                <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetchLogs()} sx={{ minWidth: 40 }}>
                                                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Refresh</Box>
                                                </Button>
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            <Grid item xs={12}>
                                <AttendanceStatisticsPanel
                                    records={teamRecords}
                                    shifts={companyData?.shiftSettings?.shifts || []}
                                    loading={loadingStats}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* Log Edit/View Dialog - Restored and Fixed */}
                    <AttendanceRecordDialog
                        open={openViewDialog}
                        onClose={() => setOpenViewDialog(false)}
                        dailyRecord={viewLog ? {
                            date: viewLog.timestamp,
                            inLogId: viewLog.type === 'in' ? viewLog._id : undefined,
                            outLogId: viewLog.type === 'out' ? viewLog._id : undefined,
                            shiftId: typeof viewLog.shift === 'object' ? viewLog.shift?.shiftId : viewLog.shift || '',
                            shiftName: typeof viewLog.shift === 'object' ? viewLog.shift?.name : '',
                            isOffDay: false,
                            isHoliday: false,
                            status: viewLog.status || 'approved',
                            inTime: viewLog.type === 'in' ? viewLog.timestamp : undefined,
                            outTime: viewLog.type === 'out' ? viewLog.timestamp : undefined,
                            sessions: [] // Initialize empty sessions to allow dialog to fetch logs by ID
                        } as any : null}
                        employee={viewLog?.employee}
                        companyConfig={companyData}
                        shifts={companyData?.shiftSettings?.shifts || []}
                        disableShiftChange={true}
                        onSaveSuccess={() => {
                            refetchLogs();
                            queryClient.invalidateQueries({ queryKey: ["managerDashboard"] });
                            setOpenViewDialog(false);
                        }}
                        disableTabSwitch={true}
                        readOnly={false} // Allow managers to edit status/remarks
                        userRole="manager"
                    />
                </CardContent>
            </Card>
        </Box>
    );
};

export default TeamManagement;
