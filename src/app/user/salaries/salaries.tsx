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
} from "@mui/material";
import { Check, Edit } from "@mui/icons-material";

// Lazily load SalariesDataGrid and AddSalaryForm
const SalariesDataGrid = lazy(() => import("./salariesDataGrid"));

export let salaryId: string | null;

const Salaries = ({
  user,
}: {
  user: { name: string; email: string; id: string };
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
                alignItems: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <Typography variant={isSmallScreen ? "h5" : "h4"} gutterBottom>
                Salaries
                {isEditing ? (
                  <IconButton
                    sx={{
                      marginLeft: 1,
                    }}
                    color="success"
                    onClick={() => setIsEditing(false)}
                  >
                    <Check />
                  </IconButton>
                ) : (
                  <Tooltip title="Edit salaries" arrow>
                    <IconButton
                      sx={{
                        marginLeft: 1,
                      }}
                      color="primary"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                )}
              </Typography>
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
