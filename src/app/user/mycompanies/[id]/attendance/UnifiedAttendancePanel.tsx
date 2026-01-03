import React, { useState } from 'react';
import {
    Box,
    Typography,
    Stack,
    TextField,
    Autocomplete,
    Paper,
    CircularProgress,
    Button
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEmployees } from '@/app/lib/api/employeeApi';
import { useAttendanceAggregation, DailyAttendanceRecord } from '@/app/hooks/useAttendanceAggregation';
import { DailyAttendanceTable } from '@/app/components/attendance/DailyAttendanceTable';
import { Refresh } from '@mui/icons-material';
import { AttendanceRecordDialog } from '@/app/components/attendance/AttendanceRecordDialog';
import { fetchCompany } from '@/app/lib/api/companyApi';

interface UnifiedAttendancePanelProps {
    companyId: string;
}

export const UnifiedAttendancePanel: React.FC<UnifiedAttendancePanelProps> = ({ companyId }) => {
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs().endOf('month'));
    const [selectedRecord, setSelectedRecord] = useState<DailyAttendanceRecord | null>(null);

    // Fetch Company Config for Map
    const { data: companyData } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: !!companyId
    });

    const shifts = companyData?.shiftSettings?.shifts || [];
    console.log('UnifiedAttendancePanel - Company data:', companyData);
    console.log('UnifiedAttendancePanel - Shifts:', shifts);

    // Employee Fetching for Autocomplete
    const { data: employeesData, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees', companyId],
        queryFn: () => fetchEmployees({ companyId, limit: 1000 })
    });

    const employees = employeesData?.employees || [];

    // Aggregation Hook
    const { records, stats, loading: loadingAggregation } = useAttendanceAggregation(
        selectedEmployee?._id || "",
        companyId,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
    );

    const queryClient = useQueryClient();

    const handleEditRecord = (record: DailyAttendanceRecord) => {
        // Prioritize In-Log for editing, as it's the primary record
        setSelectedRecord(record);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                    <Autocomplete
                        options={employees}
                        getOptionLabel={(option) => `${option.name} (${option.memberNo})`}
                        value={selectedEmployee}
                        onChange={(_, newValue) => setSelectedEmployee(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Employee"
                                size="small"
                                helperText="View unified history for..."
                            />
                        )}
                        sx={{ width: 300 }}
                        loading={loadingEmployees}
                    />

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Stack direction="row" spacing={2}>
                            <DatePicker
                                label="From"
                                value={startDate}
                                onChange={(newValue) => newValue && setStartDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                            />
                            <DatePicker
                                label="To"
                                value={endDate}
                                onChange={(newValue) => newValue && setEndDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                            />
                        </Stack>
                    </LocalizationProvider>
                    {loadingAggregation && <CircularProgress size={24} />}
                </Stack>
            </Paper>

            {selectedEmployee ? (
                <>
                    {/* Summary Cards */}
                    <Stack direction="row" spacing={2} mb={3} overflow="auto" pb={1}>
                        <Paper sx={{ p: 2, minWidth: 120, bgcolor: 'primary.lighter', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Worked Days</Typography>
                            <Typography variant="h5" color="primary.main" fontWeight="bold">{stats?.workedDays || 0}</Typography>
                        </Paper>
                        <Paper sx={{ p: 2, minWidth: 120, bgcolor: 'error.lighter', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Absent</Typography>
                            <Typography variant="h5" color="error.main" fontWeight="bold">{stats?.absent || 0}</Typography>
                        </Paper>
                        <Paper sx={{ p: 2, minWidth: 120, bgcolor: 'info.lighter', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Total Hours</Typography>
                            <Typography variant="h5" color="info.main" fontWeight="bold">{stats?.totalHours || 0}h</Typography>
                        </Paper>
                        <Paper sx={{ p: 2, minWidth: 120, bgcolor: 'success.lighter', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Overtime</Typography>
                            <Typography variant="h5" color="success.main" fontWeight="bold">{stats?.totalOT || 0}h</Typography>
                        </Paper>
                    </Stack>

                    <DailyAttendanceTable
                        records={records}
                        loading={loadingAggregation}
                        onEdit={handleEditRecord}
                        userRole="employer"
                    />
                </>
            ) : (
                <Box sx={{ p: 5, textAlign: 'center', border: '1px dashed grey', borderRadius: 2 }}>
                    <Typography color="text.secondary">
                        Please select an employee to view their unified attendance history.
                    </Typography>
                </Box>
            )}

            {/* Edit Dialog */}
            <AttendanceRecordDialog
                open={!!selectedRecord}
                onClose={() => setSelectedRecord(null)}
                dailyRecord={selectedRecord}
                employee={selectedEmployee}
                companyConfig={companyData}
                shifts={shifts}
                onSaveSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["attendanceLogs", companyId] });
                    // Also invalidate aggregation if needed, but invalidating logs usually triggers re-aggregation if keys match
                }}
            />
        </Box>
    );
};
