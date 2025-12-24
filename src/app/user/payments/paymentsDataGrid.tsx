import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse } from "@/app/lib/types";
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
import { useSnackbar } from "@/app/context/SnackbarContext"; // Import useSnackbar
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

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

import {
  fetchPayments,
  updatePayment,
  deletePayments,
} from "@/app/lib/api/paymentApi";

// ... (imports)

// ... (Payment interface and helper functions)

const PaymentsDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  isEditing: boolean;
  period?: string;
}> = ({ user, isEditing, period }) => {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  // Filter state for server-side search
  const [filterModel, setFilterModel] = useState<any>({
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
    queryKey: ["payments", paginationModel.page, paginationModel.pageSize, searchQuery, period],
    queryFn: async () => {
      const data: any = await fetchPayments({
        period,
        companyId: 'all',
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery
      });
      // Handle the API response structure explicitly for this grid
      let payments = [];
      let total = 0;

      if (data.data && Array.isArray(data.data)) {
        payments = data.data;
        total = data.total || 0;
      } else if (Array.isArray(data)) { // Fallback for pure array response
        payments = data;
        total = data.length;
      }

      const formattedPayments = payments.map((payment: any) => ({
        ...payment,
        id: payment._id,
      }));

      return {
        data: formattedPayments,
        pagination: {
          page: data.page || 1,
          limit: data.limit || paginationModel.pageSize,
          total: total,
          totalPages: Math.ceil(total / paginationModel.pageSize),
          hasNextPage: false, // Calculated from total
          hasPrevPage: false
        }
      } as PaginatedResponse;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
  });

  const payments = paginatedResponse?.data || [];
  const rowCount = paginatedResponse?.pagination?.total || 0;
  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);

  // ... (columns definition)
  const columns: GridColDef[] = [
    {
      field: "companyName",
      headerName: "Company Name",
      width: 200,
      renderCell: (params) => {
        return (
          <Link
            href={`/user/mycompanies/${params.row.company}?companyPageSelect=details`}
          >
            <Button variant="text" color="primary" size="small">
              {params.value}
            </Button>
          </Link>
        );
      },
    },
    { field: "companyEmployerNo", headerName: "Employer No", width: 150 },
    { field: "period", headerName: "Period", width: 120 },
    { field: "epfReferenceNo", headerName: "EPF Ref No", width: 150, editable: isEditing },
    { field: "epfAmount", headerName: "EPF Amount", width: 130, valueFormatter: (value: any) => value?.toLocaleString(), editable: isEditing },
    { field: "etfAmount", headerName: "ETF Amount", width: 130, valueFormatter: (value: any) => value?.toLocaleString(), editable: isEditing },
    { field: "epfPaymentMethod", headerName: "EPF Method", width: 130, editable: isEditing },
    { field: "etfPaymentMethod", headerName: "ETF Method", width: 130, editable: isEditing },
    {
      field: "epfPayDay", headerName: "EPF Paid Date", width: 150, type: "date",
      valueGetter: (value: any) => value && new Date(value),
      editable: isEditing
    },
    {
      field: "etfPayDay", headerName: "ETF Paid Date", width: 150, type: "date",
      valueGetter: (value: any) => value && new Date(value),
      editable: isEditing
    },
    { field: "epfChequeNo", headerName: "EPF Cheque No", width: 150, editable: isEditing },
    { field: "etfChequeNo", headerName: "ETF Cheque No", width: 150, editable: isEditing },
  ];

  const handleRowUpdate = async (newPayment: any) => {
    try {
      const result = await updatePayment(newPayment);
      showSnackbar({
        message: "Payment updated successfully",
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      return newPayment;
    } catch (error) {
      throw error; // Re-throw to be caught by onProcessRowUpdateError
    }
  };

  const handleRowUpdateError = (params: any) => {
    // Revert changes if necessary
    const updatedPayments = payments?.map((payment) => {
      if (payment.id === params.id) {
        return params.oldRow; // Revert to old row data
      }
      return payment;
    });
    showSnackbar({
      message: params.error?.message || "An unexpected error occurred.",
      severity: "error",
    });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryIds, setSalaryIds] = useState<string[]>([]);

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentIds: string[]) => {
      const result = await deletePayments(paymentIds);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      showSnackbar({
        message: "Payments deleted successfully",
        severity: "success",
      });
    },
    onError: (err) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const onDeleteClick = async (paymentIds: string[]) => {
    await deletePaymentMutation.mutateAsync(paymentIds);
  };

  const deleteSelected = async () => {
    setSalaryIds(rowSelectionModel as string[]);
    setDialogOpen(true);
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      // Perform the delete action here
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
            loading={deletePaymentMutation.isPending}
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
          rows={payments || []}
          columns={columns}
          getRowId={(row) => row._id}
          editMode="row"
          sx={{
            height: period ? 250 : "calc(100vh - 230px)",
          }}
          rowCount={rowCount}
          loading={isLoading || isFetching}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
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
          onRowSelectionModelChange={(newModel) =>
            setRowSelectionModel(newModel)
          }
          checkboxSelection={isEditing}
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleRowUpdateError}
        />
      </div>

      <ConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the payment record(s) ?`}
      />
    </Box>
  );
};

export default PaymentsDataGrid;
