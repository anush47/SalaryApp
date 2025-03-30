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
  Snackbar,
  Slide,
  Chip,
} from "@mui/material";
import { companyId } from "../clientComponents/companySideBar";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Link from "next/link";
import { request } from "http";

// Set dayjs format for consistency
dayjs.locale("en-gb");

export interface Purchase {
  id: string;
  period: string;
  company: string;
}

const PurchasesDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
}> = ({ user }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );

  const columns: GridColDef[] = [
    {
      field: "periods",
      headerName: "Periods",
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
      type: "number",
      align: "left",
      headerAlign: "left",
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
  ];

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/purchases/?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch purchases");
        }
        const data = await response.json();
        const purchasesWithId = data.purchases.map((purchase: any) => ({
          ...purchase,
          id: purchase._id,
          price: `${purchase.periods.length} x ${
            purchase.price?.toLocaleString() || "0"
          } = ${purchase.totalPrice?.toLocaleString() || "0"}`,
        }));
        setPurchases(purchasesWithId);
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

    fetchPurchases();
  }, [user, companyId]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      request: false,
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
      {loading && <CircularProgress />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!loading && !error && (
        <DataGrid
          rows={purchases}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
          }}
          pageSizeOptions={[5]}
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
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        //TransitionComponent={(props) => <Slide {...props} direction="up" />}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchasesDataGrid;
