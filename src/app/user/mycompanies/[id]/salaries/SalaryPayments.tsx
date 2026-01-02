import React, { useState } from "react";
import {
    DataGrid,
    GridColDef,
    GridToolbar,
} from "@mui/x-data-grid";
import {
    Box,
    Alert,
    Chip,
    Button,
    Dialog,
    DialogContent,
    DialogContentText,
    DialogTitle,
    DialogActions,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import Link from "next/link";
import { DeleteOutline } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { fetchSalaryPayments, deleteSalaryPayments } from "@/app/lib/api";
import dayjs from "dayjs";

export const SalaryPayments: React.FC<{
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

    const searchQuery = filterModel.quickFilterValues?.join(" ") || undefined;

    const {
        data: paginatedResponse,
        isLoading,
        isFetching,
        isError,
        error,
    } = useQuery<any, Error>({
        queryKey: ["salary-payments", companyId, paginationModel.page, paginationModel.pageSize, searchQuery],
        queryFn: () => fetchSalaryPayments({
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
        mutationFn: async (ids: string[]) => deleteSalaryPayments(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
            // Also invalidate salaries since outstanding balance changes
            queryClient.invalidateQueries({ queryKey: ["salaries"] });
            showSnackbar({ message: "Payments deleted successfully", severity: "success" });
            setDeleteDialogOpen(false);
            setSelectedIds([]);
        },
        onError: (err: any) => {
            showSnackbar({ message: err.message || "Failed to delete payments", severity: "error" });
        },
    });

    const columns: GridColDef[] = [
        {
            field: "paymentDate",
            headerName: "Date",
            flex: 1,
            minWidth: 100,
            valueFormatter: (params) => dayjs(params.value).format("YYYY-MM-DD"),
        },
        {
            field: "type",
            headerName: "Type",
            flex: 0.8,
            renderCell: (params) => (
                <Chip
                    label={params.value || "salary"}
                    size="small"
                    variant="outlined"
                    color={params.value === "advance" ? "secondary" : "default"}
                    sx={{ textTransform: "capitalize" }}
                />
            )
        },
        {
            field: "employee",
            headerName: "Employee",
            flex: 1.5,
            minWidth: 150,
            renderCell: (params) => {
                const emp = params.row.employee;
                // Handle both populated object and ID string if necessary, though backend should populate
                const name = typeof emp === 'object' ? (emp.name || "Unknown") : "Employee";
                const id = typeof emp === 'object' ? emp._id : emp;

                return (
                    <Link href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${id}`}>
                        <Button variant="text" size="small" sx={{ textTransform: "none" }}>{name}</Button>
                    </Link>
                );
            }
        },
        {
            field: "period",
            headerName: "Period",
            flex: 1,
            renderCell: (params) => (
                <Chip label={params.value} size="small" variant="outlined" />
            )
        },
        {
            field: "amount",
            headerName: "Amount",
            flex: 1,
            minWidth: 120,
            type: "number",
            align: "right",
            headerAlign: "right",
            valueFormatter: (params) => params.value?.toLocaleString(),
        },
        {
            field: "paymentMethod",
            headerName: "Method",
            flex: 1,
            valueFormatter: (params) => params.value?.replace("_", " ").toUpperCase(),
        },
        {
            field: "status",
            headerName: "Status",
            flex: 1,
            renderCell: (params) => {
                const status = params.value;
                const color = status === "acknowledged" ? "success" : status === "disputed" ? "error" : "warning";
                return <Chip label={status} color={color} size="small" sx={{ textTransform: "capitalize" }} />;
            }
        },
        {
            field: "adminNote",
            headerName: "Note",
            flex: 1.5,
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Actions",
            flex: 1,
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
                        Are you sure you want to delete the selected payment(s)? This will update the employee's outstanding balance.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <LoadingButton
                        color="error"
                        loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(selectedIds)}
                    >
                        Delete
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
