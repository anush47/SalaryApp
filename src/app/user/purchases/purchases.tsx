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
import { Add, ArrowBack, Check, Edit } from "@mui/icons-material";
import { useSearchParams } from "next/navigation";
import UpdatePurchaseForm from "./updatePurchaseForm";

// Lazily load PurchasesDataGrid
const PurchasesDataGrid = lazy(() => import("./purchasesDataGrid"));

export let purchaseId: string | null;

const Purchases = ({
  user,
}: {
  user: { name: string; email: string; id: string };
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const searchParams = useSearchParams();
  purchaseId = searchParams ? searchParams.get("purchaseId") : null;
  const [isEditingPurchaseInHome, setIsEditingPurchaseInHome] = useState(false);

  const handleBackClick = () => {
    // Navigate back to the previous page
    window.history.back();
  };

  return (
    <Box>
      {purchaseId ? (
        <Card
          sx={{
            minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
            overflowY: "auto",
          }}
        >
          <UpdatePurchaseForm
            purchaseId={purchaseId}
            handleBackClick={handleBackClick}
          />
        </Card>
      ) : (
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
                  Purchases
                </Typography>
                <Tooltip title="Edit employees in home" arrow>
                  <IconButton
                    sx={{
                      marginLeft: 1,
                    }}
                    color="primary"
                    onClick={() =>
                      setIsEditingPurchaseInHome(!isEditingPurchaseInHome)
                    }
                  >
                    {isEditingPurchaseInHome ? <Check /> : <Edit />}
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
          <CardContent
            sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
          >
            <Suspense fallback={<CircularProgress />}>
              <PurchasesDataGrid
                user={user}
                isEditingPurchaseInHome={isEditingPurchaseInHome}
              />
            </Suspense>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Purchases;
