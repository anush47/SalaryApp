import React, { useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Paper,
    useTheme
} from '@mui/material';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';
import dayjs from 'dayjs';

interface AttendanceStatisticsPanelProps {
    logs: any[];
    selectedEmployee?: any | null;
    shifts?: any[];
}

export const AttendanceStatisticsPanel: React.FC<AttendanceStatisticsPanelProps> = ({ logs, selectedEmployee, shifts = [] }) => {
    const theme = useTheme();

    const stats = useMemo(() => {
        const uniqueEmployees = new Set<string>();
        const dailyStats: Record<string, { date: string; present: number; late: number; totalHours: number; avgHours: number }> = {};

        // Counters
        let totalPresentDays = 0; // Cumulative unique employee-days
        let totalLate = 0;
        let totalOnTime = 0;
        let cumulativeHours = 0;
        let verifiedCount = 0;
        let unverifiedCount = 0;

        // Group logs by Date -> Employee -> Logs[]
        const groupedLogs: Record<string, Record<string, any[]>> = {};

        logs.forEach(log => {
            if (!log.timestamp || !log.employee?._id) return;

            const date = dayjs(log.timestamp).format('YYYY-MM-DD');
            const empId = log.employee._id;

            if (!groupedLogs[date]) groupedLogs[date] = {};
            if (!groupedLogs[date][empId]) groupedLogs[date][empId] = [];

            groupedLogs[date][empId].push(log);
            uniqueEmployees.add(empId);
        });

        // Process Daily Stats & Global Metrics
        Object.keys(groupedLogs).forEach(date => {
            const dateLogs = groupedLogs[date];
            const employeesOnDate = Object.keys(dateLogs);

            let dailyLate = 0;
            let dailyHours = 0;

            employeesOnDate.forEach(empId => {
                // Sort logs for this employee on this day
                const empLogs = dateLogs[empId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                // 1. Analyze First Punch (Punctuality & Zone)
                const firstIn = empLogs.find(l => l.type === 'in');
                if (firstIn) {
                    // Punctuality Logic
                    let isLate = false;

                    // Determine Shift Start Time
                    let expectedStart = "09:00"; // Fallback default
                    // 1. Check if log has populated shift object
                    if (firstIn.shift && typeof firstIn.shift === 'object' && firstIn.shift.startTime) {
                        expectedStart = firstIn.shift.startTime;
                    }
                    // 2. Check if log has shift ID and look up in passed shifts prop
                    else if ((firstIn.shift && typeof firstIn.shift === 'string') || (firstIn.shift?.shiftId)) {
                        const sId = firstIn.shift?.shiftId || firstIn.shift;
                        const def = shifts.find(s => s._id === sId || s.id === sId);
                        if (def) expectedStart = def.startTime;
                    }
                    // 3. Fallback: If no shift assigned, check if there is a 'Standard' or default shift in shifts list?
                    // Safe default: 09:00 is acceptable if absolutely no info.

                    const [eh, em] = expectedStart.split(':').map(Number);
                    const shiftStartTime = dayjs(firstIn.timestamp).hour(eh).minute(em).second(0);

                    // Late threshold: > 1 minute after start
                    if (dayjs(firstIn.timestamp).isAfter(shiftStartTime.add(1, 'minute'))) {
                        isLate = true;
                    }

                    if (isLate) {
                        dailyLate++;
                        totalLate++;
                    } else {
                        totalOnTime++;
                    }

                    // Zone Verification (Count per unique daily entry per person? Or every punch? 
                    // Let's count EVERY IN punch for zone stats to show overall compliance behavior)
                }

                // 1b. Zone Verification (Count ALL IN punches for compliance accuracy)
                empLogs.forEach(l => {
                    if (l.type === 'in') {
                        if (l.location?.isVerified) verifiedCount++;
                        else unverifiedCount++;
                    }
                });


                // 2. Calculate Duration (Simple pairing)
                let tempInTime: dayjs.Dayjs | null = null;
                empLogs.forEach(log => {
                    if (log.type === 'in') {
                        tempInTime = dayjs(log.timestamp);
                    } else if (log.type === 'out' && tempInTime) {
                        const duration = dayjs(log.timestamp).diff(tempInTime, 'hour', true); // decimal hours
                        if (duration > 0 && duration < 24) { // Sanity check
                            dailyHours += duration;
                            cumulativeHours += duration;
                        }
                        tempInTime = null; // Reset
                    }
                });
            });

            // Aggregate Daily Data
            dailyStats[date] = {
                date,
                present: employeesOnDate.length,
                late: dailyLate,
                totalHours: dailyHours,
                avgHours: employeesOnDate.length > 0 ? Math.round((dailyHours / employeesOnDate.length) * 10) / 10 : 0
            };

            totalPresentDays += employeesOnDate.length;
        });

        const sortedDays = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalPresentDays,
            totalLate,
            totalOnTime,
            verifiedCount,
            unverifiedCount,
            uniqueEmployees: uniqueEmployees.size,
            avgDailyHours: totalPresentDays > 0 ? Math.round((cumulativeHours / totalPresentDays) * 10) / 10 : 0,
            dailyStats: sortedDays
        };
    }, [logs]);

    // Chart Data Generation
    const punctualityData = [
        { name: 'On Time', value: stats.totalOnTime, color: theme.palette.success.main },
        { name: 'Late', value: stats.totalLate, color: theme.palette.warning.main },
    ];

    const zoneData = [
        { name: 'In Zone (Verified)', value: stats.verifiedCount, color: theme.palette.info.main },
        { name: 'Out of Zone', value: stats.unverifiedCount, color: theme.palette.error.main },
    ];

    return (
        <Box sx={{ flexGrow: 1, p: 2 }}>
            {/* Key Metrics Cards */}
            <Grid container spacing={1.5} mb={3}>
                <Grid item xs={6} sm={3}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            borderLeft: `4px solid`,
                            borderColor: 'primary.main'
                        }}
                    >
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 'bold' }}>Total Man-Days</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'primary.main', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}>{stats.totalPresentDays}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            borderLeft: `4px solid`,
                            borderColor: 'secondary.main'
                        }}
                    >
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 'bold' }}>Avg Work Hours</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'secondary.main', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}>{stats.avgDailyHours} h</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            borderLeft: `4px solid`,
                            borderColor: 'success.main'
                        }}
                    >
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 'bold' }}>Active Employees</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'success.main', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}>{stats.uniqueEmployees}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            borderLeft: `4px solid`,
                            borderColor: stats.totalPresentDays > 0 && (stats.totalLate / stats.totalPresentDays) > 0.2 ? 'warning.main' : 'info.main'
                        }}
                    >
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 'bold' }}>Zone Compliance</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{
                            color: stats.totalPresentDays > 0 && (stats.totalLate / stats.totalPresentDays) > 0.2 ? 'warning.main' : 'info.main',
                            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
                        }}>
                            {stats.verifiedCount + stats.unverifiedCount > 0
                                ? Math.round((stats.verifiedCount / (stats.verifiedCount + stats.unverifiedCount)) * 100)
                                : 0}%
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={3}>
                {/* 1. Daily Trends (Area + Line) */}
                <Grid item xs={12} md={8}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
                        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Workforce Activity Trends</Typography>
                            <Box height={320} width="100%">
                                <ResponsiveContainer>
                                    <AreaChart data={stats.dailyStats}>
                                        <defs>
                                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => dayjs(val).format('MMM DD')}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            label={{ value: 'Employees', angle: -90, position: 'insideLeft' }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            unit="h"
                                            label={{ value: 'Avg Hours', angle: 90, position: 'insideRight' }}
                                        />
                                        <Tooltip
                                            labelFormatter={(label) => dayjs(label).format('MMM DD, YYYY')}
                                        />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="present"
                                            stroke={theme.palette.primary.main}
                                            fillOpacity={1}
                                            fill="url(#colorPresent)"
                                            name="Headcount"
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="avgHours"
                                            stroke={theme.palette.secondary.main}
                                            strokeWidth={2}
                                            dot={false}
                                            name="Avg Hours"
                                        />
                                        <Legend verticalAlign="top" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 2. Distributions Column */}
                <Grid item xs={12} md={4}>
                    <Grid container spacing={3} direction="column">
                        {/* Zone Distribution */}
                        <Grid item xs={12}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom fontWeight="bold">Location Compliance</Typography>
                                    <Box height={200} width="100%">
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={zoneData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {zoneData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Punctuality Distribution */}
                        <Grid item xs={12}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom fontWeight="bold">Arrival Punctuality</Typography>
                                    <Box height={200} width="100%">
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={punctualityData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {punctualityData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};
