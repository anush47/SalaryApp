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
  Dialog,
  DialogContent,
} from "@mui/material";
import { Add, Check, Edit } from "@mui/icons-material";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Lazily load SalariesDataGrid and AddSalaryForm
const PaymentsDataGrid = lazy(() => import("./paymentsDataGrid"));

export let paymentId: string | null;

const Payments = ({
  user,
}: {
  user: { name: string; email: string; id: string };
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  //fetch query from url
  const searchParams = useSearchParams();
  const gen = searchParams.get("gen");
  paymentId = searchParams.get("paymentId");

  //open the form if gen is true
  useEffect(() => {
    if (gen === "true") setShowAddForm(true);
  }, [gen]);

  return (
    <Box>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        <>
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
                  Payments
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
            sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
          >
            <Suspense fallback={<CircularProgress />}>
              <PaymentsDataGrid user={user} isEditing={isEditing} />
            </Suspense>
          </CardContent>
        </>
      </Card>
    </Box>
  );
};

export default Payments;
