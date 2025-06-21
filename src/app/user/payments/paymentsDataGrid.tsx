import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert, // Keep for general error display
  CircularProgress,
  Button,
  // Snackbar, // Removed
  Slide, // Keep Slide if used for other transitions
  Chip,
  Dialog,
  DialogTitle,
  DialogContentText,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Link from "next/link";
// import { request } from "http"; // This import seems unused, consider removing if not needed.
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar

// Set dayjs format for consistency
dayjs.locale("en-gb");

export interface Payment {
  id: string;
  _id: string;
  companyName: string;
  companyEmployerNo: string;
  companyPaymentMethod: string;
  period: string;
  company: string;
  epfReferenceNo: string;
  epfAmount: number;
  epfSurcharges: number;
  epfPaymentMethod: string;
  epfChequeNo: string;
  epfPayDay: string;
  etfAmount: number;
  etfSurcharges: number;
  etfPaymentMethod: string;
  etfChequeNo: string;
  etfPayDay: string;
}

export const ddmmyyyy_to_mmddyyyy = (ddmmyyyy: string) => {
  if (ddmmyyyy === null) {
    return "";
  }
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${mm}-${dd}-${yyyy}`;
};

const PaymentsDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  isEditing: boolean;
  period?: string;
}> = ({ user, isEditing, period }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // For general error display
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  // const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false); // Removed
  // const [snackbarMessage, setSnackbarMessage] = useState<string>(""); // Removed
  // const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success"); // Removed
  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);

  const columns: GridColDef[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1,
      renderCell: (params) => {
        return (
          <Link
            href={`/user/mycompanies/${
              //find companyId from payments
              payments.find((payment) => payment.id === params.id)?.company
            }`}
          >
            <Button
              variant="text"
              color="primary"
              size="small"
              onClick={() => {
                console.log(params);
              }}
            >
              {params.value}
            </Button>
          </Link>
        );
      },
    },
    {
      field: "companyEmployerNo",
      headerName: "Employer No.",
      flex: 1,
    },
    {
      field: "period",
      headerName: "Period",
      flex: 1,
      renderCell: (params) => {
        return (
          <Chip
            label={params.value}
            color="primary"
            sx={{
              m: 0.2,
              textTransform: "capitalize",
            }}
          />
        );
      },
    },
    {
      field: "epfReferenceNo",
      headerName: "EPF Ref No.",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: isEditing,
    },
    {
      field: "epfAmount",
      type: "number",
      headerName: "EPF Amount",
      flex: 1,
    },
    {
      field: "epfSurcharges",
      headerName: "EPF Surcharges",
      type: "number",
      editable: isEditing,
      flex: 1,
    },
    {
      field: "epfPaymentMethod",
      headerName: "EPF Payment Method",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "epfChequeNo",
      headerName: "EPF Cheque No.",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "epfPayDay",
      headerName: "EPF Pay Day",
      flex: 1,
      editable: isEditing,
      valueGetter: (params) => {
        // Ensure the date is formatted correctly for display
        return params;
      },
      renderEditCell: (params) => (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            label="EPF Paid Day"
            openTo="day"
            views={["year", "month", "day"]}
            value={dayjs(params.value)}
            onChange={(newDate) => {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: newDate ? newDate.format("YYYY-MM-DD") : null,
              });
            }}
            slotProps={{
              field: { clearable: true },
            }}
          />
        </LocalizationProvider>
      ),
    },
    {
      field: "etfAmount",
      headerName: "ETF Amount",
      flex: 1,
    },
    {
      field: "etfSurcharges",
      headerName: "ETF Surcharges",
      type: "number",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "etfPaymentMethod",
      headerName: "ETF Payment Method",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "etfChequeNo",
      headerName: "ETF Cheque No.",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "etfPayDay",
      headerName: "ETF Pay Day",
      flex: 1,
      editable: isEditing,
      valueGetter: (params) => {
        // Ensure the date is formatted correctly for display
        return params;
      },
      renderEditCell: (params) => (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            label="ETF Paid Day"
            openTo="day"
            views={["year", "month", "day"]}
            value={dayjs(params.value)}
            onChange={(newDate) => {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: newDate ? newDate.format("YYYY-MM-DD") : null,
              });
            }}
            slotProps={{
              field: { clearable: true },
            }}
          />
        </LocalizationProvider>
      ),
    },
    {
      field: "remark",
      headerName: "Remark",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => {
        return (
          <Link
            href={`/user/mycompanies/${
              payments.find((payment) => {
                return payment.id === params.id;
              })?.company
            }?companyPageSelect=payments&paymentId=${params.id}`}
          >
            <Button variant="text" color="primary" size="small">
              View
            </Button>
          </Link>
        );
      },
    },
  ];

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        let url = `/api/payments/?companyId=all`;
        if (period) {
          url += `&period=${period}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch payments");
        }
        const data = await response.json();
        const paymentsWithId = data.payments.map((payment: any) => ({
          ...payment,
          id: payment._id,
        }));
        setPayments(paymentsWithId);
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

    fetchPayments();
  }, [user, period]); // Added period to dependencies as it's used in fetch URL

  // const handleSnackbarClose = ( // Removed
  //   event?: React.SyntheticEvent | Event,
  //   reason?: string
  // ) => {
  //   if (reason === "clickaway") {
  //     return;
  //   }
  //   setSnackbarOpen(false);
  // };

  const handleRowUpdate = async (newPayment: any) => {
    try {
      console.log(newPayment);
      const response = await fetch(`/api/payments/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payment: newPayment }),
      });
      if (!response.ok) {
        // throw new Error("Failed to update payment"); // This will be caught by onProcessRowUpdateError
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update payment");
      }
      // setSnackbarMessage("Payment updated successfully"); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Payment updated successfully",
        severity: "success",
      });
      return newPayment;
    } catch (error) {
      console.error("Row update error:", error);
      // setSnackbarMessage(error instanceof Error ? error.message : "An unexpected error occurred"); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      // Let onProcessRowUpdateError handle the snackbar for errors thrown here.
      throw error; // Re-throw to be caught by onProcessRowUpdateError
    }
  };

  const handleRowUpdateError = (params: any) => {
    // Revert changes if necessary
    const updatedPayments = payments.map((payment) => {
      if (payment.id === params.id) {
        return params.oldRow; // Revert to old row data
      }
      return payment;
    });

    // Log error and revert row updates
    console.error("Row update error:", params.error?.error || params.error);

    setPayments(updatedPayments); // Update state with reverted data

    // Display the error details in Snackbar
    // setSnackbarMessage(params.error?.message || "An unexpected error occurred."); // Removed
    // setSnackbarSeverity("error"); // Removed
    // setSnackbarOpen(true); // Removed
    showSnackbar({
      message: params.error?.message || "An unexpected error occurred.",
      severity: "error",
    });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryIds, setSalaryIds] = useState<string[]>([]);

  const onDeleteClick = async (paymentIds: string[]) => {
    try {
      setLoading(true);
      // Perform DELETE request to delete the salary record
      const response = await fetch(`/api/payments/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIds: paymentIds,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to delete payments");
      }
      // setSnackbarMessage("Payments deleted successfully"); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Payments deleted successfully",
        severity: "success",
      });
      setPayments(
        payments.filter((payment) => !paymentIds.includes(payment.id))
      );
    } catch (error) {
      console.error("Delete error:", error);
      // setSnackbarMessage(error instanceof Error ? error.message : "An unexpected error occurred"); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    setSalaryIds(rowSelectionModel as string[]);
    setDialogOpen(true);
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      // Perform the delete action here
      console.log(`Deleting salary record`);
      await onDeleteClick(salaryIds);
    }
    setDialogOpen(false);
  };

  interface ConfirmationDialogProps {
    open: boolean;
    onClose: (confirmed: boolean) => void;
    title: string;
    message: string;
  }

  const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onClose,
    title,
    message,
  }) => {
    const handleConfirm = () => {
      onClose(true);
    };

    const handleCancel = () => {
      onClose(false);
    };

    return (
      <Dialog open={open} onClose={() => onClose(false)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="primary">
            Cancel
          </Button>
          <LoadingButton
            onClick={handleConfirm}
            color="primary"
            loading={loading}
          >
            Confirm
          </LoadingButton>
        </DialogActions>
      </Dialog>
    );
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      companyName: true,
      companyEmployerNo: false,
      companyPaymentMethod: false,
      period: true,
      company: false,
      epfReferenceNo: true,
      epfAmount: false,
      etfAmount: false,
      epfPaymentMethod: false,
      etfPaymentMethod: false,
      epfChequeNo: false,
      etfChequeNo: false,
    });

  return (
    <Box
      sx={{
        width: "100%",
        height: period ? 250 : "calc(100vh - 230px)",
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
        <div>
          {isEditing && rowSelectionModel.length > 0 && (
            <Button
              sx={{
                mb: 1,
              }}
              variant="outlined"
              color="error"
              onClick={deleteSelected}
            >
              Delete Selected
            </Button>
          )}
          <DataGrid
            rows={payments}
            columns={columns}
            editMode="row"
            sx={{
              height: "calc(100vh - 230px)",
            }}
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
            onRowSelectionModelChange={(newModel) =>
              setRowSelectionModel(newModel)
            }
            checkboxSelection={isEditing}
            processRowUpdate={handleRowUpdate}
            onProcessRowUpdateError={handleRowUpdateError}
          />
        </div>
      )}

      <ConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the payment record(s) ?`}
      />

      {/* Snackbar component removed, global one will be used */}
    </Box>
  );
};

export default PaymentsDataGrid;
