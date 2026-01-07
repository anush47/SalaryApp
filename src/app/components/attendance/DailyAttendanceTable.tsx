import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, Typography, Box, IconButton, Tooltip, TextField
} from '@mui/material';
import { CheckCircle, Cancel, Edit, Info, Hotel, Warning, Visibility, PhoneIphone } from '@mui/icons-material';
import dayjs from 'dayjs';
import { DailyAttendanceRecord } from '@/app/hooks/useAttendanceAggregation';

interface DailyAttendanceTableProps {
    records: DailyAttendanceRecord[];
    loading: boolean;
    onEdit?: (record: DailyAttendanceRecord) => void;
    onLeaveClick?: (record: DailyAttendanceRecord) => void;
    userRole: 'employee' | 'employer';
    showEmployeeColumn?: boolean;
    maxHeight?: string | number;
}

export const DailyAttendanceTable: React.FC<DailyAttendanceTableProps> = ({
    records,
    loading,
    onEdit,
    onLeaveClick,
    userRole,
    showEmployeeColumn = false,
    maxHeight = 500
}) => {

    const getStatusColor = (status: DailyAttendanceRecord['status']) => {
        switch (status) {
            case 'Present': return 'success';
            case 'Absent': return 'error';
            case 'Leave': return 'primary';
            case 'Holiday': return 'secondary';
            case 'Off': return 'default';
            case 'Future': return 'default';
            default: return 'default';
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '-';
        return dayjs(isoString).format('HH:mm');
    };

    const formatDuration = (mins: number) => {
        if (!mins) return '-';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    if (loading) {
        return <Typography p={2}>Loading attendance records...</Typography>;
    }

    if (records.length === 0) {
        return <Typography p={2}>No records found for this period.</Typography>;
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: maxHeight, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover', '& th': { bgcolor: 'action.hover' } }}>
                        {showEmployeeColumn && <TableCell>Employee</TableCell>}
                        <TableCell>Date</TableCell>
                        <TableCell>Shift</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">In</TableCell>
                        <TableCell align="center">Out</TableCell>
                        <TableCell align="right">Duration</TableCell>
                        {userRole === 'employer' && <TableCell align="right">OT</TableCell>}
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {records.map((record, index) => {
                        const isWeekend = record.dayOfWeek === 'Saturday' || record.dayOfWeek === 'Sunday';
                        const isOff = record.isOffDay || record.isHoliday;

                        return (
                            <TableRow
                                key={`${record.date}-${record.shiftId || index}`}
                                sx={{
                                    bgcolor: record.status === 'Absent' ? 'error.lighter' :
                                        record.status === 'Leave' ? 'primary.lighter' :
                                            isOff ? 'action.selected' : 'inherit',
                                    borderLeft: record.status === 'Leave' ? '4px solid' : 'none',
                                    borderLeftColor: record.status === 'Leave' ? 'primary.main' : 'transparent',
                                }}
                            >
                                {showEmployeeColumn && (
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            {record.employee?.name}
                                        </Typography>
                                        {record.employee?.memberNo && (
                                            <Typography variant="caption" color="text.secondary">
                                                #{record.employee.memberNo}
                                            </Typography>
                                        )}
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {dayjs(record.date).format('ddd, MMM D')}
                                        </Typography>
                                        <Typography variant="caption" color={isWeekend ? 'error.main' : 'text.secondary'}>
                                            {record.dayOfWeek}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" flexDirection="column">
                                        <Typography variant="caption" color="text.secondary">
                                            {record.shiftName}
                                        </Typography>
                                        {record.expectedStartTime && (
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                                {record.expectedStartTime} - {record.expectedEndTime}
                                                {record.isOvernightShift && <span style={{ color: 'red' }}> (+1)</span>}
                                            </Typography>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box>
                                        <Chip
                                            size="small"
                                            label={record.status === 'Leave' ? record.leaveStatus || 'Leave' : record.status}
                                            color={getStatusColor(record.status) as any}
                                            variant={record.status === 'Absent' ? 'filled' : 'outlined'}
                                            icon={record.status === 'Holiday' ? <Hotel /> : undefined}
                                        />
                                        {record.leaveType && (
                                            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                <Typography variant="caption" color="primary" fontWeight="600">
                                                    {record.leaveType}
                                                </Typography>
                                                {onLeaveClick && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onLeaveClick(record)}
                                                        sx={{ p: 0.25 }}
                                                    >
                                                        <Visibility sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        )}
                                        {record.holidayName && (
                                            <Typography variant="caption" display="block" color="secondary">
                                                {record.holidayName}
                                            </Typography>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                                    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                                        {record.sessions && record.sessions.length > 0 ? (
                                            record.sessions.map((session, idx) => (
                                                <Box key={idx} display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                    {formatTime(session.checkInTime)}
                                                    {idx === 0 && record.isLate && (
                                                        <Chip label="LATE" color="error" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                    )}
                                                    {session.inDeviceChange && (
                                                        <Tooltip title="Device Changed">
                                                            <PhoneIphone color="warning" sx={{ fontSize: 16 }} />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            ))
                                        ) : (
                                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                {formatTime(record.checkInTime)}
                                                {record.isLate && (
                                                    <Chip label="LATE" color="error" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                )}
                                                {record.inDeviceChange && (
                                                    <Tooltip title="Device Changed">
                                                        <PhoneIphone color="warning" sx={{ fontSize: 16 }} />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                                    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                                        {record.sessions && record.sessions.length > 0 ? (
                                            record.sessions.map((session, idx) => (
                                                <Box key={idx} display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                    {formatTime(session.checkOutTime)}
                                                    {idx === record.sessions!.length - 1 && record.isLeftEarly && (
                                                        <Chip label="EARLY" color="warning" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                    )}
                                                    {session.outDeviceChange && (
                                                        <Tooltip title="Device Changed">
                                                            <PhoneIphone color="warning" sx={{ fontSize: 16 }} />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            ))
                                        ) : (
                                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                {formatTime(record.checkOutTime)}
                                                {record.isLeftEarly && (
                                                    <Chip label="EARLY" color="warning" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                )}
                                                {record.outDeviceChange && (
                                                    <Tooltip title="Device Changed">
                                                        <PhoneIphone color="warning" sx={{ fontSize: 16 }} />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    {formatDuration(record.durationMinutes)}
                                    {record.isLessHours && (
                                        <Chip label="SHORT" color="warning" size="small" sx={{ height: 16, fontSize: '0.6rem', ml: 0.5 }} />
                                    )}
                                </TableCell>
                                {userRole === 'employer' && (
                                    <TableCell align="right" sx={{ color: record.otMinutes > 0 ? 'success.main' : 'inherit', fontWeight: record.otMinutes > 0 ? 'bold' : 'normal' }}>
                                        {record.otMinutes > 0 ? `+${formatDuration(record.otMinutes)}` : '-'}
                                    </TableCell>
                                )}
                                <TableCell align="center">
                                    {(userRole === 'employer' || (userRole === 'employee' && (!isOff || record.checkInTime || record.checkOutTime))) && (
                                        <Tooltip title={userRole === 'employee' ? "View Details" : "Edit Details"}>
                                            <IconButton size="small" onClick={() => onEdit && onEdit(record)}>
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {record.requiresAttention && (
                                        <Tooltip title="Missing Punch or Irregularity">
                                            <Warning color="warning" fontSize="small" sx={{ ml: 1 }} />
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
