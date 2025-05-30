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
const SalariesDataGrid = lazy(() => import("./salariesDataGrid"));
const AddSalaryForm = lazy(() => import("./generateSalaryForm"));
const EditSalaryForm = lazy(() => import("./editSalaryForm"));

export let salaryId: string | null;

const Salaries = ({
  user,
  companyId,
}: {
  user: { name: string; email: string; id: string };
  companyId: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  //fetch query from url
  const searchParams = useSearchParams();
  const gen = searchParams?.get("gen") || null;
  salaryId = searchParams?.get("salaryId") || null;

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
        {salaryId ? (
          <EditSalaryForm
            companyId={companyId}
            user={user}
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
                </Box>
              }
            />
            <CardContent
              sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
            >
              <Suspense fallback={<CircularProgress />}>
                <SalariesDataGrid
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

export default Salaries;
