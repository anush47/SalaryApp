import React from "react";
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
  Chip,
} from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import Link from "next/link";
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

dayjs.locale("en-gb");

export interface Purchase {
  id: string;
  period: string;
  company: string;
  approvedStatus: string;
}

const fetchPurchases = async (): Promise<Purchase[]> => {
  const response = await fetch(`/api/purchases/?companyId=all`);
  if (!response.ok) {
    throw new Error("Failed to fetch purchases");
  }
  const data = await response.json();
  return data.purchases.map((purchase: any) => ({
    ...purchase,
    id: purchase._id,
    price: `${purchase.periods.length} x ${
      purchase.price?.toLocaleString() || "0"
    } = ${purchase.totalPrice?.toLocaleString() || "0"}`,
  }));
};

const PurchasesDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  isEditingPurchaseInHome: boolean;
}> = ({ user, isEditingPurchaseInHome }) => {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const {
    data: purchases,
    isLoading,
    isError,
    error,
  } = useQuery<Purchase[], Error>({
    queryKey: ["purchases"],
    queryFn: fetchPurchases,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

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
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
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
          href={`user/mycompanies/${
            purchases?.find((purchase) => purchase.id === params.id)?.company
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
      field: "approvedStatus",
      headerName: "Status",
      flex: 1,
      type: "singleSelect",
      valueOptions: ["approved", "pending", "rejected"],
      editable: isEditingPurchaseInHome,
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
      editable: isEditingPurchaseInHome,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Link href={`user?userPageSelect=purchases&purchaseId=${params.id}`}>
          <Button variant="text">View</Button>
        </Link>
      ),
    },
  ];

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      _id: false,
      companyEmployerNo: false,
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
        height: "calc(100vh - 230px)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <DataGrid
        editMode="row"
        sx={{
          height: "calc(100vh - 230px)",
        }}
        rows={purchases || []}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 20,
            },
          },
          filter: {
            filterModel: {
              items: [],
              quickFilterExcludeHiddenColumns: false,
            },
          },
        }}
        pageSizeOptions={[10, 20, 50]}
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
        disableDensitySelector
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(newModel) =>
          setColumnVisibilityModel(newModel)
        }
        processRowUpdate={handleRowUpdate}
        onProcessRowUpdateError={handleRowUpdateError}
      />
    </Box>
  );
};

export default PurchasesDataGrid;
