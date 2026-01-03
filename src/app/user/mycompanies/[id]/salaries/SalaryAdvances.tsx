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
    Stack,
    Typography
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import Link from "next/link";
import { DeleteOutline, Add } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { fetchSalaryAdvances, deleteSalaryAdvances } from "@/app/lib/api";
import { AdvanceDialog } from "./AdvanceDialog";
import dayjs from "dayjs";

export const SalaryAdvances: React.FC<{
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
        queryKey: ["salary-advances", companyId, paginationModel.page, paginationModel.pageSize, searchQuery],
        queryFn: () => fetchSalaryAdvances({
            companyId,
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            search: searchQuery
        }),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        placeholderData: keepPreviousData,
    });

    const advances = paginatedResponse?.data || paginatedResponse?.advances || paginatedResponse || [];
    const rowCount = paginatedResponse?.pagination?.total || advances.length || 0;

    // Dialog states
    const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => deleteSalaryAdvances(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
            queryClient.invalidateQueries({ queryKey: ["salaries"] });
            showSnackbar({ message: "Advance deleted (voided) successfully", severity: "success" });
            setDeleteDialogOpen(false);
            setSelectedIds([]);
        },
        onError: (err: any) => {
            showSnackbar({ message: err.message || "Failed to delete advance", severity: "error" });
        },
    });

    const columns: GridColDef[] = [
        {
            field: "advanceDate",
            headerName: "Date",
            flex: 1,
            minWidth: 100,
            renderCell: (params) => dayjs(params.value).format("YYYY-MM-DD"),
        },
        {
            field: "employee",
            headerName: "Employee",
            flex: 1.5,
            minWidth: 150,
            renderCell: (params) => {
                const emp = params.row.employee;
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
            field: "amount",
            headerName: "Amount",
            flex: 1,
            type: "number",
            renderCell: (params) => params.value?.toLocaleString() || "0",
        },
        {
            field: "reason",
            headerName: "Reason",
            flex: 1.5,
        },
        {
            field: "remainingBalance",
            headerName: "Remaining",
            flex: 1,
            type: "number",
            renderCell: (params) => (
                <Box fontWeight="bold" color={params.value > 0 ? "error.main" : "text.secondary"}>
                    {params.value?.toLocaleString()}
                </Box>
            )
        },
        {
            field: "deductionPlan",
            headerName: "Deduction Plan",
            flex: 1.5,
            renderCell: (params) => (
                <Stack direction="column" spacing={0.5} mt={1}>
                    <Typography variant="caption" display="block">
                        Start: {params.row.deductionStartPeriod}
                    </Typography>
                    <Typography variant="caption" display="block">
                        {params.row.monthlyDeduction?.toLocaleString()}/mo ({params.row.deductionMonths} mos)
                    </Typography>
                </Stack>
            )
        },
        {
            field: "status",
            headerName: "Status",
            flex: 1,
            renderCell: (params) => {
                const status = params.value;
                const color = status === "fully_deducted" ? "success" : status === "written_off" ? "default" : "info";
                return <Chip label={status.replace("_", " ")} color={color} size="small" sx={{ textTransform: "capitalize" }} />;
            }
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
        return <Alert severity="error">{error?.message || "Error loading advances"}</Alert>;
    }

    return (
        <Box sx={{ width: "100%", height: 500 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAdvanceDialogOpen(true)}
                >
                    Give Advance
                </Button>
            </Box>

            <DataGrid
                rows={advances}
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
                disableRowSelectionOnClick
                disableDensitySelector
                slotProps={{
                    toolbar: {
                        showQuickFilter: true,
                        quickFilterProps: { debounceMs: 500 },
                        csvOptions: { disableToolbarButton: true },
                        printOptions: { disableToolbarButton: true },
                    },
                }}
            />

            <AdvanceDialog
                open={advanceDialogOpen}
                onClose={(success) => {
                    setAdvanceDialogOpen(false);
                    if (success) {
                        queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
                        queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
                    }
                }}
                companyId={companyId}
            />

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Void</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete/void this advance? This will reset any deductions made.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <LoadingButton
                        color="error"
                        loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(selectedIds)}
                    >
                        Confirm
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
