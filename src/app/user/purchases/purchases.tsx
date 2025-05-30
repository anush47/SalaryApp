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
import { Add, ArrowBack, Check, Done, Edit } from "@mui/icons-material";
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
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                }}
              >
                <Typography variant="h4" component="h1">
                  Purchases
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {isEditingPurchaseInHome ? (
                    <Tooltip title="Save changes" arrow>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Done />}
                        onClick={() => setIsEditingPurchaseInHome(false)}
                      >
                        Done
                      </Button>
                    </Tooltip>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      sx={{ mx: 0.25 }}
                      onClick={() => setIsEditingPurchaseInHome(true)}
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
