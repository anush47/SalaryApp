"use client";
import React, { Suspense, lazy, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  PendingActions,
  Category,
  BarChart,
} from "@mui/icons-material";

// Lazily load components
const LeaveRequestsManagement = lazy(
  () => import("./clientComponents/leaveRequestsManagement")
);
const LeaveTypesManagement = lazy(
  () => import("./clientComponents/leaveTypesManagement")
);
const LeaveStatistics = lazy(
  () => import("./clientComponents/leaveStatistics")
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leave-tabpanel-${index}`}
      aria-labelledby={`leave-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Leaves = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        <CardHeader
          title={
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <Typography variant="h4" component="h1">
                Leave Management
              </Typography>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="leave management tabs"
            >
              <Tab
                icon={<PendingActions />}
                label="Leave Requests"
                iconPosition="start"
              />
              <Tab
                icon={<Category />}
                label="Leave Types"
                iconPosition="start"
              />
              <Tab
                icon={<BarChart />}
                label="Statistics"
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Suspense fallback={<CircularProgress />}>
              <LeaveRequestsManagement user={user} companyId={companyId} />
            </Suspense>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Suspense fallback={<CircularProgress />}>
              <LeaveTypesManagement user={user} companyId={companyId} />
            </Suspense>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Suspense fallback={<CircularProgress />}>
              <LeaveStatistics user={user} companyId={companyId} />
            </Suspense>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Leaves;
