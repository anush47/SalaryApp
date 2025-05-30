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
} from "@mui/material";
import { Add, Check, Done, Edit } from "@mui/icons-material";
import AddEmployeeForm from "./clientComponents/AddEmployee";
import EditEmployeeForm from "./clientComponents/EditEmployee";
import AH from "./clientComponents/AH";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const EmployeesDataGrid = lazy(
  () => import("./clientComponents/employeesDataGrid")
);

export let employeeId: string | null;

const Employees = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAh, setAH] = useState(false);
  const [isEditingEmployeeInHome, setIsEditingEmployeeInHome] = useState(false);

  const searchParams = useSearchParams();
  employeeId = searchParams?.get("employeeId") || null;
  const add = searchParams?.get("add") || null;
  const ah = searchParams?.get("ah") || null;

  const handleBackClick = () => window.history.back();

  useEffect(() => {
    if (add) setIsAdding(true);
    else if (ah) setAH(true);
    else if (employeeId) setIsEditing(true);
  }, [employeeId, add, ah]);

  const Header = () => (
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
            Employees
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isEditingEmployeeInHome ? (
              <Tooltip title="Save changes" arrow>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Done />}
                  onClick={() => setIsEditingEmployeeInHome(false)}
                >
                  Done
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Add a new employee" arrow>
                  <Link
                    href={`/user/mycompanies/${companyId}?companyPageSelect=employees&add=true`}
                  >
                    <Button
                      sx={{ mx: 0.25 }}
                      variant="contained"
                      color="primary"
                      startIcon={<Add />}
                    >
                      Add Employee
                    </Button>
                  </Link>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  sx={{ mx: 0.25 }}
                  onClick={() => setIsEditingEmployeeInHome(true)}
                >
                  Edit
                </Button>
              </>
            )}
          </Box>
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
      <AddEmployeeForm
        companyId={companyId}
        user={user}
        handleBackClick={handleBackClick}
      />
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
        companyId={companyId}
      />
    </Card>
  );

  const AHCard = () => (
    <Card
      sx={{
        minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
        overflowY: "auto",
      }}
    >
      <AH
        companyId={companyId}
        user={user}
        handleBackClick={handleBackClick}
        employeeId={employeeId}
      />
    </Card>
  );

  return (
    <Box>
      {isAdding ? (
        <AddEmployeeCard />
      ) : isAh ? (
        <AHCard />
      ) : isEditing ? (
        <EditEmployeeCard />
      ) : (
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
                companyId={companyId}
                user={user}
                isEditingEmployeeInHome={isEditingEmployeeInHome}
              />
            </Suspense>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Employees;
