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
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Lazily load SalariesDataGrid and AddSalaryForm
const PaymentsDataGrid = lazy(() => import("./paymentsDataGrid"));
const NewPaymentForm = lazy(() => import("./newPaymentForm"));
const EditPaymentForm = lazy(() => import("./editPaymentForm"));

export let paymentId: string | null;

const Payments = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string; role: string };
  companyId: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  //fetch query from url
  const searchParams = useSearchParams();
  const gen = searchParams ? searchParams.get("gen") : null;
  paymentId = searchParams ? searchParams.get("paymentId") : null;

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
        {paymentId ? (
          <EditPaymentForm
            companyId={companyId}
            user={user}
            handleBackClick={() => {
              //go back in browser
              window.history.back();
            }}
          />
        ) : showAddForm ? (
          <div>
            <NewPaymentForm
              companyId={companyId}
              handleBackClick={() => {
                //go back in browser
                window.history.back();
              }}
              user={user}
            />
          </div>
        ) : (
          <>
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
                    EPF/ETF Payments
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
                      <>
                        <Tooltip title="Generate Salaries" arrow>
                          <Link
                            href={`/user/mycompanies/${companyId}?companyPageSelect=payments&gen=true`}
                          >
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<Add />}
                            >
                              New Payment
                            </Button>
                          </Link>
                        </Tooltip>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          sx={{ mx: 0.25 }}
                          onClick={() => setIsEditing(true)}
                        >
                          Edit
                        </Button>
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
                <PaymentsDataGrid
                  companyId={companyId}
                  user={user}
                  isEditing={isEditing}
                />
              </Suspense>
            </CardContent>
          </>
        )}
      </Card>
    </Box>
  );
};

export default Payments;
