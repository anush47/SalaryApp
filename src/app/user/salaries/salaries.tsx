"use client";
import React, { Suspense, lazy, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tooltip,
  Box,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
} from "@mui/material";
import { Check, Done, Edit } from "@mui/icons-material";

// Lazily load SalariesDataGrid and AddSalaryForm
const SalariesDataGrid = lazy(() => import("./salariesDataGrid"));

export let salaryId: string | null;

const Salaries = ({
  user,
}: {
  user: { name: string; email: string; id: string };
}) => {
  const [isEditing, setIsEditing] = useState(false);

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
                Salaries
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isEditing ? (
                  <Tooltip title="Save changes" arrow>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Done />}
                      onClick={() => setIsEditing(false)}
                    >
                      Done
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    sx={{ mx: 0.25 }}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
              </Box>
            </Box>
          }
        />
        <CardContent
          sx={{
            maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" },
          }}
        >
          <Suspense fallback={<CircularProgress />}>
            <SalariesDataGrid user={user} isEditing={isEditing} />
          </Suspense>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Salaries;
