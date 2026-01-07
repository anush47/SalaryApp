"use client";
import React, { useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    CircularProgress,
    Tabs,
    Tab,
    Paper,
    Divider,
    Stack,
    Chip,
    Button,
} from "@mui/material";
import {
    Groups,
    PendingActions,
    Rule,
    CheckCircle,
    EventBusy,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployees, fetchManagerDashboard } from "@/app/lib/api/employeeApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { UnifiedAttendancePanel } from "@/app/user/mycompanies/[id]/attendance/UnifiedAttendancePanel";
import LeaveRequestsManagement from "@/app/user/mycompanies/[id]/leaves/clientComponents/leaveRequestsManagement";
import { AttendanceStatisticsPanel } from "@/app/user/mycompanies/[id]/attendance/AttendanceStatisticsPanel";
import dayjs from "dayjs";

interface TeamManagementProps {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        image: string;
    };
}

const TeamManagement: React.FC<TeamManagementProps> = ({ user }) => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

    // 1. Fetch Employee Record to get Manager ID and Company ID
    const { data: employee, isLoading: loadingEmployee } = useQuery({
        queryKey: ["employee", user.id],
        queryFn: async () => {
            const employees = await fetchEmployees({ user: user.id });
            return employees[0];
        },
    });

    const employeeId = employee?._id;
    const companyId = employee?.company?._id;

    // 2. Fetch Team Data
    const { data: managerData, isLoading: loadingManager } = useQuery({
        queryKey: ["managerDashboard", employeeId],
        queryFn: () => fetchManagerDashboard(employeeId),
        enabled: !!employeeId,
    });

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    if (loadingEmployee || loadingManager) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (!employee) {
        return (
            <Box p={3}>
                <Typography color="error">Employee profile not found.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold">Team Management</Typography>
                <Typography variant="body2" color="text.secondary">
                    Overview and administration for your reporting team.
                </Typography>
            </Box>

            <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab icon={<Groups sx={{ fontSize: 20 }} />} iconPosition="start" label="Overview" />
                    <Tab icon={<PendingActions sx={{ fontSize: 20 }} />} iconPosition="start" label="Attendance" />
                    <Tab icon={<Rule sx={{ fontSize: 20 }} />} iconPosition="start" label="Leaves" />
                </Tabs>
            </Paper>

            {tabValue === 0 && (
                <Grid container spacing={3}>
                    {/* Quick Stats */}
                    <Grid item xs={12}>
                        <Grid container spacing={2}>
                            {[
                                { label: "Total Team", val: managerData?.team?.total || 0, icon: Groups, color: "primary" },
                                { label: "Pending Leaves", val: managerData?.leaves?.totalPending || 0, icon: EventBusy, color: "warning" },
                                { label: "Pending Attendance", val: managerData?.attendance?.totalPending || 0, icon: PendingActions, color: "info" },
                                { label: "Approved (Recent)", val: managerData?.leaves?.approved?.length || 0, icon: CheckCircle, color: "success" },
                            ].map((stat, idx) => {
                                const Icon = stat.icon;
                                return (
                                    <Grid item xs={6} sm={3} key={idx}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                borderLeft: `4px solid`,
                                                borderColor: `${stat.color}.main`,
                                                textAlign: "center"
                                            }}
                                        >
                                            <Icon sx={{ color: `${stat.color}.main`, mb: 1 }} />
                                            <Typography variant="h4" fontWeight="bold">{stat.val}</Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">{stat.label}</Typography>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Grid>

                    {/* Detailed Statistics Panel */}
                    <Grid item xs={12}>
                        <AttendanceStatisticsPanel
                            records={[]} // Can be used for team-wide aggregation if needed
                            loading={loadingManager}
                            shifts={[]}
                        />
                    </Grid>
                </Grid>
            )}

            {tabValue === 1 && (
                <UnifiedAttendancePanel
                    companyId={companyId}
                    startDate={dayjs().startOf("month")}
                    endDate={dayjs().endOf("month")}
                    selectedEmployee={selectedEmployee}
                    setSelectedEmployee={setSelectedEmployee}
                />
            )}

            {tabValue === 2 && (
                <LeaveRequestsManagement
                    user={user}
                    companyId={companyId}
                    mode="pending-approvals"
                />
            )}
        </Box>
    );
};

export default TeamManagement;
