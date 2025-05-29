"use client";
import React, { Suspense, lazy } from "react";
import { Box, Toolbar, LinearProgress, CircularProgress } from "@mui/material";
import "@fontsource/roboto/400.css";
import { Selected } from "./AdminNavContainer";

// Lazy load the components
const Users = lazy(() => import("../users/Users"));
const Calendar = lazy(() => import("../calendar/Calendar"));
// const Settings = lazy(() => import("../settings/settings"));
// const Payments = lazy(() => import("../payments/payments"));
// const Employees = lazy(() => import("../employees/employees"));
// const Purchases = lazy(() => import("../purchases/purchases"));
// const Salaries = lazy(() => import("../salaries/salaries"));

interface Props {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
  selected: Selected;
}

const AdminMainBox = ({ user, selected }: Props) => {
  const fallback = (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
    >
      <CircularProgress size={60} />
    </Box>
  );

  const RenderComponent = () => {
    // Simulate a delay
    return (
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh", // Full viewport height to center vertically
            }}
          >
            <CircularProgress size={80} /> {/* Adjust size as needed */}
          </div>
        }
      >
        {(() => {
          switch (selected) {
            case "users":
              return (
                <Suspense fallback={fallback}>
                  <Users user={user} />
                </Suspense>
              );
            case "calendar":
              return (
                <Suspense fallback={fallback}>
                  <Calendar user={user} />
                </Suspense>
              );
            default:
              return <div>Component not found</div>;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 0,
      }}
    >
      <Toolbar />
      <RenderComponent />
    </Box>
  );
};

export default AdminMainBox;
