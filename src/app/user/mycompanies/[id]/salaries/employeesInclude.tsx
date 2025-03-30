import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Switch,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import Link from "next/link";
import React from "react";
import { companyId } from "../clientComponents/NavContainer";
import { Employee } from "../employees/clientComponents/employeesDataGrid";

interface Props {
  employees: Employee[];
  employeeIds: String[];
  handleIncludeChange: (id: string) => void;
}

const EmployeesInclude: React.FC<Props> = ({
  employees,
  employeeIds,
  handleIncludeChange,
}) => {
  const columns: GridColDef[] = [
    {
      field: "_id",
      headerName: "ID",
      flex: 1,
    },
    {
      field: "company",
      headerName: "Company ID",
      flex: 1,
    },
    {
      field: "memberNo",
      headerName: "Member No",
      type: "number",
      align: "left",
      headerAlign: "left",
      flex: 1,
      display: "text",
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
      field: "basic",
      headerName: "Basic",
      flex: 1,
      type: "number",
      align: "left",
      headerAlign: "left",
    },
    {
      field: "totalSalary",
      headerName: "Total",
      flex: 1,
      align: "left",
      headerAlign: "left",
      renderCell: (params) => {
        const formatWithCommas = (value: number) => {
          return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        const value = params.value;

        if (typeof value === "string" && value.includes("-")) {
          // Handle range like "2000-3000"
          const [min, max] = value.split("-").map(Number);
          return `${formatWithCommas(min)}-${formatWithCommas(max)}`;
        } else {
          //handle empty
          if (Number.isNaN(Number(value))) {
            return "-";
          }
          // Handle single value like "6000"
          return formatWithCommas(Number(value));
        }
      },
    },
    {
      field: "designation",
      headerName: "Designation",
      flex: 1,
    },
    {
      field: "remark",
      headerName: "Remark",
      flex: 1,
    },
    {
      field: "workingDays",
      headerName: "Working Days",
      flex: 1,
      renderCell: (params) => {
        const value = params.value;
        if (typeof value === "object") {
          return Object.entries(value)
            .map(([key, val]) => `${key}:${val}`)
            .join(", ");
        }
        return value;
      },
    },
    {
      field: "divideBy",
      headerName: "Divide By",
      flex: 1,
    },
    {
      field: "otMethod",
      headerName: "OT Method",
      flex: 1,
    },
    {
      field: "shifts",
      headerName: "Shifts",
      flex: 1,
      renderCell: (params) => {
        const value = params.value;
        if (Array.isArray(value)) {
          return value
            .map((shift) => `${shift.start} - ${shift.end}`)
            .join(", ");
        }
        return value;
      },
    },
    {
      field: "paymentStructure",
      headerName: "Payment Structure",
      flex: 1,
      renderCell: (params) => {
        const value = params.value;
        if (typeof value === "object") {
          const additions = value.additions.map(
            (addition: { name: string; amount: number }) =>
              `${addition.name}: ${addition.amount}`
          );
          const deductions = value.deductions.map(
            (deduction: { name: string; amount: number }) =>
              `${deduction.name}: ${deduction.amount}`
          );
          return [...additions, ...deductions].join(", ");
        }
        return value;
      },
    },
    {
      field: "startedAt",
      headerName: "Started At",
      flex: 1,
    },
    {
      field: "resignedAt",
      headerName: "Resigned At",
      flex: 1,
    },
    {
      field: "active",
      headerName: "Active",
      flex: 1,
      type: "boolean",
    },
    {
      field: "include",
      headerName: "Include In Month",
      flex: 1,
      type: "boolean",
      renderCell: (params) => {
        return (
          <Switch
            checked={employeeIds.includes(params.id.toString())}
            onChange={() => {
              handleIncludeChange(params.id.toString());
            }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${params.id}`}
        >
          <Button variant="text">View</Button>
        </Link>
      ),
    },
  ];

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      _id: false,
      company: false,
      id: false,
      startedAt: false,
      resignedAt: false,
      nic: false,
      designation: false,
      divideBy: false,
      paymentStructure: false,
      shifts: false,
      otMethod: false,
      workingDays: false,
      remark: false,
    });
  return (
    <Card>
      <CardHeader title={"Employees to Include"} />
      <CardContent>
        <Box
          sx={{
            width: "100%",
            height: 400,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <DataGrid
            rows={employees}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 20,
                },
              },
            }}
            pageSizeOptions={[5, 10, 20, 50]}
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
            //checkboxSelection
            disableRowSelectionOnClick
            disableColumnFilter
            disableDensitySelector
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) =>
              setColumnVisibilityModel(newModel)
            }
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default EmployeesInclude;
