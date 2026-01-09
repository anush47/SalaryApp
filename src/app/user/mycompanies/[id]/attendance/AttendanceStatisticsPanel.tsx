import React, { useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Paper,
    useTheme,
    Avatar,
    Stack,
    Divider,
    CircularProgress,
    Chip
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell
} from 'recharts';
import dayjs from 'dayjs';
import { DailyAttendanceRecord } from '@/app/hooks/useAttendanceAggregation';
import {
    Person,
    Schedule,
    TrendingUp,
    AccessTime,
    WarningAmber,
    EmojiEvents
} from '@mui/icons-material';

interface AttendanceStatisticsPanelProps {
    records: DailyAttendanceRecord[];
    loading: boolean;
    selectedEmployee?: any | null;
    shifts?: any[];
}

export const AttendanceStatisticsPanel: React.FC<AttendanceStatisticsPanelProps> = ({ records, loading, selectedEmployee }) => {
    const theme = useTheme();

    const stats = useMemo(() => {
        if (!records || records.length === 0) return null;

        // Track unique employees and daily data
        const uniqueEmployees = new Set<string>();
        const dailyData: Record<string, {
            date: string;
            onTime: number;
            late: number;
            totalHours: number;
            totalOT: number;
            presentCount: number;
        }> = {};

        const employeeData: Record<string, {
            name: string;
            memberNo?: string;
            totalHours: number;
            daysPresent: number;
            totalOT: number;
            lateCount: number;
            earlyLeaveCount: number;
            absentCount: number;
            leaveCount: number;
            locationIssues: number; // Unverified check-ins/outs
            basic?: number;
        }> = {};

        let totalDaysPresent = 0;
        let totalDaysLate = 0;
        let totalDaysAbsent = 0;
        let totalDaysLeave = 0;
        let totalHoursWorked = 0;
        let totalOTHours = 0;
        let totalScheduledDays = 0;
        let totalEarlyLeaves = 0;
        let totalLocationIssues = 0;

        // Process all records
        records.forEach(r => {
            const empId = r.employee?._id || 'unknown';
            const date = r.date;

            uniqueEmployees.add(empId);
            totalScheduledDays++;

            // Initialize daily bucket
            if (!dailyData[date]) {
                dailyData[date] = { date, onTime: 0, late: 0, totalHours: 0, totalOT: 0, presentCount: 0 };
            }

            // Initialize employee bucket
            if (empId !== 'unknown' && !employeeData[empId]) {
                employeeData[empId] = {
                    name: r.employee?.name || 'Unknown',
                    memberNo: r.employee?.memberNo,
                    totalHours: 0,
                    daysPresent: 0,
                    totalOT: 0,
                    lateCount: 0,
                    earlyLeaveCount: 0,
                    absentCount: 0,
                    leaveCount: 0,
                    locationIssues: 0,
                    basic: (r.employee as any)?.basic
                };
            }

            // Aggregate data
            if (r.status === 'Present') {
                totalDaysPresent++;
                const hours = r.durationMinutes / 60;
                const ot = r.otMinutes / 60;

                totalHoursWorked += hours;
                totalOTHours += ot;

                dailyData[date].totalHours += hours;
                dailyData[date].totalOT += ot;
                dailyData[date].presentCount++;

                if (r.isLate) {
                    totalDaysLate++;
                    dailyData[date].late++;
                    if (empId !== 'unknown') employeeData[empId].lateCount++;
                } else {
                    dailyData[date].onTime++;
                }

                if (r.isLeftEarly) {
                    totalEarlyLeaves++;
                    if (empId !== 'unknown') employeeData[empId].earlyLeaveCount++;
                }

                // Track location compliance issues
                const hasLocationIssue = !r.inVerified || !r.outVerified;
                if (hasLocationIssue && empId !== 'unknown') {
                    employeeData[empId].locationIssues++;
                    totalLocationIssues++;
                }

                if (empId !== 'unknown') {
                    employeeData[empId].totalHours += hours;
                    employeeData[empId].totalOT += ot;
                    employeeData[empId].daysPresent++;
                }
            } else if (r.status === 'Absent') {
                totalDaysAbsent++;
                if (empId !== 'unknown') employeeData[empId].absentCount++;
            } else if (r.status === 'Leave') {
                totalDaysLeave++;
                if (empId !== 'unknown') employeeData[empId].leaveCount++;
            }
        });

        // Calculate KPIs
        const attendanceRate = totalScheduledDays > 0
            ? Math.round((totalDaysPresent / totalScheduledDays) * 100)
            : 0;

        const avgHoursPerDay = totalDaysPresent > 0
            ? Number((totalHoursWorked / totalDaysPresent).toFixed(1))
            : 0;

        const punctualityRate = totalDaysPresent > 0
            ? Math.round(((totalDaysPresent - totalDaysLate) / totalDaysPresent) * 100)
            : 0;

        // Calculate costs if salary data available
        let totalOTCost = 0;
        let totalLaborCost = 0;
        let hasSalaryData = false;

        Object.values(employeeData).forEach(emp => {
            if (emp.basic) {
                hasSalaryData = true;
                const hourlyRate = emp.basic / 240;
                const otRate = hourlyRate * 1.5;
                totalOTCost += emp.totalOT * otRate;
                totalLaborCost += emp.basic;
            }
        });

        // Sort daily data and calculate averages
        const dailyStats = Object.values(dailyData)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(day => ({
                ...day,
                avgHours: day.presentCount > 0 ? Number((day.totalHours / day.presentCount).toFixed(1)) : 0,
                avgOT: day.presentCount > 0 ? Number((day.totalOT / day.presentCount).toFixed(1)) : 0
            }));

        // Work hours distribution (4 buckets)
        const hoursDistribution = [
            { name: 'Under 6h', count: 0, color: theme.palette.error.main, label: 'Under-utilized' },
            { name: '6-8h', count: 0, color: theme.palette.warning.main, label: 'Below target' },
            { name: '8-9h', count: 0, color: theme.palette.success.main, label: 'Optimal' },
            { name: '9h+', count: 0, color: theme.palette.info.main, label: 'Overworked' }
        ];

        Object.values(employeeData).forEach(emp => {
            const avgHours = emp.daysPresent > 0 ? emp.totalHours / emp.daysPresent : 0;
            if (avgHours > 0 && avgHours < 6) hoursDistribution[0].count++;
            else if (avgHours >= 6 && avgHours < 8) hoursDistribution[1].count++;
            else if (avgHours >= 8 && avgHours < 9) hoursDistribution[2].count++;
            else if (avgHours >= 9) hoursDistribution[3].count++;
        });

        // Top OT employees (top 5)
        const topOTEmployees = Object.values(employeeData)
            .filter(emp => emp.totalOT > 0)
            .sort((a, b) => b.totalOT - a.totalOT)
            .slice(0, 5)
            .map(emp => ({
                ...emp,
                otCost: emp.basic ? (emp.basic / 240) * 1.5 * emp.totalOT : null
            }));

        // Top performers (by total hours)
        const topPerformers = Object.values(employeeData)
            .sort((a, b) => b.totalHours - a.totalHours)
            .slice(0, 5);

        // Leave details - track who took leave and when
        const leaveDetails: Array<{
            employeeName: string;
            date: string;
            leaveType?: string;
            leaveStatus?: string;
        }> = [];

        records.forEach(r => {
            if (r.status === 'Leave' && r.employee) {
                leaveDetails.push({
                    employeeName: r.employee.name,
                    date: r.date,
                    leaveType: r.leaveType,
                    leaveStatus: r.leaveStatus
                });
            }
        });

        // Sort leave details by date
        leaveDetails.sort((a, b) => a.date.localeCompare(b.date));

        // Needs attention (high late/absent rate, early leaves, location issues, or low hours)
        const needsAttention = Object.values(employeeData)
            .filter(emp => {
                // Only count days with actual records (present + absent + leave)
                const totalRecordedDays = emp.daysPresent + emp.absentCount + emp.leaveCount;
                const lateRate = emp.daysPresent > 0 ? (emp.lateCount / emp.daysPresent) * 100 : 0;
                const absentRate = totalRecordedDays > 0 ? (emp.absentCount / totalRecordedDays) * 100 : 0;
                const avgHours = emp.daysPresent > 0 ? emp.totalHours / emp.daysPresent : 0;
                const locationIssueRate = emp.daysPresent > 0 ? (emp.locationIssues / emp.daysPresent) * 100 : 0;

                return lateRate > 20 || absentRate > 10 || avgHours < 6 || emp.earlyLeaveCount > 2 || locationIssueRate > 30;
            })
            .map(emp => {
                const issues = [];
                const totalRecordedDays = emp.daysPresent + emp.absentCount + emp.leaveCount;

                if (emp.lateCount > 0) issues.push(`${emp.lateCount} late`);
                if (emp.earlyLeaveCount > 0) issues.push(`${emp.earlyLeaveCount} early`);
                if (emp.absentCount > 0) issues.push(`${emp.absentCount} absent`);
                if (emp.locationIssues > 0) issues.push(`${emp.locationIssues} location`);

                return {
                    ...emp,
                    issues,
                    issueText: issues.join(', ') || 'Low hours',
                    daysWorked: totalRecordedDays
                };
            })
            .slice(0, 5);

        return {
            // KPIs
            attendanceRate,
            avgHoursPerDay,
            totalOTHours: Math.round(totalOTHours),
            punctualityRate,

            // Costs
            totalOTCost: Math.round(totalOTCost),
            totalLaborCost: Math.round(totalLaborCost),
            hasSalaryData,

            // Leave stats
            totalDaysLeave,
            leaveRate: totalScheduledDays > 0 ? Math.round((totalDaysLeave / totalScheduledDays) * 100) : 0,
            leaveDetails,

            // Charts
            dailyStats,
            hoursDistribution,
            topOTEmployees,

            // Leaderboards
            topPerformers,
            needsAttention,

            // Counts
            uniqueEmployeeCount: uniqueEmployees.size,
            totalEarlyLeaves,
            totalLocationIssues
        };
    }, [records, theme]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!stats || records.length === 0) {
        return (
            <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography color="text.secondary">No attendance data available for the selected period.</Typography>
            </Box>
        );
    }

    // Helper function to get color based on value and thresholds
    const getKPIColor = (value: number, type: 'attendance' | 'punctuality' | 'hours') => {
        if (type === 'attendance' || type === 'punctuality') {
            if (value >= 95) return 'success';
            if (value >= 85) return 'warning';
            return 'error';
        }
        // For hours
        if (value >= 7.5 && value <= 9) return 'success';
        if (value >= 6 && value < 7.5) return 'warning';
        return 'error';
    };

    const KPICard = ({ title, value, unit, color }: any) => {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 1, sm: 2 },
                    textAlign: 'center',
                    borderRadius: 2,
                    borderLeft: `3px solid`,
                    borderColor: `${color}.main`,
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
                    {title}
                </Typography>
                <Typography
                    variant="h6"
                    sx={{
                        color: `${color}.main`,
                        fontWeight: 'bold',
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                >
                    {value}{unit}
                </Typography>
            </Paper>
        );
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* KPI Cards - Matching logs tab styling */}
            <Grid container spacing={1.5} mb={3}>
                <Grid item xs={6} sm={3}>
                    <KPICard
                        title="Attendance Rate"
                        value={stats.attendanceRate}
                        unit="%"
                        color="primary"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <KPICard
                        title="Avg Hours/Day"
                        value={stats.avgHoursPerDay}
                        unit="h"
                        color="info"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <KPICard
                        title="Total Overtime"
                        value={stats.totalOTHours}
                        unit="h"
                        color="success"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <KPICard
                        title="Punctuality"
                        value={stats.punctualityRate}
                        unit="%"
                        color="warning"
                    />
                </Grid>
            </Grid>

            {/* Main Chart: Daily Attendance - Bar Chart */}
            <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Daily Attendance
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        Present employees (on-time vs late)
                    </Typography>
                    <Box height={{ xs: 200, sm: 250 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => dayjs(val).format('DD MMM')}
                                    fontSize={11}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    fontSize={11}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme.palette.background.paper,
                                        borderRadius: 8,
                                        border: '1px solid ' + theme.palette.divider,
                                        boxShadow: theme.shadows[3]
                                    }}
                                    labelFormatter={(l) => dayjs(l).format('dddd, DD MMMM')}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="onTime" stackId="a" fill={theme.palette.success.main} name="On Time" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="late" stackId="a" fill={theme.palette.warning.main} name="Late" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            {/* Two Column: Work Hours Line Chart & OT */}
            <Grid container spacing={2} mb={2}>
                <Grid item xs={12} md={8}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Daily Work Hours Trend
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                Average hours and OT per employee per day
                            </Typography>
                            <Box height={{ xs: 200, sm: 250 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={stats.dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.warning.main} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={theme.palette.warning.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} opacity={0.3} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => dayjs(val).format('DD MMM')}
                                            fontSize={11}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            fontSize={11}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: theme.palette.background.paper,
                                                borderRadius: 8,
                                                border: '1px solid ' + theme.palette.divider,
                                                boxShadow: theme.shadows[3]
                                            }}
                                            labelFormatter={(l) => dayjs(l).format('dddd, DD MMMM')}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="avgHours"
                                            stroke={theme.palette.primary.main}
                                            fill="url(#colorHours)"
                                            name="Avg Hours"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="avgOT"
                                            stroke={theme.palette.warning.main}
                                            fill="url(#colorOT)"
                                            name="Avg OT"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Top Overtime Users
                            </Typography>
                            <Box>
                                {stats.topOTEmployees.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                        No overtime recorded
                                    </Typography>
                                ) : (
                                    <Stack spacing={1.5}>
                                        {stats.topOTEmployees.map((emp, idx) => (
                                            <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar sx={{
                                                        width: 32,
                                                        height: 32,
                                                        fontSize: '0.875rem',
                                                        bgcolor: emp.totalOT > 20 ? 'error.main' : 'warning.main'
                                                    }}>
                                                        {idx + 1}
                                                    </Avatar>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {emp.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {Math.round(emp.totalOT)}h OT in {emp.daysPresent} days
                                                            {emp.otCost && ` • $${Math.round(emp.otCost).toLocaleString()}`}
                                                        </Typography>
                                                    </Box>
                                                    {emp.totalOT > 20 && (
                                                        <Chip label="High" size="small" color="error" />
                                                    )}
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Performance Leaderboards & Leave Stats */}
            {!selectedEmployee && (
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} lg={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'success.lighter' }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <EmojiEvents sx={{ color: 'success.main', fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">Top Performers</Typography>
                                </Stack>
                            </Box>
                            <Box sx={{ p: 0 }}>
                                {stats.topPerformers.map((emp, idx) => (
                                    <Box key={idx}>
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                                            <Avatar sx={{
                                                width: 32,
                                                height: 32,
                                                fontSize: '0.875rem',
                                                bgcolor: idx === 0 ? 'success.main' : 'action.disabled',
                                                fontWeight: 'bold'
                                            }}>
                                                {idx + 1}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body2" fontWeight="medium">{emp.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {Math.round(emp.totalHours)}h • {emp.daysPresent} days
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        {idx < stats.topPerformers.length - 1 && <Divider />}
                                    </Box>
                                ))}
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} lg={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'error.lighter' }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <WarningAmber sx={{ color: 'error.main', fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">Needs Attention</Typography>
                                </Stack>
                            </Box>
                            <Box sx={{ p: 0 }}>
                                {stats.needsAttention.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            All employees performing well!
                                        </Typography>
                                    </Box>
                                ) : (
                                    stats.needsAttention.map((emp, idx) => (
                                        <Box key={idx}>
                                            <Stack spacing={1} sx={{ px: 2, py: 1.5 }}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar sx={{
                                                        width: 32,
                                                        height: 32,
                                                        fontSize: '0.875rem',
                                                        bgcolor: 'error.main',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        !
                                                    </Avatar>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="body2" fontWeight="medium">{emp.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {emp.daysWorked} recorded days
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ pl: 5 }}>
                                                    {emp.issues.map((issue, i) => {
                                                        const isLocation = issue.includes('location');
                                                        const isLate = issue.includes('late');
                                                        const isEarly = issue.includes('early');
                                                        const isAbsent = issue.includes('absent');

                                                        let color: 'error' | 'warning' | 'info' = 'error';
                                                        if (isLocation) color = 'info';
                                                        else if (isLate || isEarly) color = 'warning';

                                                        return (
                                                            <Chip
                                                                key={i}
                                                                label={issue}
                                                                size="small"
                                                                color={color}
                                                                sx={{ fontSize: '0.7rem', height: 20 }}
                                                            />
                                                        );
                                                    })}
                                                </Stack>
                                            </Stack>
                                            {idx < stats.needsAttention.length - 1 && <Divider />}
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Card>
                    </Grid>

                    {/* Leave Statistics */}
                    {stats.totalDaysLeave > 0 && (
                        <Grid item xs={12} sm={6} lg={4}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'info.lighter' }}>
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            Leave Statistics
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                label={`${stats.totalDaysLeave} days`}
                                                size="small"
                                                color="info"
                                                sx={{ fontWeight: 'bold', height: 20, fontSize: '0.7rem' }}
                                            />
                                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                                {stats.leaveRate}%
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Box>
                                <Box sx={{ p: 0, maxHeight: 400, overflowY: 'auto' }}>
                                    {stats.leaveDetails.map((leave, idx) => (
                                        <Box key={idx}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                                                <Box sx={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    bgcolor: 'info.main',
                                                    flexShrink: 0
                                                }} />
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight="medium" noWrap>
                                                        {leave.employeeName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {dayjs(leave.date).format('MMM DD')}
                                                        {leave.leaveType && ` • ${leave.leaveType}`}
                                                        {leave.leaveStatus && leave.leaveStatus !== 'Full' && ` (${leave.leaveStatus})`}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            {idx < stats.leaveDetails.length - 1 && <Divider />}
                                        </Box>
                                    ))}
                                </Box>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
};
