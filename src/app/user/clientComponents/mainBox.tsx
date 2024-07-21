"use client";
import React, { Suspense, lazy } from "react";
import { Box, Toolbar, LinearProgress, CircularProgress } from "@mui/material";
import "@fontsource/roboto/400.css";
import { selected } from "./userSideBar";

// Lazy load the components
const Dashboard = lazy(() => import("../dashboard/dashboard"));
const MyCompanies = lazy(() => import("../mycompanies/myCompanies"));
const Settings = lazy(() => import("../settings/settings"));

const MainBox = ({
  user,
}: {
  user: { name: string; email: string; id: string };
}) => {
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
            case "dashboard":
              return <Dashboard user={user} />;
            case "mycompanies":
              return <MyCompanies user={user} />;
            case "settings":
              return <Settings user={user} />;
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
        p: 3,
      }}
    >
      <Toolbar />
      <RenderComponent />
    </Box>
  );
};

export default MainBox;
