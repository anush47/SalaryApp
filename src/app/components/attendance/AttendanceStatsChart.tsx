import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';

interface AttendanceStatsChartProps {
    data: any[];
    height?: number;
    title?: string;
}

const AttendanceStatsChart: React.FC<AttendanceStatsChartProps> = ({ data, height = 300, title }) => {
    const theme = useTheme();

    const chartData = useMemo(() => {
        return data.map((record) => {
            const totalHours = (record.durationMinutes || 0) / 60;
            const otHours = (record.otMinutes || 0) / 60;
            const regularHours = Math.max(0, totalHours - otHours);

            return {
                date: dayjs(record.date).format('MMM DD'),
                fullDate: record.date,
                regular: Number(regularHours.toFixed(1)),
                ot: Number(otHours.toFixed(1)),
                total: Number(totalHours.toFixed(1)),
            };
        }).sort((a, b) => dayjs(a.fullDate).valueOf() - dayjs(b.fullDate).valueOf());
    }, [data]);

    if (chartData.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height={height} bgcolor="action.hover" borderRadius={2}>
                <Typography variant="body2" color="text.secondary">No attendance data to display</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: height }}>
            {title && (
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {title}
                </Typography>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    />
                    <Tooltip
                        cursor={{ fill: theme.palette.action.hover }}
                        contentStyle={{
                            borderRadius: 8,
                            border: 'none',
                            boxShadow: theme.shadows[3],
                            fontSize: '12px'
                        }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar
                        dataKey="regular"
                        name="Regular Hours"
                        stackId="a"
                        fill={theme.palette.primary.main}
                        radius={[0, 0, 0, 0]}
                        barSize={20}
                    />
                    <Bar
                        dataKey="ot"
                        name="OT Hours"
                        stackId="a"
                        fill={theme.palette.success.main}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                    />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default AttendanceStatsChart;
