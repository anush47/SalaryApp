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
  companyId,
}: {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
  selected: Selected;
  companyId: string;
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
              return <QuickTools user={user} companyId={companyId} />;
            case "details":
              return <CompanyDetails user={user} companyId={companyId} />;
            case "employees":
              return <Employees user={user} companyId={companyId} />;
            case "payments":
              return <Payments user={user} companyId={companyId} />;
            case "salaries":
              return <Salaries user={user} companyId={companyId} />;
            case "purchases":
              return <Purchases user={user} companyId={companyId} />;
            case "documents":
              return <Documents user={user} companyId={companyId} />;
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
