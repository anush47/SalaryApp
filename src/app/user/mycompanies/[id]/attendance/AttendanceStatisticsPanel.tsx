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
    CircularProgress
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
    AreaChart,
    Area
} from 'recharts';
import dayjs from 'dayjs';
import { DailyAttendanceRecord } from '@/app/hooks/useAttendanceAggregation';
import { Person, TrendingUp, WarningAmber, CheckCircleOutline } from '@mui/icons-material';

interface AttendanceStatisticsPanelProps {
    records: DailyAttendanceRecord[];
    loading: boolean;
    selectedEmployee?: any | null;
    shifts?: any[];
}

export const AttendanceStatisticsPanel: React.FC<AttendanceStatisticsPanelProps> = ({ records, loading, selectedEmployee, shifts = [] }) => {
    const theme = useTheme();

    const stats = useMemo(() => {
        if (!records || records.length === 0) return null;

        const uniqueEmployees = new Set<string>();
        const dailyAgg: Record<string, { date: string; present: number; totalOT: number; totalHours: number; lateCount: number }> = {};

        const employeeTotals: Record<string, { name: string; memberNo?: string; hours: number; lateCount: number; presentCount: number }> = {};

        let totalWorkedMinutes = 0;
        let totalOTMinutes = 0;
        let totalLate = 0;
        let totalVerified = 0;
        let totalUnverified = 0;
        let totalPresent = 0;

        records.forEach(r => {
            const date = r.date;
            const empId = r.employee?._id || 'unknown';
            uniqueEmployees.add(empId);

            if (!dailyAgg[date]) {
                dailyAgg[date] = { date, present: 0, totalOT: 0, totalHours: 0, lateCount: 0 };
            }

            if (r.status === 'Present') {
                totalPresent++;
                dailyAgg[date].present++;
                dailyAgg[date].totalHours += (r.durationMinutes / 60);
                dailyAgg[date].totalOT += (r.otMinutes / 60);
                totalWorkedMinutes += r.durationMinutes;
                totalOTMinutes += r.otMinutes;

                if (r.isLate) {
                    totalLate++;
                    dailyAgg[date].lateCount++;
                }

                // Compliance
                if (r.checkInLocation) {
                    // Assuming if there is location info, it was recorded. 
                    // In a real app we'd check isVerified flag if available in record.
                    // For now, let's use the raw log's behavior if we can link it.
                    // Since record doesn't have isVerified directly, we'll assume isVerified if no Warning flag.
                    if (!r.requiresAttention) totalVerified++;
                    else totalUnverified++;
                }
            }

            // Employee Leaderboard Logic
            if (empId !== 'unknown') {
                if (!employeeTotals[empId]) {
                    employeeTotals[empId] = {
                        name: r.employee?.name || 'Unknown',
                        memberNo: r.employee?.memberNo,
                        hours: 0,
                        lateCount: 0,
                        presentCount: 0
                    };
                }
                if (r.status === 'Present') {
                    employeeTotals[empId].hours += (r.durationMinutes / 60);
                    employeeTotals[empId].presentCount++;
                    if (r.isLate) employeeTotals[empId].lateCount++;
                }
            }
        });

        const sortedDays = Object.values(dailyAgg).sort((a, b) => a.date.localeCompare(b.date));
        const avgHours = totalPresent > 0 ? (totalWorkedMinutes / totalPresent / 60) : 0;

        // Leaderboards
        const mostProductive = Object.values(employeeTotals)
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);

        const mostPunctual = Object.values(employeeTotals)
            .filter(e => e.presentCount > 0)
            .sort((a, b) => (a.lateCount / a.presentCount) - (b.lateCount / b.presentCount) || b.presentCount - a.presentCount)
            .slice(0, 5);

        return {
            totalPresent,
            totalOT: Math.round(totalOTMinutes / 60),
            avgHours: Math.round(avgHours * 10) / 10,
            uniqueEmployees: uniqueEmployees.size,
            complianceRate: (totalVerified + totalUnverified > 0) ? Math.round((totalVerified / (totalVerified + totalUnverified)) * 100) : 100,
            lateRate: totalPresent > 0 ? Math.round((totalLate / totalPresent) * 100) : 0,
            dailyStats: sortedDays,
            mostProductive,
            mostPunctual,
            totalLate
        };
    }, [records]);

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

    const punctualityData = [
        { name: 'On Time', value: stats.totalPresent - stats.totalLate, color: theme.palette.success.main },
        { name: 'Late', value: stats.totalLate, color: theme.palette.warning.main },
    ];

    const StatCard = ({ title, value, unit, color, icon: Icon }: any) => (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid`, borderColor: `${color}.main`, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">{title}</Typography>
                    <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
                        {value} <Typography variant="caption" color="text.secondary">{unit}</Typography>
                    </Typography>
                </Box>
                <Icon sx={{ color: `${color}.light`, opacity: 0.5 }} />
            </Stack>
        </Paper>
    );

    const LeaderboardList = ({ title, data, type }: any) => (
        <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
            </Box>
            <Box sx={{ p: 0 }}>
                {data.map((emp: any, idx: number) => (
                    <Box key={idx}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: idx === 0 ? 'primary.main' : 'action.disabled' }}>
                                {idx + 1}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" fontWeight="medium">{emp.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {type === 'hours' ? `${Math.round(emp.hours)}h worked` : `${emp.lateCount} lates / ${emp.presentCount} days`}
                                </Typography>
                            </Box>
                        </Stack>
                        {idx < data.length - 1 && <Divider />}
                    </Box>
                ))}
            </Box>
        </Card>
    );

    return (
        <Box sx={{ p: 2 }}>
            {/* Top Metrics */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Total Present" value={stats.totalPresent} unit="Days" color="primary" icon={Person} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Avg Daily" value={stats.avgHours} unit="Hours" color="secondary" icon={TrendingUp} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Total OT" value={stats.totalOT} unit="Hours" color="success" icon={CheckCircleOutline} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Lateness" value={stats.lateRate} unit="%" color="warning" icon={WarningAmber} />
                </Grid>
            </Grid>

            {/* Trends */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={8}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Workforce & Overtime Trends</Typography>
                            <Box height={350}>
                                <ResponsiveContainer>
                                    <AreaChart data={stats.dailyStats}>
                                        <defs>
                                            <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.1} />
                                                <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => dayjs(val).format('DD MMM')}
                                            fontSize={12}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            axisLine={false}
                                            tickLine={false}
                                            fontSize={12}
                                            label={{ value: 'Headcount', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            axisLine={false}
                                            tickLine={false}
                                            fontSize={12}
                                            unit="h"
                                            label={{ value: 'Avg OT', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: theme.shadows[3] }}
                                            labelFormatter={(l) => dayjs(l).format('dddd, DD MMMM')}
                                        />
                                        <Area
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="totalOT"
                                            stroke={theme.palette.success.main}
                                            fillOpacity={1}
                                            fill="url(#colorOT)"
                                            name="Daily OT"
                                        />
                                        <Bar
                                            yAxisId="left"
                                            dataKey="present"
                                            fill={theme.palette.primary.main}
                                            radius={[4, 4, 0, 0]}
                                            barSize={20}
                                            name="Headcount"
                                        />
                                        <Legend verticalAlign="top" align="right" height={36} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Arrival Punctuality</Typography>
                            <Box height={250}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={punctualityData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {punctualityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                            <Stack spacing={1}>
                                {punctualityData.map((d, i) => (
                                    <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: d.color }} />
                                            <Typography variant="body2">{d.name}</Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight="bold">{d.value}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Leaderboards */}
            {!selectedEmployee && (
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <LeaderboardList title="Top Performers (Work Hours)" data={stats.mostProductive} type="hours" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <LeaderboardList title="Punctuality Champions" data={stats.mostPunctual} type="lateness" />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};
