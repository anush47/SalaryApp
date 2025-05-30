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
import { Add, ArrowBack, Cancel, Check, Done, Edit } from "@mui/icons-material";
import { useSearchParams } from "next/navigation";

// Lazily load CompaniesDataGrid
const EmployeesDataGrid = lazy(
  () => import("./clientComponents/employeesDataGrid")
);

export let employeeId: string | null;

const MyCompanies = ({
  user,
}: {
  user: { name: string; email: string; id: string; role: string };
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingEmployeeInHome, setIsEditingEmployeeInHome] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const searchParams = useSearchParams();
  employeeId = searchParams.get("employeeId");

  return (
    <Box>
      <Card
        //set height to viewport height and make scrollable only on larger screens
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
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    sx={{ mx: 0.25 }}
                    onClick={() => setIsEditingEmployeeInHome(true)}
                  >
                    Edit
                  </Button>
                )}
              </Box>
            </Box>
          }
        />
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
    </Box>
  );
};

export default MyCompanies;
