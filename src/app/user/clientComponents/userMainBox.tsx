"use client";
import React, { Suspense, lazy } from "react";
import { Box, Toolbar, CircularProgress } from "@mui/material";
import "@fontsource/roboto/400.css";
import { Selected } from "./NavContainer";

// Lazy load the components
const QuickTools = lazy(() => import("../quick/quick"));
const MyCompanies = lazy(() => import("../mycompanies/myCompanies"));
const Settings = lazy(() => import("../settings/settings"));
const Payments = lazy(() => import("../payments/payments"));
const Employees = lazy(() => import("../employees/employees"));
const Department = lazy(() => import("../departments/departments"));
const Purchases = lazy(() => import("../purchases/purchases"));
const Salaries = lazy(() => import("../salaries/salaries"));
// Employee components
const EmployeeDashboard = lazy(() => import("./employee/EmployeeDashboard"));
const EmployeeLeaves = lazy(() => import("./employee/EmployeeLeaves"));
const EmployeePayslips = lazy(() => import("./employee/EmployeePayslips"));
const EmployeeProfile = lazy(() => import("./employee/EmployeeProfile"));
const EmployeeAttendance = lazy(() => import("./employee/EmployeeAttendance"));
const TeamManagement = lazy(() => import("./employee/TeamManagement"));
const ProfileForm = lazy(() => import("./employer/ProfileForm"));
// Employer components
const EmployerDashboard = lazy(() => import("./employer/EmployerDashboard"));
const CompanyTaxSettings = lazy(() => import("./employer/CompanyTaxSettings"));

const UserMainBox = ({
  user,
  selected,
}: {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
  selected: Selected;
}) => {
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
    // Employer-only pages
    const employerOnlyPages = ["mycompanies", "employees", "departments", "salaries", "payments", "purchases", "employerDashboard", "taxSettings"];

    // If employee tries to access employer-only pages, show dashboard instead
    const effectiveSelected = (user.role === "employee" && employerOnlyPages.includes(selected))
      ? "dashboard"
      : selected;

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
          switch (effectiveSelected) {
            case "quick":
              return (
                <Suspense fallback={fallback}>
                  <QuickTools user={user} />
                </Suspense>
              );
            case "mycompanies":
              return (
                <Suspense fallback={fallback}>
                  <MyCompanies user={user} />
                </Suspense>
              );
            case "settings":
              return (
                <Suspense fallback={fallback}>
                  <Settings user={user} />
                </Suspense>
              );
            case "employees":
              return (
                <Suspense fallback={fallback}>
                  <Employees user={user} />
                </Suspense>
              );
            case "departments":
              return (
                <Suspense fallback={fallback}>
                  <Department user={user} />
                </Suspense>
              );
            case "purchases":
              return (
                <Suspense fallback={fallback}>
                  <Purchases user={user} />
                </Suspense>
              );
            case "salaries":
              return (
                <Suspense fallback={fallback}>
                  <Salaries user={user} />
                </Suspense>
              );
            case "payments":
              return (
                <Suspense fallback={fallback}>
                  <Payments user={user} />
                </Suspense>
              );
            // Employer Dashboard
            case "employerDashboard":
              return (
                <Suspense fallback={fallback}>
                  <EmployerDashboard user={user} />
                </Suspense>
              );
            // Tax Settings
            case "taxSettings":
              return (
                <Suspense fallback={fallback}>
                  <CompanyTaxSettings />
                </Suspense>
              );
            // Employee routes
            case "dashboard":
              return (
                <Suspense fallback={fallback}>
                  <EmployeeDashboard user={user} />
                </Suspense>
              );
            case "leaves":
              return (
                <Suspense fallback={fallback}>
                  <EmployeeLeaves user={user} />
                </Suspense>
              );
            case "payslips":
              return (
                <Suspense fallback={fallback}>
                  <EmployeePayslips user={user} />
                </Suspense>
              );
            case "profile":
              if (user.role === 'employee') {
                return (
                  <Suspense fallback={fallback}>
                    <EmployeeProfile user={user} />
                  </Suspense>
                );
              } else {
                return (
                  <Suspense fallback={fallback}>
                    <ProfileForm user={user} />
                  </Suspense>
                );
              }
            case "attendance":
              return (
                <Suspense fallback={fallback}>
                  <EmployeeAttendance user={user} />
                </Suspense>
              );
            case "teamManagement":
              return (
                <Suspense fallback={fallback}>
                  <TeamManagement user={user} />
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

export default UserMainBox;
