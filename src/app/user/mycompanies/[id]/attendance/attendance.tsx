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
    Paper
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
} from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import dayjs from "dayjs";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MUIDatePicker } from '@mui/x-date-pickers/DatePicker';
import { useSnackbar } from "@/app/context/SnackbarContext";
import Link from "next/link";

interface CompanyAttendanceProps {
    user: any;
    companyId: string;
}

const CompanyAttendance: React.FC<CompanyAttendanceProps> = ({ user, companyId }) => {
    const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day'));
    const [endDate, setEndDate] = useState(dayjs());
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
                if (!isPending) return null;
                return (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                        <Stack direction="row" spacing={1}>
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
                        </Stack>
                    </Box>
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

    return (
        <Box>
            <Card sx={{
                minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
                overflowY: "auto",
            }}>
                <CardHeader
                    title={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                            <Box>
                                <Typography variant="h4" fontWeight="bold">Attendance Dashboard</Typography>
                                <Typography color="text.secondary" variant="body2">Real-time attendance tracking and approvals</Typography>
                            </Box>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <MUIDatePicker
                                        label="From"
                                        value={startDate}
                                        onChange={(newValue) => newValue && setStartDate(newValue)}
                                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                    />
                                    <MUIDatePicker
                                        label="To"
                                        value={endDate}
                                        onChange={(newValue) => newValue && setEndDate(newValue)}
                                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                    />
                                </LocalizationProvider>
                                <Button
                                    variant="outlined"
                                    startIcon={<Refresh />}
                                    onClick={() => refetch()}
                                    disabled={isLoading}
                                    size="small"
                                >
                                    Refresh
                                </Button>
                                <Button variant="contained" startIcon={<Download />} size="small">
                                    Export
                                </Button>
                            </Stack>
                        </Box>
                    }
                />
                <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
                    {/* Stats Section */}
                    <Grid container spacing={2} mb={4}>
                        {[
                            { label: 'Total Records', value: stats.total, color: 'primary.main' },
                            { label: 'Approved', value: stats.approved, color: 'success.main' },
                            { label: 'Pending Approval', value: stats.pending, color: 'warning.main' },
                            { label: 'Rejected', value: stats.rejected, color: 'error.main' }
                        ].map((stat, idx) => (
                            <Grid item xs={12} sm={6} md={3} key={idx}>
                                <Paper elevation={0} sx={{
                                    p: 2,
                                    bgcolor: stat.color,
                                    color: 'white',
                                    borderRadius: 2,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <Typography variant="overline" sx={{ opacity: 0.8, lineHeight: 1.2 }}>{stat.label}</Typography>
                                    <Typography variant="h4" fontWeight="bold">{stat.value}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* DataGrid Section */}
                    <Box sx={{ height: 'calc(100vh - 430px)', width: '100%', minHeight: 400 }}>
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
                </CardContent>
            </Card>
        </Box>
    );
};

export default CompanyAttendance;
