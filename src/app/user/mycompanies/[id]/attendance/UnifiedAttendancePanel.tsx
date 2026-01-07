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
import { Grid } from '@mui/material';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEmployees } from '@/app/lib/api/employeeApi';
import { useAttendanceAggregation, DailyAttendanceRecord } from '@/app/hooks/useAttendanceAggregation';
import { DailyAttendanceTable } from '@/app/components/attendance/DailyAttendanceTable';
import { Refresh } from '@mui/icons-material';
import { AttendanceRecordDialog } from '@/app/components/attendance/AttendanceRecordDialog';
import { LeaveDetailsDialog } from '@/app/components/leave/LeaveDetailsDialog';
import { fetchCompany } from '@/app/lib/api/companyApi';

interface UnifiedAttendancePanelProps {
    companyId: string;
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
    selectedEmployee: any | null;
    setSelectedEmployee: (emp: any | null) => void;
}

export const UnifiedAttendancePanel: React.FC<UnifiedAttendancePanelProps> = ({
    companyId,
    startDate,
    endDate,
    selectedEmployee,
    setSelectedEmployee
}) => {
    const [selectedRecord, setSelectedRecord] = useState<DailyAttendanceRecord | null>(null);
    const [selectedLeaveId, setSelectedLeaveId] = useState<string | undefined>();

    // Fetch Company Config for Map
    const { data: companyData } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: !!companyId
    });

    const shifts = companyData?.shiftSettings?.shifts || [];

    // Employee Fetching for Autocomplete
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

    const handleLeaveClick = (record: DailyAttendanceRecord) => {
        if (record.leaveId) {
            setSelectedLeaveId(record.leaveId);
        }
    };

    return (
        <Box sx={{ p: 2 }}>


            {selectedEmployee ? (
                <>
                    {/* Summary Cards */}
                    <Grid container spacing={1.5} mb={3}>
                        {[
                            { label: 'Worked Days', value: stats?.workedDays || 0, color: 'primary' },
                            { label: 'Absent', value: stats?.absent || 0, color: 'error' },
                            { label: 'Total Hours', value: `${stats?.totalHours || 0}h`, color: 'info' },
                            { label: 'Overtime', value: `${stats?.totalOT || 0}h`, color: 'success' },
                        ].map((stat, idx) => (
                            <Grid item xs={6} sm={3} key={idx}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: { xs: 1, sm: 2 },
                                        textAlign: 'center',
                                        borderRadius: 2,
                                        borderLeft: `3px solid`,
                                        borderColor: `${stat.color}.main`,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                            fontWeight: 'medium'
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: `${stat.color}.main`,
                                            fontWeight: 'bold',
                                            fontSize: { xs: '1rem', sm: '1.25rem' }
                                        }}
                                    >
                                        {stat.value}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    <DailyAttendanceTable
                        records={records}
                        loading={loadingAggregation}
                        onEdit={handleEditRecord}
                        onLeaveClick={handleLeaveClick}
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
                    // Invalidate keys used by useAttendanceAggregation and other panels
                    queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
                    queryClient.invalidateQueries({ queryKey: ['companyAttendanceLatest'] });
                    queryClient.invalidateQueries({ queryKey: ['companyAttendanceLogs'] });
                    setSelectedRecord(null);
                }}
            />

            {/* Leave Details Dialog */}
            <LeaveDetailsDialog
                open={!!selectedLeaveId}
                onClose={() => setSelectedLeaveId(undefined)}
                leaveRequestId={selectedLeaveId}
                mode="view"
            />
        </Box>
    );
};
