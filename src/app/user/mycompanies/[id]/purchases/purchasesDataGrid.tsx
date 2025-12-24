import React from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import { Box, Alert, CircularProgress, Button, Chip, Typography } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import Link from "next/link";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse } from "@/app/lib/types";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

dayjs.locale("en-gb");

export interface Purchase {
  id: string;
  period: string;
  company: string;
  approvedStatus: string;
}

import { fetchPurchases } from "@/app/lib/api";

import { FileViewer } from "@/app/components/FileViewer";

const fetchPurchasesData = async (
  companyId: string,
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResponse> => {
  const data: any = await fetchPurchases({ companyId, page, limit, search });

  let purchases = [];
  let total = 0;

  if (data.data && Array.isArray(data.data)) {
    purchases = data.data;
    total = data.total || 0;
  } else if (data.purchases) {
    purchases = data.purchases;
    total = data.total || purchases.length;
  }

  const formattedPurchases = purchases.map((purchase: any) => ({
    ...purchase,
    id: purchase._id,
    attachmentKey: purchase.attachmentKey,
    price: `${purchase.periods?.length || 0} x ${purchase.price?.toLocaleString() || "0"
      } = ${purchase.totalPrice?.toLocaleString() || "0"}`,
  }));

  return {
    data: formattedPurchases,
    pagination: {
      page: data.page || page,
      limit: data.limit || limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: false,
      hasPrevPage: false
    }
  };
};

const PurchasesDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  companyId: string;
}> = ({ user, companyId }) => {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Pagination state
  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: 10,
  });

  // Filter state for server-side search
  const [filterModel, setFilterModel] = React.useState<any>({
    items: [],
    quickFilterValues: [],
  });

  const searchQuery = filterModel.quickFilterValues?.join(" ") || undefined;

  const {
    data: paginatedResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery<PaginatedResponse, Error>({
    queryKey: ["purchases", companyId, paginationModel.page, paginationModel.pageSize, searchQuery],
    queryFn: () => fetchPurchasesData(companyId, paginationModel.page + 1, paginationModel.pageSize, searchQuery),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
  });

  const purchases = paginatedResponse?.data || [];
  const rowCount = paginatedResponse?.pagination?.total || 0;

  const handleRowUpdate = async (newPurchase: any) => {
    const payload = {
      _id: newPurchase.id,
      approvedStatus: newPurchase.approvedStatus,
      remark: newPurchase.remark,
    };

    try {
      const response = await fetch(`/api/purchases`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Error updating purchase. Please try again."
        );
      }
      queryClient.invalidateQueries({ queryKey: ["purchases", companyId] });
      showSnackbar({
        message: "Purchase updated successfully!",
        severity: "success",
      });

      return newPurchase;
    } catch (error: any) {
      throw {
        message:
          error?.message || "An error occurred while updating the purchase.",
        error: error,
      };
    }
  };

  const handleRowUpdateError = (params: any) => {
    showSnackbar({
      message: params.error?.message || "An unexpected error occurred.",
      severity: "error",
    });
  };

  const columns: GridColDef[] = [
    {
      field: "companyEmployerNo",
      headerName: "Employer No",
      flex: 1,
    },
    {
      field: "companyName",
      headerName: "Company",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`/user/mycompanies/${purchases?.find((purchase) => purchase.id === params.id)?.company
            }?companyPageSelect=details`}
        >
          <Button variant="text">{params.value}</Button>
        </Link>
      ),
    },
    {
      field: "periods",
      headerName: "Period",
      flex: 1,
      renderCell: (params) => {
        const values = params.value;
        if (values) {
          return (
            <div>
              {values.map((value: any) => (
                <Chip
                  key={value}
                  label={value}
                  color="primary"
                  sx={{
                    m: 0.2,
                    textTransform: "capitalize",
                  }}
                />
              ))}
            </div>
          );
        }
        return null;
      },
    },
    {
      field: "price",
      headerName: "Price",
      flex: 1,
      align: "left",
      headerAlign: "left",
    },
    {
      field: "request",
      headerName: "Request",
      flex: 1,
      type: "boolean",
    },
    {
      field: "requestDay",
      headerName: "Request Day",
      flex: 1,
    },
    {
      field: "attachmentKey",
      headerName: "Proof",
      flex: 1,
      renderCell: (params) => {
        if (!params.value) return <Typography variant="caption" color="text.secondary">No Proof</Typography>;
        return <FileViewer fileKey={params.value} filename="Proof" showPreview={false} />;
      },
    },
    {
      field: "approvedStatus",
      headerName: "Status",
      flex: 1,
      type: "singleSelect",
      valueOptions: ["approved", "pending", "rejected"],
      renderCell: (params) => {
        const status = params.value;
        let chipColor: "success" | "warning" | "error" = "success";
        if (status === "pending") {
          chipColor = "warning";
        } else if (status === "rejected") {
          chipColor = "error";
        }
        return (
          <Chip
            label={status}
            color={chipColor}
            sx={{ fontWeight: "bold", textTransform: "capitalize" }}
          />
        );
      },
    },
    {
      field: "remark",
      headerName: "Remarks",
      flex: 1,
      type: "string",
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`/user/mycompanies/${companyId}?companyPageSelect=purchases&purchaseId=${params.id}`}
        >
          <Button variant="text">View</Button>
        </Link>
      ),
    },
  ];

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      _id: false,
      company: false,
      companyEmployerNo: false,
      companyName: false,
      request: false,
      remark: false,
    });

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          minHeight: "200px",
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
          justifyContent: "center",
          alignItems: "center",
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
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ width: '100%' }}>
        <DataGrid
          rows={purchases || []}
          columns={columns}
          getRowId={(row) => row.id}
          editMode="row"
          sx={{
            height: "calc(100vh - 230px)",
          }}
          rowCount={rowCount}
          loading={isLoading || isFetching}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 20]}
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={(newModel) => setFilterModel(newModel)}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              csvOptions: { disableToolbarButton: true },
              printOptions: { disableToolbarButton: true },
            },
          }}
          disableRowSelectionOnClick
          disableDensitySelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleRowUpdateError}
        />
      </div>
    </Box>
  );
};

export default PurchasesDataGrid;
