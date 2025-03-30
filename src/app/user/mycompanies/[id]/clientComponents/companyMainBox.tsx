"use client";
import React, { Suspense, lazy } from "react";
import { Box, Toolbar, CircularProgress } from "@mui/material";
import "@fontsource/roboto/400.css";
import { Selected } from "./NavContainer";

// Lazy load the components
const CompanyDetails = lazy(() => import("../companyDetails/companyDetails"));
const Employees = lazy(() => import("../employees/employees"));
const QuickTools = lazy(() => import("../quick/quick"));
const Payments = lazy(() => import("../payments/payments"));
const Salaries = lazy(() => import("../salaries/salaries"));
const Purchases = lazy(() => import("../purchases/purchases"));
const Documents = lazy(() => import("../documents/documents"));

const CompanyMainBox = ({
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
    return (
      <Suspense fallback={fallback}>
        {(() => {
          switch (selected) {
            case "quick":
              return <QuickTools user={user} />;
            case "details":
              return <CompanyDetails user={user} />;
            case "employees":
              return <Employees user={user} />;
            case "payments":
              return <Payments user={user} />;
            case "salaries":
              return <Salaries user={user} />;
            case "purchases":
              return <Purchases user={user} />;
            case "documents":
              return <Documents user={user} />;
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
        minHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <Toolbar />
      <RenderComponent />
    </Box>
  );
};

export default CompanyMainBox;
