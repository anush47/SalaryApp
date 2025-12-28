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
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Done, Edit, AccountTree, TableChart } from "@mui/icons-material";

// Lazily load components
const DepartmentsDataGrid = lazy(
  () => import("./clientComponents/departmentsDataGrid")
);
const DepartmentHierarchy = lazy(
  () => import("./clientComponents/DepartmentHierarchy")
);

const Department = ({
  user,
}: {
  user: { name: string; email: string; id: string; role: string };
}) => {
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "hierarchy">("hierarchy");

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
                Departments
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => {
                    if (newMode !== null) {
                      setViewMode(newMode);
                      if (newMode === "hierarchy") {
                        setIsEditingDepartment(false);
                      }
                    }
                  }}
                  size="small"
                >
                  <ToggleButton value="hierarchy" aria-label="hierarchy view">
                    <Tooltip title="Hierarchy View" arrow>
                      <AccountTree />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="table" aria-label="table view">
                    <Tooltip title="Table View" arrow>
                      <TableChart />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>

                {viewMode === "table" && (
                  <>
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
                  </>
                )}
              </Box>
            </Box>
          }
        />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          <Suspense fallback={<CircularProgress />}>
            {viewMode === "hierarchy" ? (
              <DepartmentHierarchy user={user} />
            ) : (
              <DepartmentsDataGrid
                user={user}
                isEditingDepartment={isEditingDepartment}
              />
            )}
          </Suspense>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Department;
