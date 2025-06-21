import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert, // Keep for general error display
  CircularProgress,
  Button,
  // Snackbar, // Removed
  Slide, // Keep if used for other transitions
  Chip,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers"; // DatePicker seems unused, consider removing
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"; // AdapterDayjs seems unused if DatePicker is unused
import Link from "next/link";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar

// Set dayjs format for consistency
dayjs.locale("en-gb");

export interface Purchase {
  id: string;
  period: string;
  company: string;
  approvedStatus: string;
}

const PurchasesDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  isEditingPurchaseInHome: boolean;
}> = ({ user, isEditingPurchaseInHome }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // For general error display
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  // const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false); // Removed
  // const [snackbarMessage, setSnackbarMessage] = useState<string>(""); // Removed
  // const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success"); // Removed

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
      //link to company details
      renderCell: (params) => (
        <Link
          href={`user/mycompanies/${
            //get companyId from purchases
            purchases.find((purchase) => purchase.id === params.id)?.company
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

  const handleRowUpdate = async (newPurchase: any) => {
    setError(null);

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

      // Update the state with the new purchase data
      setPurchases((prevPurchases) =>
        prevPurchases.map((purchase) =>
          purchase.id === newPurchase.id ? newPurchase : purchase
        )
      );

      // Success feedback
      // setSnackbarMessage(`Purchase updated successfully!`); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Purchase updated successfully!",
        severity: "success",
      });

      return newPurchase;
    } catch (error: any) {
      console.error("Error updating purchase:", error);
      // setSnackbarMessage(error.message || "Error updating purchase. Please try again."); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      // Let onProcessRowUpdateError handle the snackbar for errors thrown here.
      throw {
        // Re-throw for onProcessRowUpdateError
        message:
          error?.message || "An error occurred while updating the purchase.",
        error: error,
      };
    }
  };

  const handleRowUpdateError = (params: any) => {
    // Revert changes if necessary
    const updatedPurchases = purchases.map((purchase) => {
      if (purchase.id === params.id) {
        return params.oldRow; // Revert to old row data
      }
      return purchase;
    });

    // Log error and revert row updates
    console.error("Row update error:", params.error?.error || params.error);

    setPurchases(updatedPurchases); // Update state with reverted data

    // Display the error details in Snackbar
    // setSnackbarMessage(params.error?.message || "An unexpected error occurred."); // Removed
    // setSnackbarSeverity("error"); // Removed
    // setSnackbarOpen(true); // Removed
    showSnackbar({
      message: params.error?.message || "An unexpected error occurred.",
      severity: "error",
    });
  };

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);

        // Fetch purchases data
        const response = await fetch(`/api/purchases/?companyId=all`);
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
  }, [user]);

  // const handleSnackbarClose = ( // Removed
  //   event?: React.SyntheticEvent | Event,
  //   reason?: string
  // ) => {
  //   if (reason === "clickaway") {
  //     return;
  //   }
  //   setSnackbarOpen(false);
  // };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      _id: false,
      //company: false,
      companyEmployerNo: false,
      //periods: false,
      //price: false,
      request: false,
      remark: false,
    });

  return (
    <Box
      sx={{
        width: "100%",
        height: 400,
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
          editMode="row"
          sx={{
            height: "calc(100vh - 230px)",
          }}
          rows={purchases}
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
          pageSizeOptions={[5, 10]}
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
          //disableColumnFilter
          disableDensitySelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleRowUpdateError}
        />
      )}

      {/* Snackbar component removed, global one will be used */}
    </Box>
  );
};

export default PurchasesDataGrid;
