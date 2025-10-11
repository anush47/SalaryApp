import React from "react";
import { useQuery } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
} from "@mui/material";
import {
  PendingActions,
  CheckCircle,
  Cancel,
  TrendingUp,
} from "@mui/icons-material";

interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  totalDaysRequested: number;
  totalDaysApproved: number;
  byLeaveType: {
    leaveType: string;
    count: number;
    totalDays: number;
  }[];
}

// Fetch leave statistics
const fetchLeaveStatistics = async (
  companyId: string
): Promise<LeaveStatistics> => {
  const response = await fetch(`/api/leave-requests?companyId=${companyId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch leave statistics");
  }
  const data = await response.json();
  const leaveRequests = data.leaveRequests || [];

  // Calculate statistics
  const stats: LeaveStatistics = {
    totalRequests: leaveRequests.length,
    pendingRequests: leaveRequests.filter((r: any) => r.status === "pending")
      .length,
    approvedRequests: leaveRequests.filter((r: any) => r.status === "approved")
      .length,
    rejectedRequests: leaveRequests.filter((r: any) => r.status === "rejected")
      .length,
    cancelledRequests: leaveRequests.filter(
      (r: any) => r.status === "cancelled"
    ).length,
    totalDaysRequested: leaveRequests.reduce(
      (sum: number, r: any) => sum + (r.totalDays || 0),
      0
    ),
    totalDaysApproved: leaveRequests
      .filter((r: any) => r.status === "approved")
      .reduce((sum: number, r: any) => sum + (r.totalDays || 0), 0),
    byLeaveType: [],
  };

  // Group by leave type
  const byType: Record<string, { count: number; totalDays: number }> = {};
  leaveRequests.forEach((r: any) => {
    const typeName = r.leaveType?.name || "Unknown";
    if (!byType[typeName]) {
      byType[typeName] = { count: 0, totalDays: 0 };
    }
    byType[typeName].count++;
    if (r.status === "approved") {
      byType[typeName].totalDays += r.totalDays || 0;
    }
  });

  stats.byLeaveType = Object.entries(byType).map(([leaveType, data]) => ({
    leaveType,
    count: data.count,
    totalDays: data.totalDays,
  }));

  return stats;
};

const LeaveStatistics: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
}> = ({ user, companyId }) => {
  const {
    data: statistics,
    isLoading,
    isError,
    error,
  } = useQuery<LeaveStatistics, Error>({
    queryKey: ["leaveStatistics", companyId],
    queryFn: () => fetchLeaveStatistics(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          minHeight: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || "An unexpected error occurred"}
        </Alert>
      </Box>
    );
  }

  if (!statistics) {
    return <Alert severity="info">No statistics available</Alert>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "#fff3e0",
            }}
          >
            <PendingActions sx={{ fontSize: 48, color: "#ff9800", mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {statistics.pendingRequests}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Pending Requests
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "#e8f5e9",
            }}
          >
            <CheckCircle sx={{ fontSize: 48, color: "#4caf50", mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {statistics.approvedRequests}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Approved Requests
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "#ffebee",
            }}
          >
            <Cancel sx={{ fontSize: 48, color: "#f44336", mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {statistics.rejectedRequests}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Rejected Requests
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "#e3f2fd",
            }}
          >
            <TrendingUp sx={{ fontSize: 48, color: "#2196f3", mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {statistics.totalRequests}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Requests
            </Typography>
          </Paper>
        </Grid>

        {/* Days Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Days Summary
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "#f5f5f5",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Total Days Requested
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {statistics.totalDaysRequested} days
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "#e8f5e9",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Total Days Approved
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {statistics.totalDaysApproved} days
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* By Leave Type */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Requests by Type
              </Typography>
              <Box sx={{ mt: 2 }}>
                {statistics.byLeaveType.length === 0 ? (
                  <Alert severity="info">No leave requests found</Alert>
                ) : (
                  <Grid container spacing={2}>
                    {statistics.byLeaveType.map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item.leaveType}>
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            borderLeft: 4,
                            borderColor: "primary.main",
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight="bold">
                            {item.leaveType}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {item.count} request(s)
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            {item.totalDays} days approved
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeaveStatistics;
