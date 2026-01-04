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
    userRole: 'employee' | 'employer';
}

export const DailyAttendanceTable: React.FC<DailyAttendanceTableProps> = ({
    records,
    loading,
    onEdit,
    userRole
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
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
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
                                        record.status === 'Leave' ? 'info.lighter' :
                                            isOff ? 'action.selected' : 'inherit'
                                }}
                            >
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
                                    <Chip
                                        size="small"
                                        label={record.status === 'Leave' ? record.leaveStatus || 'Leave' : record.status}
                                        color={getStatusColor(record.status) as any}
                                        variant={record.status === 'Absent' ? 'filled' : 'outlined'}
                                        icon={record.status === 'Holiday' ? <Hotel /> : undefined}
                                    />
                                    {record.leaveType && (
                                        <Typography variant="caption" display="block" color="primary">
                                            {record.leaveType}
                                        </Typography>
                                    )}
                                    {record.holidayName && (
                                        <Typography variant="caption" display="block" color="secondary">
                                            {record.holidayName}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                                    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                                        {record.sessions && record.sessions.length > 0 ? (
                                            record.sessions.map((session, idx) => (
                                                <Box key={idx} display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                    {formatTime(session.checkInTime)}
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
                                                {userRole === 'employee' ? <Visibility fontSize="small" /> : <Edit fontSize="small" />}
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
