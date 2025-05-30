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
  ToggleButton,
  Switch,
  Menu,
  MenuItem,
} from "@mui/material";
import { Add, ArrowBack, MoreVert } from "@mui/icons-material";
import AddCompanyForm from "./clientComponents/AddCompany";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CompaniesCards = lazy(() => import("./clientComponents/companiesCards"));

// Lazily load CompaniesDataGrid
const CompaniesDataGrid = lazy(
  () => import("./clientComponents/companiesDataGrid")
);

const MyCompanies = ({
  user,
}: {
  user: { name: string; email: string; id: string; role: string };
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  //fetch query from url
  const searchParams = useSearchParams();
  const add = searchParams ? searchParams.get("add") : null;
  //open the form if gen is true
  useEffect(() => {
    if (add === "true") setIsAdding(true);
  }, [add]);

  return (
    <Box>
      {isAdding ? (
        <Card
          sx={{
            height: "91vh",
            overflowY: "auto",
          }}
        >
          <AddCompanyForm
            user={user}
            handleBackClick={() => {
              window.history.back();
            }}
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
                  Companies
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <>
                    <Tooltip title="Add Company" arrow>
                      <Link href={`user?userPageSelect=mycompanies&add=true`}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Add />}
                        >
                          Add Company
                        </Button>
                      </Link>
                    </Tooltip>
                    <IconButton
                      aria-label="more"
                      id="long-button"
                      aria-controls={open ? "long-menu" : undefined}
                      aria-expanded={open ? "true" : undefined}
                      aria-haspopup="true"
                      onClick={(event: React.MouseEvent<HTMLElement>) => {
                        setAnchorEl(event.currentTarget);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                    <Menu
                      id="long-menu"
                      MenuListProps={{
                        "aria-labelledby": "long-button",
                      }}
                      anchorEl={anchorEl}
                      open={open}
                      onClose={() => setAnchorEl(null)}
                      slotProps={{
                        paper: {
                          style: {
                            maxHeight: 48 * 4.5,
                            width: "25ch",
                          },
                        },
                      }}
                    >
                      <MenuItem onClick={() => setAnchorEl(null)}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <Typography variant="body1">Advanced View</Typography>
                          <Switch
                            checked={advanced}
                            onChange={() => setAdvanced(!advanced)}
                            color="primary"
                          />
                        </Box>
                      </MenuItem>
                      <MenuItem onClick={() => setAnchorEl(null)}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <Typography variant="body1">
                            Active Companies Only
                          </Typography>
                          <Switch
                            checked={showActiveOnly}
                            onChange={() => setShowActiveOnly(!showActiveOnly)}
                            color="primary"
                          />
                        </Box>
                      </MenuItem>
                    </Menu>
                  </>
                </Box>
              </Box>
            }
          />
          <CardContent
            sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
          >
            <Suspense fallback={<CircularProgress />}>
              {advanced ? (
                <CompaniesDataGrid
                  user={user}
                  showActiveOnly={showActiveOnly}
                />
              ) : (
                <CompaniesCards user={user} showActiveOnly={showActiveOnly} />
              )}
            </Suspense>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MyCompanies;
