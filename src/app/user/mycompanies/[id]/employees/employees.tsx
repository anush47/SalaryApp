"use client";
import React, { Suspense, lazy, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tooltip,
  Button,
  Box,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
  Slide,
} from "@mui/material";
import { Add, Check, Edit } from "@mui/icons-material";
import AddEmployeeForm from "./clientComponents/AddEmployee";
import EditEmployeeForm from "./clientComponents/EditEmployee";
import ABH from "./clientComponents/ABH";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { companyId } from "../clientComponents/NavContainer";

const EmployeesDataGrid = lazy(
  () => import("./clientComponents/employeesDataGrid")
);

export let employeeId: string | null;

const Employees = ({
  user,
}: {
  user: { name: string; email: string; id: string; role: string };
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAbh, setABH] = useState(false);
  const [isEditingEmployeeInHome, setIsEditingEmployeeInHome] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const searchParams = useSearchParams();
  employeeId = searchParams?.get("employeeId") || null;
  const add = searchParams?.get("add") || null;
  const abh = searchParams?.get("abh") || null;

  const handleBackClick = () => window.history.back();

  useEffect(() => {
    if (add) setIsAdding(true);
    else if (abh) setABH(true);
    else if (employeeId) setIsEditing(true);
  }, [employeeId, add, abh]);

  const Header = () => (
    <CardHeader
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant={isSmallScreen ? "h5" : "h4"} gutterBottom>
            Employees
            {isEditingEmployeeInHome ? (
              <IconButton
                sx={{ marginLeft: 1 }}
                color="success"
                onClick={() => setIsEditingEmployeeInHome(false)}
              >
                <Check />
              </IconButton>
            ) : (
              <Tooltip title="Edit employees in home" arrow>
                <IconButton
                  sx={{ marginLeft: 1 }}
                  color="primary"
                  onClick={() => setIsEditingEmployeeInHome(true)}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
          </Typography>
          <Tooltip title="Add a new employee" arrow>
            <Link
              href={`/user/mycompanies/${companyId}?companyPageSelect=employees&add=true`}
            >
              <Button variant="outlined" color="primary" startIcon={<Add />}>
                Add
              </Button>
            </Link>
          </Tooltip>
        </Box>
      }
    />
  );

  const AddEmployeeCard = () => (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
      <AddEmployeeForm user={user} handleBackClick={handleBackClick} />
    </Card>
  );

  const EditEmployeeCard = () => (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
      <EditEmployeeForm
        user={user}
        handleBackClick={handleBackClick}
        employeeId={employeeId}
      />
    </Card>
  );

  const ABHCard = () => (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
      <ABH
        user={user}
        handleBackClick={handleBackClick}
        employeeId={employeeId}
      />
    </Card>
  );

  const EmployeesCard = () => (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
      <Header />
      <CardContent
        sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
      >
        <Suspense fallback={<CircularProgress />}>
          <EmployeesDataGrid
            user={user}
            isEditingEmployeeInHome={isEditingEmployeeInHome}
          />
        </Suspense>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {isAdding ? (
        <AddEmployeeCard />
      ) : isAbh ? (
        <ABHCard />
      ) : isEditing ? (
        <EditEmployeeCard />
      ) : (
        <EmployeesCard />
      )}
    </Box>
  );
};

export default Employees;
