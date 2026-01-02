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
  Tabs,
  Tab,
} from "@mui/material";
import { Add, Check, Done, Edit } from "@mui/icons-material";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Lazily load SalariesDataGrid and AddSalaryForm
const SalariesDataGrid = lazy(() => import("./salariesDataGrid"));
const AddSalaryForm = lazy(() => import("./generateSalaryForm"));
const EditSalaryForm = lazy(() => import("./editSalaryForm"));

import { SalaryPayments } from "./SalaryPayments";
import { SalaryAdvances } from "./SalaryAdvances";

export let salaryId: string | null;

const Salaries = ({
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
  const gen = searchParams?.get("gen") || null;
  salaryId = searchParams?.get("salaryId") || null;

  //open the form if gen is true
  useEffect(() => {
    if (gen === "true") setShowAddForm(true);
  }, [gen]);

  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        {salaryId ? (
          <EditSalaryForm
            companyId={companyId}
            user={user}
            salaryId={salaryId}
            handleBackClick={() => {
              //go back in browser
              window.history.back();
            }}
          />
        ) : showAddForm ? (
          <div>
            <AddSalaryForm
              companyId={companyId}
              user={user}
              handleBackClick={() => {
                //go back in browser
                window.history.back();
              }}
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
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h4" component="h1">
                      Salaries & Payments
                    </Typography>
                  </Box>

                  {tabValue === 0 && (
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
                              href={`/user/mycompanies/${companyId}?companyPageSelect=salaries&gen=true`}
                            >
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Add />}
                              >
                                Generate
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
                  )}
                </Box>
              }
              subheader={
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mt: 1 }}>
                  <Tab label="All Salaries" />
                  <Tab label="Payments" />
                  <Tab label="Advances" />

                </Tabs>
              }
            />
            <CardContent
              sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
            >
              <Suspense fallback={<CircularProgress />}>
                {tabValue === 0 && (
                  <SalariesDataGrid
                    companyId={companyId}
                    user={user}
                    isEditing={isEditing}
                  />
                )}
                {tabValue === 1 && (
                  <SalaryPayments
                    companyId={companyId}
                    user={user}
                  />
                )}
                {tabValue === 2 && (
                  <SalaryAdvances
                    companyId={companyId}
                    user={user}
                  />
                )}

              </Suspense>
            </CardContent>
          </>
        )}
      </Card>
    </Box>
  );
};

export default Salaries;
