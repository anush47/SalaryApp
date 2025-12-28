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
    Tab
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
    PhoneIphone
} from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceLogs, updateAttendanceStatus, deleteAttendance } from "@/app/lib/api/attendanceApi";
import { fetchCompany } from "@/app/lib/api/companyApi";
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

import { UnifiedAttendancePanel } from "./UnifiedAttendancePanel";
import { AttendanceRecordDialog } from "@/app/components/attendance/AttendanceRecordDialog";

interface CompanyAttendanceProps {
    user: any;
    companyId: string;
}

const CompanyAttendance: React.FC<CompanyAttendanceProps> = ({ user, companyId }) => {
    const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day'));
    const [endDate, setEndDate] = useState(dayjs().add(1, 'day'));
    const [openPresentDialog, setOpenPresentDialog] = useState(false);
    const [viewLog, setViewLog] = useState<any>(null);
    const [openViewDialog, setOpenViewDialog] = useState(false);

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
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

    const { data: logsResponse, isLoading, refetch } = useQuery({
        queryKey: ["companyAttendanceLogs", companyId, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")),
    });

    const logs = logsResponse?.success ? logsResponse.data : [];




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
            } else {
                showSnackbar({ message: data.error?.message || "Action failed", severity: 'error' });
            }
        } catch (error) {
            showSnackbar({ message: "An error occurred", severity: 'error' });
        }
    };

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
            renderCell: (params) => (
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
                </Box>
            ),
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
        const latestLogs: Record<string, any> = {};
        logs.forEach((log: any) => {
            const empId = log.employee?._id || log.employee;
            if (!empId) return;

            // Find latest log for each employee
            if (!latestLogs[empId] || new Date(log.timestamp) > new Date(latestLogs[empId].timestamp)) {
                latestLogs[empId] = log;
            }
        });

        // Return list of logs that are currently 'in' and not rejected
        return Object.values(latestLogs).filter((log: any) => log.type === 'in' && log.status !== 'rejected');
    }, [logs]);

    return (
        <Box>
            <Card sx={{
                minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
                overflowY: "auto",
            }}>
                <CardHeader
                    title={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
                            <Box sx={{ mb: { xs: 2, lg: 0 } }}>
                                <Typography variant="h4" fontWeight="bold">Attendance Dashboard</Typography>
                                <Typography color="text.secondary" variant="body2">Real-time attendance tracking and approvals</Typography>
                                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mt: 2 }}>
                                    <Tab label="Daily Logs (All)" />
                                    <Tab label="Employee History (Unified)" />
                                </Tabs>
                            </Box>
                            {tabValue === 0 && (
                                <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap" sx={{ width: { xs: '100%', lg: 'auto' } }}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <MUIDatePicker
                                            label="From"
                                            value={startDate}
                                            onChange={(newValue) => newValue && setStartDate(newValue)}
                                            slotProps={{ textField: { size: 'small', sx: { width: { xs: 'calc(50% - 8px)', sm: 140 } } } }}
                                        />
                                        <MUIDatePicker
                                            label="To"
                                            value={endDate}
                                            onChange={(newValue) => newValue && setEndDate(newValue)}
                                            slotProps={{ textField: { size: 'small', sx: { width: { xs: 'calc(50% - 8px)', sm: 140 } } } }}
                                        />
                                    </LocalizationProvider>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Refresh />}
                                        onClick={() => refetch()}
                                        disabled={isLoading}
                                        size="small"
                                        sx={{ flexGrow: { xs: 1, sm: 0 }, minWidth: { xs: 'auto', sm: 100 } }}
                                    >
                                        Refresh
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<Download />}
                                        size="small"
                                        sx={{ flexGrow: { xs: 1, sm: 0 }, minWidth: { xs: 'auto', sm: 100 } }}
                                    >
                                        Export
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    }
                />
                <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
                    {/* Stats Section */}
                    {tabValue === 0 && (
                        <Grid container spacing={2} mb={4}>
                            {[
                                {
                                    label: 'Present Now',
                                    value: presentEmployees.length,
                                    color: 'info.main',
                                    onClick: () => setOpenPresentDialog(true),
                                    cursor: 'pointer',
                                    action: 'View List'
                                },
                                { label: 'Total Records', value: stats.total, color: 'primary.main' },
                                { label: 'Approved', value: stats.approved, color: 'success.main' },
                                { label: 'Pending Approval', value: stats.pending, color: 'warning.main' },
                                { label: 'Rejected', value: stats.rejected, color: 'error.main' }
                            ].map((stat, idx) => (
                                <Grid item xs={12} sm={6} md={2.4} key={idx}>
                                    <Paper
                                        elevation={0}
                                        onClick={stat.onClick}
                                        sx={{
                                            p: 2,
                                            bgcolor: stat.color,
                                            color: 'white',
                                            borderRadius: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: stat.cursor || 'default',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&:hover': stat.cursor ? { transform: 'translateY(-2px)', boxShadow: 3 } : {}
                                        }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                            <Box>
                                                <Typography variant="overline" sx={{ opacity: 0.8, lineHeight: 1.2 }}>{stat.label}</Typography>
                                                <Typography variant="h4" fontWeight="bold">{stat.value}</Typography>
                                            </Box>
                                            {(stat as any).action && (
                                                <Chip
                                                    size="small"
                                                    label={(stat as any).action}
                                                    icon={<Visibility sx={{ fontSize: '1rem !important', color: 'inherit !important' }} />}
                                                    sx={{
                                                        bgcolor: 'rgba(255,255,255,0.2)',
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                                    }}
                                                />
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
                            <Box sx={{ height: 'calc(100vh - 430px)' }}>
                                <DataGrid
                                    rows={logs}
                                    columns={columns}
                                    getRowId={(row) => row._id}
                                    loading={isLoading}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 15 } },
                                    }}
                                    disableRowSelectionOnClick
                                    disableDensitySelector
                                    rowHeight={64}
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
                                            py: 1,
                                        },
                                        '& .MuiDataGrid-columnHeaders': {
                                            bgcolor: 'action.hover',
                                        },
                                    }}
                                />
                            </Box>
                        ) : (
                            <UnifiedAttendancePanel companyId={companyId} />
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
                } as any : null}
                employee={viewLog?.employee}
                companyConfig={companyData}
                onSaveSuccess={() => {
                    setOpenViewDialog(false);
                    refetch();
                }}
                disableTabSwitch={true}
                readOnly={user?.role === 'employee'}
            />
        </Box >
    );
};

export default CompanyAttendance;
