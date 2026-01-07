"use client";

import React, { useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    CircularProgress,
    TextField,
    Button,
    Stack,
    Chip,
    Avatar,
    IconButton,
    Tooltip,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    DialogActions,
    Tabs,
    Tab,
    Autocomplete
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import {
    Refresh,
    Download,
    FilterList,
    CheckCircle,
    Cancel,
    LocationOn,
    ThumbUp,
    ThumbDown,
    HourglassEmpty,
    Visibility,
    PhoneIphone,
    Person
} from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceLogs, updateAttendanceStatus, deleteAttendance } from "@/app/lib/api/attendanceApi";
import { fetchCompany } from "@/app/lib/api/companyApi";
import { fetchEmployees } from '@/app/lib/api/employeeApi';
import dynamic from 'next/dynamic';
import { Delete } from "@mui/icons-material";



import { AttendanceZonesMap } from "@/app/components/attendance/AttendanceZonesMap";
import dayjs from "dayjs";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MUIDatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useSnackbar } from "@/app/context/SnackbarContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { UnifiedAttendancePanel } from "./UnifiedAttendancePanel";
import { AttendanceRecordDialog } from "@/app/components/attendance/AttendanceRecordDialog";
import { AttendanceStatisticsPanel } from "./AttendanceStatisticsPanel";

interface CompanyAttendanceProps {
    user: any;
    companyId: string;
}

const CompanyAttendance: React.FC<CompanyAttendanceProps> = ({ user, companyId }) => {
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs().endOf('month'));
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [openPresentDialog, setOpenPresentDialog] = useState(false);
    const [viewLog, setViewLog] = useState<any>(null);
    const [openViewDialog, setOpenViewDialog] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "logs";

    const tabMap: Record<string, number> = { logs: 0, history: 1, stats: 2 };
    const tabReverseMap: Record<number, string> = { 0: "logs", 1: "history", 2: "stats" };

    const [tabValue, setTabValue] = useState(tabMap[currentTab] ?? 0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        const params = new URLSearchParams(window.location.search);
        params.set("tab", tabReverseMap[newValue]);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // Keep tabs in sync if URL changes externally
    React.useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && tabMap[tab] !== undefined && tabMap[tab] !== tabValue) {
            setTabValue(tabMap[tab]);
        }
    }, [searchParams]);

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





    // Fetch Company Details for Map Geofence
    const { data: companyData } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: !!companyId
    });

    const shifts = companyData?.shiftSettings?.shifts || [];

    const companyLocation = companyData?.attendanceConfig?.geoFencing?.enabled ? {
        lat: companyData.attendanceConfig.geoFencing.latitude,
        lng: companyData.attendanceConfig.geoFencing.longitude,
        radius: companyData.attendanceConfig.geoFencing.radiusMeters
    } : null;

    const { showSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    const { data: employeesData, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees', companyId],
        queryFn: () => fetchEmployees({ companyId, limit: 1000 })
    });

    const employees = React.useMemo(() => {
        const list = employeesData?.employees || [];
        return [...list].sort((a, b) => {
            if (a.active === b.active) return a.name.localeCompare(b.name);
            return a.active ? -1 : 1;
        });
    }, [employeesData]);

    const { data: logsResponse, isLoading, refetch } = useQuery({
        queryKey: ["companyAttendanceLogs", companyId, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD"), selectedEmployee?._id],
        queryFn: () => getAttendanceLogs(companyId, selectedEmployee?._id, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")),
    });

    const logs = logsResponse?.success ? logsResponse.data : [];

    // Fetch Latest Status for "Present Now" Panel (Independent of Date Filters)
    const { data: latestStatusResponse, refetch: refetchLatest } = useQuery({
        queryKey: ["companyAttendanceLatest", companyId],
        queryFn: () => getAttendanceLogs(companyId, undefined, undefined, undefined, undefined, 'latest_status'),
        refetchInterval: 60000 // Refresh every minute
    });
    const latestLogs = latestStatusResponse?.success ? latestStatusResponse.data : [];

    const handleRefresh = async () => {
        await Promise.all([refetch(), refetchLatest()]);
        showSnackbar({ message: "Attendance data refreshed", severity: "success" });
    };




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
                queryClient.invalidateQueries({ queryKey: ["companyAttendanceLogs"] });
                queryClient.invalidateQueries({ queryKey: ["companyAttendanceLatest"] });
            } else {
                showSnackbar({ message: data.error?.message || "Action failed", severity: 'error' });
            }
        } catch (error) {
            showSnackbar({ message: "An error occurred", severity: 'error' });
        }
    };

    // Verify Sorting and Comput Device Changes
    const deviceChangeMap = React.useMemo(() => {
        const map: Record<string, boolean> = {};
        if (!logs || logs.length === 0) return map;

        // Group by Employee
        const empLogs: Record<string, any[]> = {};
        logs.forEach((log: any) => {
            const empId = log.employee?._id || log.employee;
            if (!empId) return;
            if (!empLogs[empId]) empLogs[empId] = [];
            empLogs[empId].push(log);
        });

        // For each employee, sort logs ASCENDING to trace changes
        Object.values(empLogs).forEach(list => {
            list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            let lastDevice: string | null = null;
            list.forEach(log => {
                const currentDevice = log.deviceId || null;
                // Only flag if we have a previous device to compare
                if (lastDevice && currentDevice && lastDevice !== currentDevice) {
                    map[log._id] = true;
                }
                if (currentDevice) lastDevice = currentDevice;
            });
        });

        return map;
    }, [logs]);

    const columns: GridColDef[] = [
        {
            field: "memberNo",
            headerName: "Member No",
            width: 100,
            align: 'left',
            headerAlign: 'left',
            valueGetter: (value: any, row: any) => row?.employee?.memberNo,
        },
        {
            field: "employee",
            headerName: "Employee",
            flex: 1,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => (
                <Link href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${params.value?._id}`} style={{ textDecoration: 'none', color: 'inherit', width: '100%', height: '100%' }}>
                    <Box display="flex" alignItems="center" height="100%" sx={{ '&:hover': { color: 'primary.main' } }}>
                        <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                            {params.value?.name}
                        </Typography>
                    </Box>
                </Link>
            ),
        },
        {
            field: "type",
            headerName: "Type",
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                    <Chip
                        label={params.value?.toUpperCase()}
                        size="small"
                        color={params.value === 'in' ? "success" : "warning"}
                        variant="outlined"
                        sx={{ fontWeight: 'bold', width: 60 }}
                    />
                </Box>
            ),
        },
        {
            field: "shift",
            headerName: "Shift",
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
                    <Typography variant="body2" fontWeight="500">
                        {params.value?.name || '-'}
                    </Typography>
                    {params.value?.startTime && (
                        <Typography variant="caption" color="text.secondary">
                            {params.value.startTime} - {params.value.endTime}
                        </Typography>
                    )}
                </Box>
            ),
        },
        {
            field: "timestamp",
            headerName: "Date/Time",
            width: 200,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => (
                <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
                    <Typography variant="body2" sx={{ lineHeight: 1.2 }}>{dayjs(params.value).format("hh:mm:ss A")}</Typography>
                    <Typography variant="caption" color="text.secondary">{dayjs(params.value).format("MMM DD, YYYY")}</Typography>
                </Box>
            ),
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const status = params.value || 'approved';
                return (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                        <Chip
                            label={status.toUpperCase()}
                            size="small"
                            color={status === 'pending' ? "warning" : status === 'rejected' ? "error" : "success"}
                            variant="filled"
                            sx={{ fontWeight: 'bold' }}
                        />
                    </Box>
                );
            }
        },
        {
            field: "location",
            headerName: "Verification",
            width: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const isDeviceChange = deviceChangeMap[params.row._id];
                return (
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} height="100%">
                        {params.value?.isVerified ? (
                            <Tooltip title="Verified within allowed radius">
                                <CheckCircle sx={{ color: 'success.main', fontSize: '1.2rem' }} />
                            </Tooltip>
                        ) : (
                            <Tooltip title="Outside allowed radius">
                                <Cancel sx={{ color: 'error.main', fontSize: '1.2rem' }} />
                            </Tooltip>
                        )}
                        <Tooltip title={`Lat: ${params.value?.lat}, Lng: ${params.value?.lng}`}>
                            <IconButton size="small" color="primary">
                                <LocationOn sx={{ fontSize: '1.2rem' }} />
                            </IconButton>
                        </Tooltip>

                        {isDeviceChange && (
                            <Tooltip title="Device Changed (Different from previous record)">
                                <IconButton size="small" color="warning">
                                    <PhoneIphone sx={{ fontSize: '1.2rem', color: 'orange' }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                );
            },
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 150,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => {
                const isPending = params.row.status === 'pending';
                return (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                        <Stack direction="row" spacing={1}>
                            <Tooltip title="View Details">
                                <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => {
                                        setViewLog(params.row);
                                        setOpenViewDialog(true);
                                    }}
                                    sx={{ border: '1px solid', borderColor: 'info.light' }}
                                >
                                    <Visibility sx={{ fontSize: '1rem' }} />
                                </IconButton>
                            </Tooltip>
                            {isPending && (
                                <>
                                    <Tooltip title="Approve">
                                        <IconButton
                                            size="small"
                                            color="success"
                                            onClick={() => handleApproveReject(params.row._id, 'approved')}
                                            sx={{ border: '1px solid', borderColor: 'success.light' }}
                                        >
                                            <ThumbUp sx={{ fontSize: '1rem' }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleApproveReject(params.row._id, 'rejected')}
                                            sx={{ border: '1px solid', borderColor: 'error.light' }}
                                        >
                                            <ThumbDown sx={{ fontSize: '1rem' }} />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Stack>
                    </Box >
                );
            }
        }
    ];

    const stats = {
        total: logs.length,
        approved: logs.filter((l: any) => l.status === 'approved' || !l.status).length,
        pending: logs.filter((l: any) => l.status === 'pending').length,
        rejected: logs.filter((l: any) => l.status === 'rejected').length,
    };

    const presentEmployees = React.useMemo(() => {
        if (!latestLogs || latestLogs.length === 0) return [];

        const now = dayjs();
        // Return list of logs that are currently 'in', not rejected, and within 24 hours
        return latestLogs.filter((log: any) => {
            if (log.type !== 'in') return false;
            if (log.status === 'rejected') return false;

            // 24 Hour Timeout Check
            const logTime = dayjs(log.timestamp);
            if (now.diff(logTime, 'hour') >= 24) return false;

            return true;
        });
    }, [latestLogs]);

    return (
        <Box>
            <Card sx={{
                minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
                overflowY: "auto",
            }}>
                <CardHeader
                    sx={{ p: { xs: 1.5, sm: 2 } }}
                    title={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2, lg: 3 } }}>
                            <Box sx={{ mb: { xs: 0, lg: 0 }, width: '100%' }}>
                                <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.8rem', md: '2.125rem' } }}>Attendance Dashboard</Typography>
                                <Typography color="text.secondary" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Real-time tracking and approvals</Typography>
                                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mt: 1.5, minHeight: { xs: 32, sm: 48 } }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                                    <Tab label="Logs" sx={{ textTransform: 'none', minHeight: { xs: 32, sm: 48 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                                    <Tab label="History" sx={{ textTransform: 'none', minHeight: { xs: 32, sm: 48 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                                    <Tab label="Stats" sx={{ textTransform: 'none', minHeight: { xs: 32, sm: 48 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                                </Tabs>
                            </Box>
                            <Box sx={{ width: { xs: '100%', lg: 'auto' } }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                                    <Autocomplete
                                        options={[{ name: 'All Employees', _id: 'all', memberNo: 'ALL', active: true }, ...employees]}
                                        getOptionLabel={(option) => `${option.name}${option.memberNo ? ` (${option.memberNo})` : ''}${option.active === false ? ' (Inactive)' : ''}`}
                                        value={selectedEmployee || { name: 'All Employees', _id: 'all', memberNo: 'ALL', active: true }}
                                        onChange={(_, newValue) => {
                                            if (newValue?._id === 'all') setSelectedEmployee(null);
                                            else setSelectedEmployee(newValue);
                                        }}
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                <Box sx={{ color: option.active === false ? 'text.disabled' : 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography sx={{ fontWeight: option.active === false ? 'normal' : '500', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                                        {option.name}
                                                    </Typography>
                                                    {option.memberNo && (
                                                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                            ({option.memberNo})
                                                        </Typography>
                                                    )}
                                                    {option.active === false && (
                                                        <Chip label="Inactive" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                                    )}
                                                </Box>
                                            </li>
                                        )}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Filter by Employee"
                                                size="small"
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <Person sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
                                                    ),
                                                }}
                                            />
                                        )}
                                        sx={{ minWidth: { xs: '100%', sm: 250 }, flexGrow: 1 }}
                                        loading={loadingEmployees}
                                        isOptionEqualToValue={(option, value) => option._id === value._id}
                                        clearOnEscape
                                    />
                                </Stack>

                                <Box sx={{ mb: 1, overflowX: 'auto', pb: 0.5, whiteSpace: 'nowrap', '&::-webkit-scrollbar': { height: 4 } }}>
                                    <Stack direction="row" spacing={1}>
                                        {[
                                            { label: 'Today', value: 'today' },
                                            { label: 'Yesterday', value: 'yesterday' },
                                            { label: 'Last 7 Days', value: 'last7' },
                                            { label: 'This Month', value: 'thisMonth' },
                                            { label: 'Last Month', value: 'lastMonth' }
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
                                    </Stack>
                                </Box>

                                <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={12} sm="auto">
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <MUIDatePicker
                                                    label="From"
                                                    value={startDate}
                                                    onChange={(newValue) => newValue && setStartDate(newValue)}
                                                    slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', sm: 130 } } } }}
                                                />
                                                <MUIDatePicker
                                                    label="To"
                                                    value={endDate}
                                                    onChange={(newValue) => newValue && setEndDate(newValue)}
                                                    slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', sm: 130 } } } }}
                                                />
                                            </Box>
                                        </LocalizationProvider>
                                    </Grid>
                                    <Grid item xs={12} sm="auto">
                                        <Button
                                            variant="outlined"
                                            startIcon={<Refresh />}
                                            onClick={handleRefresh}
                                            disabled={isLoading}
                                            size="small"
                                            fullWidth
                                            sx={{ minWidth: { sm: 120 }, height: 40 }}
                                        >
                                            Refresh Data
                                        </Button>
                                    </Grid>
                                    {/* <Grid item xs={6} sm="auto">
                                        <Button
                                            variant="contained"
                                            startIcon={<Download />}
                                            size="small"
                                            fullWidth
                                            sx={{ minWidth: { sm: 100 }, height: 40 }}
                                        >
                                            Export
                                        </Button>
                                    </Grid> */}
                                </Grid>

                            </Box>
                        </Box>
                    }
                />
                <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
                    {/* Stats Section */}
                    {tabValue === 0 && (
                        <Grid container spacing={1.5} mb={3}>
                            {[
                                {
                                    label: 'Present Now',
                                    value: presentEmployees.length,
                                    color: 'info',
                                    onClick: () => setOpenPresentDialog(true),
                                    cursor: 'pointer',
                                    action: 'View List'
                                },
                                { label: 'Total', value: stats.total, color: 'primary' },
                                { label: 'Approved', value: stats.approved, color: 'success' },
                                { label: 'Pending', value: stats.pending, color: 'warning' },
                                { label: 'Rejected', value: stats.rejected, color: 'error' }
                            ].map((stat, idx) => (
                                <Grid item xs={6} sm={4} md={2.4} key={idx}>
                                    <Paper
                                        variant="outlined"
                                        onClick={stat.onClick}
                                        sx={{
                                            p: { xs: 1.5, sm: 2 },
                                            bgcolor: 'background.paper',
                                            borderRadius: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: stat.cursor || 'default',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            borderLeft: `4px solid`,
                                            borderColor: `${stat.color}.main`,
                                            '&:hover': stat.cursor ? { bgcolor: `${stat.color}.lighter`, borderColor: `${stat.color}.main` } : {}
                                        }}>
                                        <Typography
                                            variant="overline"
                                            sx={{
                                                color: 'text.secondary',
                                                lineHeight: 1.2,
                                                fontSize: { xs: '0.6rem', sm: '0.75rem' },
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {stat.label}
                                        </Typography>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                                            <Typography
                                                variant="h5"
                                                fontWeight="bold"
                                                sx={{
                                                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                                                    color: `${stat.color}.main`
                                                }}
                                            >
                                                {stat.value}
                                            </Typography>
                                            {(stat as any).action && (
                                                <IconButton size="small" color="info" sx={{ p: 0.5 }}>
                                                    <Visibility sx={{ fontSize: '1rem' }} />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* DataGrid Section / Unified Panel */}
                    <Box sx={{ width: '100%', minHeight: 400 }}>
                        {tabValue === 0 ? (
                            <Box sx={{ height: 'calc(100vh - 280px)' }}>
                                <DataGrid
                                    rows={logs}
                                    columns={columns}
                                    getRowId={(row) => row._id}
                                    loading={isLoading}
                                    pageSizeOptions={[10, 25, 50, 100]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 25 } },
                                    }}
                                    disableRowSelectionOnClick
                                    disableDensitySelector
                                    rowHeight={45}
                                    slots={{
                                        toolbar: GridToolbar,
                                    }}
                                    slotProps={{
                                        toolbar: {
                                            showQuickFilter: true,
                                            csvOptions: { disableToolbarButton: true },
                                            printOptions: { disableToolbarButton: true },
                                        },
                                    }}
                                    sx={{
                                        border: 1,
                                        borderColor: 'divider',
                                        '& .MuiDataGrid-cell': {
                                            py: 0.5,
                                        },
                                        '& .MuiDataGrid-columnHeaders': {
                                            bgcolor: 'action.hover',
                                            py: 0.5,
                                        },
                                    }}
                                />
                            </Box>
                        ) : tabValue === 1 ? (
                            <UnifiedAttendancePanel
                                companyId={companyId}
                                startDate={startDate}
                                endDate={endDate}
                                selectedEmployee={selectedEmployee}
                                setSelectedEmployee={setSelectedEmployee}
                            />
                        ) : (
                            <AttendanceStatisticsPanel
                                logs={logs}
                                selectedEmployee={selectedEmployee}
                                shifts={shifts}
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            <Dialog
                open={openPresentDialog}
                onClose={() => setOpenPresentDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    Who's Present Now? ({presentEmployees.length})
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {presentEmployees.length > 0 ? (
                        <List>
                            {presentEmployees.map((log: any) => (
                                <React.Fragment key={log._id}>
                                    <ListItem>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                {log.employee?.name?.charAt(0) || '?'}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={log.employee?.name || 'Unknown Log'}
                                            secondary={
                                                <Box component="span" display="flex" flexDirection="column">
                                                    <Typography variant="body2" component="span" color="text.secondary">
                                                        Clocked in at {dayjs(log.timestamp).format("hh:mm A")}
                                                    </Typography>
                                                    {log.location?.isVerified && (
                                                        <Box component="span" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                            <CheckCircle color="success" sx={{ fontSize: 14 }} />
                                                            <Typography variant="caption" color="success.main">Verified Location</Typography>
                                                        </Box>
                                                    )}
                                                    {log.deviceDetails && (
                                                        <Box component="span" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                            <PhoneIphone color="action" sx={{ fontSize: 14 }} />
                                                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {log.deviceDetails}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Chip label="ONLINE" color="success" size="small" variant="outlined" />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider variant="inset" component="li" />
                                </React.Fragment>
                            ))}
                        </List>
                    ) : (
                        <Box p={4} textAlign="center">
                            <Typography color="text.secondary">No active employees found currently.</Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Log Edit Dialog */}
            <AttendanceRecordDialog
                open={openViewDialog}
                onClose={() => setOpenViewDialog(false)}
                dailyRecord={viewLog ? {
                    date: viewLog.timestamp,
                    inLogId: viewLog.type === 'in' ? viewLog._id : undefined,
                    outLogId: viewLog.type === 'out' ? viewLog._id : undefined,
                    shiftId: viewLog.shift?.shiftId || '',
                    shiftName: viewLog.shift?.name || '',
                    isOffDay: false,
                    isHoliday: false,
                } as any : null}
                employee={viewLog?.employee}
                companyConfig={companyData}
                shifts={shifts}
                disableShiftChange={true}
                onSaveSuccess={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["companyAttendanceLatest"] });
                    setOpenViewDialog(false);
                }}
                disableTabSwitch={true}
                readOnly={user?.role === 'employee'}
            />
        </Box >
    );
};

export default CompanyAttendance;
