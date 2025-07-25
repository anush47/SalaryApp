import React from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import { Box, Alert, CircularProgress, Chip, Button } from "@mui/material";
import Link from "next/link";
import { Salary } from "../salaries/salariesDataGrid";
import { useQuery } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

const fetchSalaries = async (companyId: string, period?: string) => {
  const fetchLink = period
    ? `/api/salaries/?companyId=${companyId}&period=${period}`
    : `/api/salaries/?companyId=${companyId}`;
  const response = await fetch(fetchLink);
  if (!response.ok) {
    throw new Error("Failed to fetch salaries");
  }
  const data = await response.json();
  return data.salaries.map((salary: any) => ({
    ...salary,
    id: salary._id,
    ot: salary.ot.amount,
    otReason: salary.ot.reason,
    noPay: salary.noPay.amount,
    noPayReason: salary.noPay.reason,
  }));
};

const SalariesIncludeDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  isEditing: boolean;
  companyId: string;
  period?: string;
  rowSelectionModel: GridRowSelectionModel;
  setRowSelectionModel: React.Dispatch<
    React.SetStateAction<GridRowSelectionModel>
  >;
}> = ({
  user,
  isEditing,
  period,
  companyId,
  rowSelectionModel,
  setRowSelectionModel,
}) => {
  const { data: salaries, isLoading, isError, error } = useQuery<Salary[], Error>({
    queryKey: ["salaries", companyId, period],
    queryFn: () => fetchSalaries(companyId, period),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

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
    },
    {
      field: "holidayPay",
      headerName: "Holiday Pay",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
    },
    {
      field: "ot",
      headerName: "OT",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
    },
    {
      field: "otReason",
      headerName: "OT Reason",
      flex: 1,
    },
    {
      field: "noPay",
      headerName: "No Pay",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
    },
    {
      field: "noPayReason",
      headerName: "No Pay Reason",
      flex: 1,
    },
    {
      field: "advanceAmount",
      headerName: "Advance",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
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
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => {
        return (
          <Link
            href={`/user/mycompanies/${companyId}?companyPageSelect=salaries&salaryId=${params.id}`}
          >
            <Button variant="text" color="primary" size="small">
              View
            </Button>
          </Link>
        );
      },
    },
  ];

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      otReason: false,
      noPayReason: false,
      nic: false,
    });

  if (isLoading) {
    return <CircularProgress />;
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error?.message || "An unexpected error occurred"}
      </Alert>
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
        <DataGrid
          rows={salaries || []}
          columns={columns}
          sx={{
            height: 400,
          }}
          editMode="row"
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
          checkboxSelection={isEditing}
          disableDensitySelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
          onRowSelectionModelChange={(newModel) =>
            setRowSelectionModel(newModel)
          }
        />
      </div>
    </Box>
  );
};

export default SalariesIncludeDataGrid;
