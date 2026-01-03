
import React, { useState } from "react";
import {
    DataGrid,
    GridColDef,
    GridToolbar,
} from "@mui/x-data-grid";
import {
    Box,
    Alert,
    Button,
    Dialog,
    DialogContent,
    DialogContentText,
    DialogTitle,
    DialogActions,
    Typography,
    Chip,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Add, DeleteOutline, Visibility } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { fetchEpfPayments, deleteEpfPayment } from "@/app/lib/api";
import dayjs from "dayjs";
import EpfPaymentDialog from "./EpfPaymentDialog";

export const EpfPayments: React.FC<{
    user: { id: string; name: string; email: string; role: string };
    companyId: string;
}> = ({ user, companyId }) => {
    const queryClient = useQueryClient();
    const { showSnackbar } = useSnackbar();

    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    const [filterModel, setFilterModel] = useState<any>({
        items: [],
        quickFilterValues: [],
    });

    const [dialogOpen, setDialogOpen] = useState(false);
    const searchQuery = filterModel.quickFilterValues?.join(" ") || undefined;

    const {
        data: paginatedResponse,
        isLoading,
        isFetching,
        isError,
        error,
    } = useQuery<any, Error>({
        queryKey: ["epf-payments", companyId, paginationModel.page, paginationModel.pageSize, searchQuery],
        queryFn: () => fetchEpfPayments({
            companyId,
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            search: searchQuery
        }),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        placeholderData: keepPreviousData,
    });

    const payments = paginatedResponse?.data || paginatedResponse?.payments || paginatedResponse || [];
    const rowCount = paginatedResponse?.pagination?.total || payments.length || 0;

    // Deletion logic
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => deleteEpfPayment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["epf-payments"] });
            showSnackbar({ message: "Payment deleted successfully", severity: "success" });
            setDeleteDialogOpen(false);
            setSelectedIds([]);
        },
        onError: (err: any) => {
            showSnackbar({ message: err.message || "Failed to delete payment", severity: "error" });
        },
    });

    const columns: GridColDef[] = [
        {
            field: "period",
            headerName: "Period",
            flex: 1,
            minWidth: 100,
            renderCell: (params) => (
                <Chip label={params.value} size="small" color="primary" variant="outlined" />
            )
        },
        {
            field: "paymentDate",
            headerName: "Date",
            flex: 1,
            minWidth: 100,
            renderCell: (params) => params.value ? dayjs(params.value).format("YYYY-MM-DD") : "-",
        },
        {
            field: "totalAmount",
            headerName: "Total Amount",
            flex: 1,
            minWidth: 120,
            type: "number",
            align: "right",
            headerAlign: "right",
            renderCell: (params) => params.value?.toLocaleString() || "-",
        },
        {
            field: "breakdown",
            headerName: "Breakdown (Emp/Empl)",
            flex: 1.5,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="caption">
                    {params.row.employerContribution?.toLocaleString()} / {params.row.employeeContribution?.toLocaleString()}
                </Typography>
            )
        },
        {
            field: "paymentMethod",
            headerName: "Method",
            flex: 1,
            renderCell: (params) => params.value?.replace("_", " ").toUpperCase() || "-",
        },
        {
            field: "referenceNo",
            headerName: "Ref No",
            flex: 1,
        },
        {
            field: "receiptFile",
            headerName: "Receipt",
            flex: 1,
            renderCell: (params) => params.value ? (
                <Button
                    variant="text"
                    size="small"
                    startIcon={<Visibility />}
                    href={params.value}
                    target="_blank"
                >
                    View
                </Button>
            ) : "-"
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Actions",
            flex: 0.8,
            getActions: (params) => [
                <Button
                    key="delete"
                    color="error"
                    size="small"
                    startIcon={<DeleteOutline />}
                    onClick={() => {
                        setSelectedIds([params.id.toString()]);
                        setDeleteDialogOpen(true);
                    }}
                >
                    Delete
                </Button>
            ]
        }
    ];

    if (isError) {
        return <Alert severity="error">{error?.message || "Error loading payments"}</Alert>;
    }

    return (
        <Box sx={{ width: "100%", height: 500 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setDialogOpen(true)}
                >
                    Record EPF Payment
                </Button>
            </Box>

            <DataGrid
                rows={payments}
                columns={columns}
                getRowId={(row) => row._id || row.id}
                rowCount={rowCount}
                loading={isLoading || isFetching}
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 20, 50]}
                filterMode="server"
                filterModel={filterModel}
                onFilterModelChange={setFilterModel}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                    toolbar: {
                        showQuickFilter: true,
                        quickFilterProps: { debounceMs: 500 },
                    },
                }}
                disableRowSelectionOnClick
            />

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this payment record?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <LoadingButton
                        color="error"
                        loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(selectedIds[0])}
                    >
                        Delete
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            <EpfPaymentDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["epf-payments"] });
                }}
                companyId={companyId}
            />
        </Box>
    );
};
