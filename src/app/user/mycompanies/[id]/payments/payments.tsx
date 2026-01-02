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

// Lazily load EPF and ETF components from the salaries folder (where they currently reside)
const EpfPayments = lazy(() => import("../salaries/EpfPayments").then(module => ({ default: module.EpfPayments })));
const EtfPayments = lazy(() => import("../salaries/EtfPayments").then(module => ({ default: module.EtfPayments })));

const Payments = ({
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
                Fund Payments
              </Typography>
            </Box>
          }
          subheader={
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mt: 1 }}>
              <Tab label="EPF Payments" />
              <Tab label="ETF Payments" />
            </Tabs>
          }
        />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          <Suspense fallback={<CircularProgress />}>
            {tabValue === 0 && (
              <EpfPayments
                companyId={companyId}
                user={user}
              />
            )}
            {tabValue === 1 && (
              <EtfPayments
                companyId={companyId}
                user={user}
              />
            )}
          </Suspense>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Payments;
