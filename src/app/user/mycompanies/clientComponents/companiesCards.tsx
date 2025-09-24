import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  CircularProgress,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Chip,
  Stack,
  Typography,
  Tooltip,
  Alert,
} from "@mui/material";
import Link from "next/link";
import { Business, Cancel, People, Search } from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext"; // Import useSnackbar
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import {
  fetchCompany,
  fetchEmployees,
  fetchPurchased,
} from "../[id]/quick/quick";

export interface Company {
  shifts: any;
  _id: string;
  id: string;
  name: string;
  employerNo: string;
  address: string;
  mode: string;
  active: boolean;
  noOfEmployees: number;
  requiredDocs:
    | {
        epf: boolean;
        etf: boolean;
        salary: boolean;
        paySlip: boolean;
      }
    | undefined;
  paymentMethod: String;
  monthlyPrice: String;
  employerName: string;
  employerAddress: string;
  startedAt: Date | string;
  endedAt: Date | string;
  workingDays: {
    [key: string]: "full" | "half" | "off";
  };
  paymentStructure: {
    additions: {
      name: string;
      amount: string;
    }[];
    deductions: {
      name: string;
      amount: string;
    }[];
  };
}

const normalizeString = (str: string) =>
  str.replace(/[\s\W_]+/g, "").toLowerCase();

export const fetchCompanies = async (): Promise<Company[]> => {
  const companiesResponse = await fetch(`/api/companies`);
  if (!companiesResponse.ok) {
    throw new Error("Failed to fetch companies");
  }
  const companiesData = await companiesResponse.json();
  return companiesData.companies.map((company: any) => ({
    ...company,
    id: company._id,
  }));
};

const CompaniesCards = ({
  user,
  showActiveOnly,
}: {
  user: { id: string; name: string; email: string; role: string };
  showActiveOnly: boolean;
}) => {
  const { showSnackbar } = useSnackbar();

  const {
    data: companies,
    isLoading,
    isError,
    error,
  } = useQuery<Company[], Error>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (companies && companies.length === 1) {
      const companyId = companies[0]._id;
      const period = dayjs().subtract(1, "month").format("YYYY-MM");

      router.prefetch(
        `/user/mycompanies/${companyId}?companyPageSelect=quick`,
        {
          kind: PrefetchKind.FULL,
        }
      );

      queryClient.prefetchQuery({
        queryKey: ["companies", companyId],
        queryFn: () => fetchCompany(companyId),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });

      queryClient.prefetchQuery({
        queryKey: ["employees", companyId],
        queryFn: () => fetchEmployees(companyId),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });

      queryClient.prefetchQuery({
        queryKey: ["purchases", "check", companyId, period],
        queryFn: () => fetchPurchased(companyId, period),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    }
  }, [companies, router, queryClient]);

  useEffect(() => {
    if (companies) {
      setFilteredCompanies(
        companies.filter((company) => {
          return (
            (normalizeString(company.name).includes(
              normalizeString(searchQuery)
            ) ||
              normalizeString(company.employerNo).includes(
                normalizeString(searchQuery)
              ) ||
              normalizeString(company.employerName).includes(
                normalizeString(searchQuery)
              ) ||
              normalizeString(company.address).includes(
                normalizeString(searchQuery)
              )) &&
            (!showActiveOnly || company.active)
          );
        })
      );
    }
  }, [companies, searchQuery, showActiveOnly]);

  useEffect(() => {
    if (isError) {
      showSnackbar({
        message: error?.message || "An unexpected error occurred",
        severity: "error",
      });
    }
  }, [isError, error]);

  const totalCompanies = companies ? companies.length : 0;
  const activeCompanies = companies
    ? companies.filter((company) => company.active).length
    : 0;

  const CompanyCard = ({ company }: { company: Company }) => {
    return (
      <Tooltip title={company.name} placement="top" arrow>
        <Card
          sx={{
            height: "auto",
            borderRadius: 3,
            boxShadow: 1,

            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? company.active
                  ? "#f2f7ff"
                  : "#fff2f3"
                : company.active
                ? "#212326"
                : "#262122",
            transition: "transform 0.2s, background-color 0.2s",
            "&:hover": {
              transform: "scale(1.02)",
              boxShadow: 3,
            },
          }}
        >
          <CardHeader
            sx={{ pb: 0 }}
            avatar={<Business sx={{ fontSize: 25, color: "primary.main" }} />}
            title={
              <Typography
                variant="subtitle1"
                sx={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "text.primary",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: {
                    xs: "200px",
                    sm: "250px",
                    md: "100px",
                    lg: "200px",
                    xl: "300px",
                  },
                }}
              >
                {company.name}
              </Typography>
            }
          />
          <CardContent>
            <Stack spacing={0.5}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "500", color: "text.secondary" }}
                >
                  Employer No: {company.employerNo}
                </Typography>
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <People sx={{ fontSize: 18, color: "primary.main" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {company.noOfEmployees}
                  </Typography>
                </Box>
                {!company.active && (
                  <Chip
                    icon={<Cancel sx={{ color: "error.main" }} />}
                    label="Inactive"
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Tooltip>
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "400",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "400",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || "An unexpected error occurred"}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "400",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <>
        {totalCompanies > 1 && (
          <>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
              <TextField
                label="Search Companies..."
                variant="filled"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <Search sx={{ color: "action.active", mr: 1, my: 0.5 }} />
                  ),
                }}
              />
            </Box>
            <Box display="flex" gap={1} mb={2}>
              <Chip
                label={`Total: ${totalCompanies}`}
                color="primary"
                variant="outlined"
              />
              {totalCompanies !== activeCompanies && (
                <Chip
                  label={`Active: ${activeCompanies}`}
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
          </>
        )}
        {filteredCompanies.length > 0 ? (
          <Grid container spacing={2}>
            {filteredCompanies.map((company) => (
              <Grid item xs={12} sm={6} md={4} key={company._id}>
                <Link
                  href={`/user/mycompanies/${company._id}?companyPageSelect=quick`}
                >
                  <CompanyCard company={company} />
                </Link>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: "left", mt: 4, mb: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Typography variant="h5" color="textSecondary">
                No companies to show 😟
              </Typography>
            </motion.div>
          </Box>
        )}
      </>
    </Box>
  );
};

export default CompaniesCards;
