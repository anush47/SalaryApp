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
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useSearchParams } from "next/navigation";
import NewPurchaseForm from "./newPurchaseForm";
import Link from "next/link";

// Lazily load PurchasesDataGrid
const PurchasesDataGrid = lazy(() => import("./purchasesDataGrid"));

export let purchaseId: string | null;
export let newPurchase: string | null;

const Purchases = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const searchParams = useSearchParams();
  purchaseId = searchParams?.get("purchaseId") || null;
  newPurchase = searchParams?.get("newPurchase") || null;

  const handleBackClick = () => {
    //go back
    window.history.back();
  };

  useEffect(() => {
    if (newPurchase === "true") {
      setIsAdding(true);
    }
  }, [newPurchase]);

  return (
    <Box>
      {isAdding ? (
        <Card
          sx={{
            minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
            overflowY: "auto",
          }}
        >
          <NewPurchaseForm
            handleBackClick={handleBackClick}
            companyId={companyId}
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
                  <Tooltip title="New Purchase" arrow>
                    <Link
                      href={`/user/mycompanies/${companyId}?companyPageSelect=purchases&newPurchase=true`}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                      >
                        New Purchase
                      </Button>
                    </Link>
                  </Tooltip>
                </Box>
              </Box>
            }
          />
          <CardContent
            sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
          >
            <Suspense fallback={<CircularProgress />}>
              <PurchasesDataGrid companyId={companyId} user={user} />
            </Suspense>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Purchases;
