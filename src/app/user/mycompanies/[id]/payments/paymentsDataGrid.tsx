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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { companyId } from "../clientComponents/companySideBar";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Link from "next/link";
import { request } from "http";
import { LoadingButton } from "@mui/lab";

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
  remark: string;
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
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );

  const columns: GridColDef[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1,
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
                value: newDate ? newDate.format("YYYY-MM-DD") : "",
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
                value: newDate ? newDate.format("YYYY-MM-DD") : "",
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
      field: "delete",
      headerName: "Delete",
      flex: 1,
      renderCell: (params) => {
        return (
          <Button
            variant="text"
            color="error"
            disabled={!isEditing}
            onClick={() => {
              handleDeleteClick(params.id.toString());
            }}
          >
            Delete
          </Button>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => {
        return (
          <Link
            href={`/user/mycompanies/${companyId}?companyPageSelect=payments&paymentId=${params.id}`}
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
        let url = `/api/payments/?companyId=${companyId}`;
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
        throw new Error("Failed to update payment");
      }
      setSnackbarMessage("Payment updated successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      return newPayment;
    } catch (error) {
      console.error("Row update error:", error);
      setSnackbarMessage(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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
    setSnackbarMessage(
      params.error?.message || "An unexpected error occurred." // Show detailed error message
    );
    setSnackbarSeverity("error"); // Set snackbar severity to error
    setSnackbarOpen(true); // Open Snackbar
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | undefined>(undefined);

  const onDeleteClick = async (id: string) => {
    try {
      setLoading(true);
      // Perform DELETE request to delete the salary record
      const response = await fetch(`/api/payments/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIds: [deleteId],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to delete payments");
      }
      setSnackbarMessage("Payments deleted successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setPayments(payments.filter((payment) => payment.id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      setSnackbarMessage(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (delId: string) => {
    setDialogOpen(true);
    setDeleteId(delId);
  };

  const handleDialogClose = async (confirm: boolean) => {
    if (confirm && deleteId) {
      // Perform the delete action here
      console.log(`Deleting salary record`);
      await onDeleteClick(deleteId);
    }
    setDialogOpen(false);
    setDeleteId(undefined);
  };

  interface ConfirmationDialogProps {
    open: boolean;
    onClose: (confirm: boolean) => void;
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
      companyName: false,
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
        <DataGrid
          rows={payments}
          columns={columns}
          editMode="row"
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
            filter: {
              filterModel: {
                items: [],
                quickFilterExcludeHiddenColumns: false,
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
          disableDensitySelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleRowUpdateError}
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
      <ConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the salary record(s) ?`}
      />
    </Box>
  );
};

export default PaymentsDataGrid;
