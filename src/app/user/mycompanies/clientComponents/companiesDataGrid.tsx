import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  CircularProgress,
  Button,
  Typography,
  Alert,
} from "@mui/material";
import Link from "next/link";
import { useSnackbar } from "@/app/context/SnackbarContext"; // Import useSnackbar
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

export interface Company {
  shiftSettings: {
    mode: "fixed" | "dynamic" | "roster" | "manual";
    shifts: {
      _id?: string;
      name: string;
      type: "fixed" | "dynamic";
      startTime?: string;
      endTime?: string;
      duration?: number;
      breakDuration: number;
      minStartTime?: string;
      maxStartTime?: string;
      minEndTime?: string;
      maxEndTime?: string;
      maxDuration?: number;
    }[];
    defaultShiftId?: string;
    autoSelect: boolean;
  };
  id: string;
  _id: string;
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
    mon: "full" | "half" | "off";
    tue: "full" | "half" | "off";
    wed: "full" | "half" | "off";
    thu: "full" | "half" | "off";
    fri: "full" | "half" | "off";
    sat: "full" | "half" | "off";
    sun: "full" | "half" | "off";
    isDynamicHolidays: boolean;
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
  attendanceConfig: {
    enabled: boolean;
    features: {
      pwaCheckIn: boolean;
      hardwareIntegration: boolean;
      salaryIntegration: boolean;
    };
  };
  geoFencing: {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    enforceValidation: boolean;
    allowedLocations?: {
      lat: number;
      lng: number;
      radius: number;
      name: string;
    }[];
  };
  allowRemoteCheckIn: boolean;
  requireApproval: boolean;
  apiKey?: string;
  // Salary Period Configuration (Company Defaults)
  salaryPeriodDefaults?: {
    salaryPeriod: "daily" | "weekly" | "bi-weekly" | "monthly" | "custom";
    customPeriodDays?: number;
    rateDivisor: number;
    dailyRateOverride?: number;
    weeklyRateOverride?: number;
    monthlyRateOverride?: number;
    payPeriodConfig?: {
      startDay?: number;
      endDay?: number;
      type?: "fixed_dates" | "start_to_end_of_month" | "end_to_end_of_month";
    };
    calculationMethod: "attendance" | "fixed_days" | "no_ot";
  };
}

interface PaginatedResponse {
  data: Company[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const fetchCompanies = async (paginationModel: { page: number; pageSize: number }): Promise<PaginatedResponse> => {
  const { page, pageSize } = paginationModel;
  const companiesResponse = await fetch(
    `/api/companies?needUsers=true&page=${page + 1}&limit=${pageSize}`
  ); // API uses 1-based indexing
  if (!companiesResponse.ok) {
    const errorData = await companiesResponse.json();
    throw new Error(errorData.error?.message || errorData.message || "Failed to fetch companies");
  }
  const companiesData = await companiesResponse.json();

  // Handle the new API response structure
  if (companiesData.success) {
    const companyList = companiesData.data?.data || companiesData.data || companiesData.companies || [];
    const paginationInfo = companiesData.data?.pagination || companiesData.pagination;

    return {
      data: companyList.map((company: any) => ({
        ...company,
        id: company._id,
        userName: company.user?.name,
        userEmail: company.user?.email,
      })),
      page: paginationInfo?.page || companiesData.page || 1,
      limit: paginationInfo?.limit || companiesData.limit || pageSize,
      total: paginationInfo?.total || companiesData.total || 0,
      pages: paginationInfo?.totalPages || companiesData.pages || 0,
    };
  } else {
    throw new Error(companiesData.error?.message || "Failed to fetch companies");
  }
};

const CompaniesDataGrid = ({
  user,
  showActiveOnly,
}: {
  user: { id: string; name: string; email: string; role: string };
  showActiveOnly: boolean;
}) => {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: 10,
  });
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [total, setTotal] = React.useState(0);

  const { data, isError, error, isSuccess } = useQuery<PaginatedResponse, Error, PaginatedResponse, (string | { page: number; pageSize: number; })[]>(
    {
      queryKey: ["companies", paginationModel],
      queryFn: () => fetchCompanies(paginationModel),
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
      enabled: true,
    }
  );

  useEffect(() => {
    if (isSuccess && data) {
      const filtered = showActiveOnly
        ? data.data.filter((company) => company.active)
        : data.data;

      setCompanies(filtered);
      setTotal(data.total);
    }
  }, [isSuccess, data, showActiveOnly]);

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

  if (isError) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "calc(100vh - 230px)",
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
        height: "calc(100vh - 230px)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <DataGrid
        rows={companies}
        columns={columns}
        getRowId={(row) => row._id} // Explicitly tell DataGrid to use _id as the row ID
        rowCount={total}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 20]}
        loading={loading}
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
    </Box>
  );
};

export default CompaniesDataGrid;
