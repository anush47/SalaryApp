import React from 'react';
import {
    Box,
    Typography,
    Chip,
    Stack,
    Tooltip,
    IconButton,
    Button
} from "@mui/material";
import {
    DataGrid,
    GridColDef,
    GridToolbar,
} from "@mui/x-data-grid";
import {
    Visibility,
    ThumbUp,
    ThumbDown,
    LocationOn,
    PhoneIphone,
    CheckCircle,
    Cancel
} from "@mui/icons-material";
import dayjs from "dayjs";

interface AttendanceLogsTableProps {
    logs: any[];
    loading: boolean;
    userRole: 'employer' | 'manager';
    onView: (log: any) => void;
    onApproveReject: (id: string, status: 'approved' | 'rejected') => void;
}

export const AttendanceLogsTable: React.FC<AttendanceLogsTableProps> = ({
    logs,
    loading,
    userRole,
    onView,
    onApproveReject
}) => {
    // Compute Device Changes
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
                // Only flag if we have a previous device to compare and it's different
                if (lastDevice && currentDevice && lastDevice !== currentDevice) {
                    map[log._id] = true;
                }
                // Update tracker if current log has a device ID
                if (currentDevice) lastDevice = currentDevice;
            });
        });

        return map;
    }, [logs]);

    const columns: GridColDef[] = [
        {
            field: "memberNo",
            headerName: "ID",
            width: 80,
            valueGetter: (value: any, row: any) => row?.employee?.memberNo,
        },
        {
            field: "employee",
            headerName: "Employee",
            flex: 1,
            renderCell: (params) => (
                <Box display="flex" alignItems="center" gap={1} height="100%">
                    <Typography variant="body2" fontWeight="600">{params.value?.name}</Typography>
                </Box>
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
            width: 180,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => {
                const shift = params.row.shift;
                const shiftName = typeof shift === 'object' ? shift?.name : shift;
                const startTime = typeof shift === 'object' ? shift?.startTime : null;
                const endTime = typeof shift === 'object' ? shift?.endTime : null;

                return (
                    <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
                        <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                            {shiftName || 'No Shift'}
                        </Typography>
                        {startTime && endTime && (
                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                {startTime} - {endTime}
                            </Typography>
                        )}
                    </Box>
                );
            },
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
            sortable: false,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const isPending = params.row.status === 'pending';
                return (
                    <Stack direction="row" spacing={1} justifyContent="center" height="100%" alignItems="center">
                        <Tooltip title="View Details">
                            <IconButton
                                size="small"
                                color="info"
                                onClick={() => onView(params.row)}
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
                                        onClick={() => onApproveReject(params.row._id, 'approved')}
                                        sx={{ border: '1px solid', borderColor: 'success.light' }}
                                    >
                                        <ThumbUp sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => onApproveReject(params.row._id, 'rejected')}
                                        sx={{ border: '1px solid', borderColor: 'error.light' }}
                                    >
                                        <ThumbDown sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Stack>
                );
            }
        }
    ];

    return (
        <DataGrid
            rows={logs}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableRowSelectionOnClick
            disableDensitySelector
            density="standard"
            slots={{ toolbar: GridToolbar }}
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
    );
};
