import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert,
  CircularProgress,
  Button,
  Typography,
} from "@mui/material";
import Link from "next/link";

export interface Company {
  shifts: any;
  id: string;
  name: string;
  employerNo: string;
  address: string;
  mode: string;
  active: boolean;
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
  monthlyPriceOverride: boolean;
  employerName: String;
  employerAddress: String;
  startedAt: Date | String;
  endedAt: Date | String;
  user: any;
  workingDays: {
    [key: string]: "full" | "half" | "off";
  };
  probabilities: {
    workOnHoliday: number;
    workOnOff: number;
    absent: number;
    late: number;
    ot: number;
  };
  openHours: {
    start: string;
    end: string;
    allDay: boolean;
  };
  paymentStructure: {
    additions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };
  calendar: "default" | "other";
}

const CompaniesDataGrid = ({
  user,
  showActiveOnly,
}: {
  user: { id: string; name: string; email: string; role: string };
  showActiveOnly: boolean;
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "employerNo", headerName: "Employer No", flex: 1 },
    {
      field: "noOfEmployees",
      headerName: "Employees",
      flex: 1,
    },
    { field: "address", headerName: "Address", flex: 1 },
    { field: "paymentMethod", headerName: "Payment Method", flex: 1 },

    { field: "active", headerName: "Active", flex: 1, type: "boolean" },
    { field: "mode", headerName: "Mode", flex: 1 },
    { field: "monthlyPrice", headerName: "Monthly Price", flex: 1 },
  ];

  if (user.role === "admin") {
    columns.push(
      { field: "userName", headerName: "User Name", flex: 1 },
      { field: "userEmail", headerName: "User Email", flex: 1 },
      {
        field: "monthlyPriceOverride",
        headerName: "Monthly Price Override",
        flex: 1,
        type: "boolean",
      }
    );
  }

  columns.push({
    field: "actions",
    headerName: "Actions",
    flex: 1,
    renderCell: (params) => (
      <Link href={`/user/mycompanies/${params.id}?companyPageSelect=quick`}>
        <Button variant="text">View</Button>
      </Link>
    ),
  });

  useEffect(() => {
    const fetchCompaniesAndUsers = async () => {
      try {
        setLoading(true);

        // Fetch companies
        const companiesResponse = await fetch(`/api/companies?needUsers=true`);
        if (!companiesResponse.ok) {
          throw new Error("Failed to fetch companies");
        }
        const companiesData = await companiesResponse.json();

        const companiesWithUserNames = companiesData.companies.map(
          (company: any) => ({
            ...company,
            id: company._id,
            userName: company.user.name,
            userEmail: company.user.email,
          })
        );

        setCompanies(companiesWithUserNames);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompaniesAndUsers();
  }, [user]);

  useEffect(() => {
    setFilteredCompanies(
      companies.filter((company) => {
        return !showActiveOnly || company.active;
      })
    );
  }, [companies, showActiveOnly]);

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      _id: false,
      address: false,
      userName: false,
      userEmail: false,
      paymentMethod: false,
      mode: false,
      monthlyPrice: false,
      monthlyPriceOverride: false,
    });

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 230px)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredCompanies.length > 0 ? (
        <DataGrid
          rows={filteredCompanies}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
            filter: {
              filterModel: {
                items: [],
                quickFilterExcludeHiddenColumns: false,
              },
            },
          }}
          pageSizeOptions={[5, 10, 20]}
          slots={{
            toolbar: (props) => (
              <GridToolbar
                {...props}
                csvOptions={{ disableToolbarButton: true }}
                printOptions={{ disableToolbarButton: true }}
              />
            ),
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          disableRowSelectionOnClick
          disableColumnFilter
          disableDensitySelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
        />
      ) : (
        <Box sx={{ textAlign: "left", mt: 4, mb: 4 }}>
          <Typography variant="h5" color="textSecondary">
            No companies to show 😟
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CompaniesDataGrid;
