import React, { useState, useCallback } from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  DialogActions,
  Grid,
  Typography,
  Paper,
  Divider
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import Link from "next/link";
import { DeleteOutline } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { fetchSalaries, updateSalary, deleteSalaries } from "@/app/lib/api";
import { PaymentDialog } from "./PaymentDialog";

export interface Salary {
  id: string;
  _id: string;
  employee: string; // Will hold employee ID initially
  period: string;
  basic: number;
  holidayPay: number;
  inOut: {
    _id: string;
    in: string;
    out: string;
    workingHours: number;
    otHours: number;
    holiday: string;
    ot: number;
    noPay: number;
    description: string;
    remark: string;
    day_status: "full" | "half" | "off";
  }[];
  noPay: {
    amount: number;
    reason: string;
  };
  ot: {
    amount: number;
    reason: string;
  };
  paymentStructure: {
    additions: { name: string; amount: string; affectTotalEarnings: boolean }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };
  advanceAmount: number;
  finalSalary: number;
  remark: string;
  salaryPeriod?: string;
  outstandingBalance?: number;
  totalPaid?: number;
  paymentStatus?: "unpaid" | "partially_paid" | "fully_paid" | "overpaid";
  totalAdvanceDebt?: number;
}

import { PaginatedResponse } from "@/app/lib/types";

const fetchSalariesData = async (
  companyId: string,
  page: number,
  limit: number,
  period?: string,
  search?: string
): Promise<PaginatedResponse> => {
  const data = await fetchSalaries({ companyId, page, limit, period, search });

  const responseSalaries = data.salaries || data.data || [];
  const pagination = data.pagination || {
    page: data.page || 1,
    limit: data.limit || limit,
    total: data.total || 0,
    totalPages: Math.ceil((data.total || 0) / (data.limit || limit)),
    hasNextPage: (data.page || 1) < Math.ceil((data.total || 0) / (data.limit || limit)),
    hasPrevPage: (data.page || 1) > 1,
  };

  return {
    data: responseSalaries.map((salary: any) => ({
      ...salary,
      id: salary._id,
      ot: salary.ot?.amount || salary.ot,
      otReason: salary.ot?.reason || salary.otReason,
      noPay: salary.noPay?.amount || salary.noPay,
      noPayReason: salary.noPay?.reason || salary.noPayReason,
    })),
    pagination,
    summary: data.summary // Pass through summary from API
  };
};

const SalariesDataGrid: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  isEditing: boolean;
  period?: string;
  companyId: string;
}> = ({ user, isEditing, period, companyId }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
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
    queryKey: ["salaries", companyId, period, paginationModel.page, paginationModel.pageSize, searchQuery, "v2"], // Force cache refresh for summary
    queryFn: () => fetchSalariesData(companyId, paginationModel.page + 1, paginationModel.pageSize, period, searchQuery),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
  });

  const salaries = paginatedResponse?.data || [];
  const rowCount = paginatedResponse?.pagination.total || 0;

  const columns: GridColDef[] = [
    {
      field: "memberNo",
      headerName: "Member No",
      flex: 1,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => {
        return (
          <Link
            href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${params.row.employee}`}
          >
            <Button variant="text" color="primary" size="small">
              {params.value}
            </Button>
          </Link>
        );
      },
    },
    {
      field: "nic",
      headerName: "NIC",
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
      field: "basic",
      headerName: "Basic Salary",
      flex: 1,
      align: "left",
      type: "number",
      headerAlign: "left",
      editable: isEditing,
    },
    {
      field: "holidayPay",
      headerName: "Holiday Pay",
      flex: 1,
      align: "left",
      type: "number",
      headerAlign: "left",
    },
    {
      field: "ot",
      headerName: "OT",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: isEditing,
    },
    {
      field: "otReason",
      headerName: "OT Reason",
      flex: 1,
      editable: isEditing,
    },
    {
      field: "noPay",
      headerName: "No Pay",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: isEditing,
    },
    {
      field: "noPayReason",
      headerName: "No Pay Reason",
      flex: 1,
      editable: isEditing,
    },

    {
      field: "advanceAmount",
      headerName: "Advance",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: isEditing,
    },
    {
      field: "finalSalary",
      headerName: "Final Salary",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
    },
    {
      field: "outstandingBalance",
      headerName: "To Pay",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => {
        const val =
          params.value !== undefined
            ? params.value
            : params.row.finalSalary - (params.row.advanceAmount || 0);
        return (
          <Box color={val > 0 ? "error.main" : "success.main"} fontWeight="bold">
            {val?.toLocaleString()}
          </Box>
        );
      },
    },
    {
      field: "paymentStatus",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
        const status = params.value || "unpaid";
        if (status === "unpaid") color = "error";
        else if (status === "partially_paid") color = "warning";
        else if (status === "fully_paid") color = "success";
        else if (status === "overpaid") color = "info";

        return (
          <Chip
            label={status.replace("_", " ")}
            color={color}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
        );
      }
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
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => {
        return (
          <Box display="flex" gap={1}>
            <Link
              href={`/user/mycompanies/${companyId}?companyPageSelect=salaries&salaryId=${params.id}`}
            >
              <Button variant="text" color="primary" size="small">
                View
              </Button>
            </Link>
            <Button
              variant="text"
              color="success"
              size="small"
              onClick={() => handlePaymentClick(params.row)}
            >
              Pay
            </Button>
          </Box>
        );
      },
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
            size="small"
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
  ];

  const updateSalaryMutation = useMutation({
    mutationFn: async (newSalary: Salary) => {
      return updateSalary(newSalary);
    },
    onSuccess: () => {
      const queryKey = [
        "salaries",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      showSnackbar({
        message: "Salary updated successfully!",
        severity: "success",
      });
    },
    onError: (err) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const deleteSalaryMutation = useMutation({
    mutationFn: async (salaryIds: string[]) => {
      return deleteSalaries(salaryIds);
    },
    onSuccess: () => {
      const queryKey = [
        "salaries",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      showSnackbar({
        message: "Salary record deleted successfully!",
        severity: "success",
      });
    },
    onError: (err) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      //basic: false,
      otReason: false,
      noPayReason: false,
      nic: false,
      delete: false,
      remark: false,
      ot: false,
      noPay: false,
      advanceAmount: false,
    });

  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);

  const handleRowUpdate = async (newSalary: any) => {
    try {
      // Validate the new employee data
      const errors: { [key: string]: string } = {};
      if (!newSalary.basic) {
        errors.basic = "Basic Salary is required";
      }
      if (!newSalary.finalSalary) {
        errors.finalSalary = "Final Salary is required";
      }

      if (Object.keys(errors).length > 0) {
        throw new Error(
          `Validation error in ${newSalary.period}: ${Object.values(
            errors
          ).join(", ")}`
        );
      }

      // Format data
      newSalary.basic = parseFloat(newSalary.basic);
      newSalary.ot = {
        amount: parseFloat(newSalary.ot),
        reason: newSalary.otReason,
      };
      newSalary.noPay = {
        amount: parseFloat(newSalary.noPay),
        reason: newSalary.noPayReason,
      };
      newSalary.advanceAmount = parseFloat(newSalary.advanceAmount);
      // Calculate total additions
      const totalAdditions = newSalary.paymentStructure.additions.reduce(
        (total: number, addition: { amount: number }) =>
          total + addition.amount,
        0
      );

      // Calculate total deductions
      const totalDeductions = newSalary.paymentStructure.deductions.reduce(
        (total: number, deduction: { amount: number }) =>
          total + deduction.amount,
        0
      );

      // Calculate final salary with payment structures
      newSalary.finalSalary =
        newSalary.basic +
        newSalary.ot.amount -
        newSalary.noPay.amount -
        newSalary.advanceAmount +
        totalAdditions -
        totalDeductions;

      const body = {
        ...newSalary,
        ot: newSalary.ot,
        noPay: newSalary.noPay,
      };

      await updateSalaryMutation.mutateAsync(body);

      newSalary.ot = newSalary.ot.amount;
      newSalary.noPay = newSalary.noPay.amount;

      return newSalary;
    } catch (error: any) {
      throw {
        message:
          error?.message || "An error occurred while updating the employee.",
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSalaryForPayment, setSelectedSalaryForPayment] = useState<Salary | null>(null);
  const [salaryIds, setSalaryIds] = useState<string[]>([]);

  const handleDeleteClick = (salayId: string) => {
    setSalaryIds([salayId]);
    setDialogOpen(true);
  };

  const handlePaymentClick = (salary: Salary) => {
    setSelectedSalaryForPayment(salary);
    setPaymentDialogOpen(true);
  };

  const handlePaymentClose = (success?: boolean) => {
    setPaymentDialogOpen(false);
    setSelectedSalaryForPayment(null);
    if (success) {
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
    }
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      await deleteSalaryMutation.mutateAsync(salaryIds);
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
            loading={deleteSalaryMutation.isPending}
          >
            Confirm
          </LoadingButton>
        </DialogActions>
      </Dialog>
    );
  };

  const deleteSelected = async () => {
    setSalaryIds(rowSelectionModel as string[]);
    setDialogOpen(true);
  };


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
            startIcon={
              <DeleteOutline
                style={{ marginRight: "8px" }}
                color="error"
                fontSize="small"
              />
            }
          >
            Delete Selected
          </Button>
        )}

        <DataGrid
          rows={salaries || []}
          columns={columns}
          sx={{
            height: period ? 400 : "calc(100vh - 230px)",
          }}
          //autoPageSize
          editMode="row"
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
          checkboxSelection={isEditing}
          //disableColumnFilter
          disableDensitySelector
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleRowUpdateError}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
          onRowSelectionModelChange={(newModel) =>
            setRowSelectionModel(newModel)
          }
        />
      </div>

      {paginatedResponse?.summary && (
        <Paper elevation={0} variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
            Company Financial Overview (Filtered Salaries)
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Payable (Salaries)</Typography>
                <Typography variant="h6" fontWeight="bold">
                  LKR {paginatedResponse.summary.totalOutstanding.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" color="warning.main">Total Active Advance Debt</Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  LKR {paginatedResponse.summary.totalAdvanceDebt.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" color={paginatedResponse.summary.netPosition < 0 ? "success.main" : "text.primary"}>
                  Net Company Position
                </Typography>
                <Typography variant="h6" fontWeight="bold" color={paginatedResponse.summary.netPosition < 0 ? "success.main" : "text.primary"}>
                  LKR {paginatedResponse.summary.netPosition.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {paginatedResponse.summary.netPosition < 0 ? "(Asset / Employee Owes)" : "(Liability / Company Pays)"}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      <ConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the salary record(s) ?`}
      />

      {selectedSalaryForPayment && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={handlePaymentClose}
          salary={selectedSalaryForPayment}
          companyId={companyId}
        />
      )}
    </Box>
  );
};

export default SalariesDataGrid;
