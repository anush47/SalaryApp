import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Tooltip
} from '@mui/material';
import { ChevronLeft, ChevronRight, EventAvailable, EventBusy } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShiftAssignments, createShiftAssignment, deleteShiftAssignment } from '@/app/lib/api/shiftsApi';
import { Shift } from './ShiftConfigurationForm'; // Reuse Shift interface

interface RosterManagerProps {
    employeeId: string;
    shifts: Shift[]; // The pool of available shifts
    readOnly?: boolean;
}

export const RosterManager: React.FC<RosterManagerProps> = ({ employeeId, shifts, readOnly = false }) => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    const [isOffDay, setIsOffDay] = useState(false);

    const queryClient = useQueryClient();

    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const daysInMonth = currentDate.daysInMonth();

    // Fetch assignments for the current month view
    const { data: assignmentsResponse, isLoading } = useQuery({
        queryKey: ['shiftAssignments', employeeId, startOfMonth.format('YYYY-MM-DD')],
        queryFn: () => getShiftAssignments(employeeId, startOfMonth.format('YYYY-MM-DD'), endOfMonth.format('YYYY-MM-DD')),
        enabled: !!employeeId
    });

    const assignments = useMemo(() => assignmentsResponse?.success ? assignmentsResponse.data : [], [assignmentsResponse]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedDate) return;
            // If "Reset" (no shift, no off day), delete assignment
            if (!selectedShiftId && !isOffDay) {
                return deleteShiftAssignment(employeeId, selectedDate);
            }
            return createShiftAssignment({
                employeeId,
                date: selectedDate,
                shiftId: isOffDay ? undefined : selectedShiftId,
                isOffDay
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
            handleCloseDialog();
        }
    });

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));

    const handleDateClick = (dateStr: string) => {
        if (readOnly) return;
        const assignment = assignments.find((a: any) => a.date === dateStr);
        setSelectedDate(dateStr);
        setSelectedShiftId(assignment?.shiftId || '');
        setIsOffDay(assignment?.isOffDay || false);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedDate(null);
        setSelectedShiftId('');
        setIsOffDay(false);
    };

    const handleSave = () => {
        saveMutation.mutate();
    };

    // Helper to find shift name
    const getShiftName = (id: string) => shifts.find(s => s._id === id)?.name || 'Unknown Shift';

    // Generate Calendar Grid
    const generateGrid = () => {
        const grid = [];
        // Padding for start of month
        const startDayOfWeek = startOfMonth.day(); // 0 (Sun) to 6 (Sat)

        // Header
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        grid.push(
            <Grid container spacing={1} key="header" mb={1}>
                {weekDays.map(d => (
                    <Grid item xs={1.7} key={d} textAlign="center">
                        <Typography variant="caption" fontWeight="bold">{d}</Typography>
                    </Grid>
                ))}
            </Grid>
        );

        const days = [];
        // Empty slots
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(<Grid item xs={1.7} key={`empty-${i}`} />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = startOfMonth.date(i);
            const dateStr = date.format('YYYY-MM-DD');
            const assignment = assignments.find((a: any) => a.date === dateStr);
            const isToday = dayjs().format('YYYY-MM-DD') === dateStr;

            let content = null;
            let bgColor = 'background.paper';

            if (assignment) {
                if (assignment.isOffDay) {
                    content = <Box display="flex" flexDirection="column" alignItems="center"><EventBusy fontSize="small" color="error" /><Typography variant="caption" color="error">OFF</Typography></Box>;
                    bgColor = '#ffebee';
                } else {
                    content = <Box display="flex" flexDirection="column" alignItems="center"><EventAvailable fontSize="small" color="primary" /><Typography variant="caption" noWrap>{getShiftName(assignment.shiftId)}</Typography></Box>;
                    bgColor = '#e3f2fd';
                }
            }

            days.push(
                <Grid item xs={1.7} key={i}>
                    <Paper
                        variant="outlined"
                        sx={{
                            height: 80,
                            display: 'flex',
                            flexDirection: 'column',
                            p: 0.5,
                            cursor: readOnly ? 'default' : 'pointer',
                            bgcolor: isToday ? '#fff8e1' : bgColor,
                            borderColor: isToday ? '#ffb300' : 'divider',
                            '&:hover': { bgcolor: readOnly ? undefined : 'action.hover' }
                        }}
                        onClick={() => handleDateClick(dateStr)}
                    >
                        <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'} align="right">{i}</Typography>
                        <Box flexGrow={1} display="flex" justifyContent="center" alignItems="center" overflow="hidden">
                            {content}
                        </Box>
                    </Paper>
                </Grid>
            );
        }

        grid.push(
            <Grid container spacing={1} key="body">
                {days}
            </Grid>
        );

        return grid;
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <IconButton onClick={handlePrevMonth}><ChevronLeft /></IconButton>
                <Typography variant="h6">{currentDate.format('MMMM YYYY')}</Typography>
                <IconButton onClick={handleNextMonth}><ChevronRight /></IconButton>
            </Box>

            {isLoading ? <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box> : generateGrid()}

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Assign Shift - {selectedDate}</DialogTitle>
                <DialogContent>
                    <Box mt={2} display="flex" flexDirection="column" gap={2}>
                        <FormControlLabel
                            control={<Checkbox checked={isOffDay} onChange={(e) => setIsOffDay(e.target.checked)} />}
                            label="Mark as Off Day"
                        />
                        <FormControl fullWidth disabled={isOffDay}>
                            <InputLabel>Shift</InputLabel>
                            <Select
                                value={selectedShiftId}
                                label="Shift"
                                onChange={(e) => setSelectedShiftId(e.target.value)}
                            >
                                <MenuItem value="">
                                    <em>None (Remove Assignment)</em>
                                </MenuItem>
                                {shifts.map(shift => (
                                    <MenuItem key={shift._id} value={shift._id}>
                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary">
                            Select "None" and uncheck "Off Day" to revert to default/recurring rules.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
