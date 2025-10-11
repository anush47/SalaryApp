"use client";
import React, { Suspense, lazy, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tooltip,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import { Done, Edit } from "@mui/icons-material";

// Lazily load DepartmentsDataGrid
const DepartmentsDataGrid = lazy(
  () => import("./clientComponents/departmentsDataGrid")
);

const Organization = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);

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
                Organization
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isEditingDepartment ? (
                  <Tooltip title="Save changes" arrow>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Done />}
                      onClick={() => setIsEditingDepartment(false)}
                    >
                      Done
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    sx={{ mx: 0.25 }}
                    onClick={() => setIsEditingDepartment(true)}
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
            <DepartmentsDataGrid
              user={user}
              companyId={companyId}
              isEditingDepartment={isEditingDepartment}
            />
          </Suspense>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Organization;
