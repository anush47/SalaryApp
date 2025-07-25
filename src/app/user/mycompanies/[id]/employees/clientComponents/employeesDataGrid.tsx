import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert, // Keep for general error display at top
  CircularProgress,
  Button,
  // Snackbar, // Removed
  Slide, // Keep if used for other transitions
  FormControlLabel,
  Checkbox,
  Chip,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Link from "next/link";
import { useSnackbar } from "@/app/contexts/SnackbarContext";

// Set dayjs format for consistency
dayjs.locale("en-gb");

export interface Employee {
  totalSalary: string;
  id: string;
  designation: string;
  name: string;
  memberNo: number;
  nic: string;
  basic: number;
  workingDays: {
    [key: string]: "full" | "half" | "off";
  };
  divideBy: 240 | 200;
  remark: string;
  active: boolean;
  otMethod: string;
  overrides: {
    shifts: boolean;
    workingDays: boolean;
    probabilities: boolean;
    paymentStructure: boolean;
    calendar: boolean;
  };
  shifts: {
    start: string;
    end: string;
    break: number;
  }[];
  probabilities: {
    workOnOff: number;
    workOnHoliday: number;
    absent: number;
    late: number;
    ot: number;
  };
  paymentStructure: {
    additions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };
  startedAt: string;
  resignedAt: string;
  company: string;
  phoneNumber: string;
  email: string;
  address: string;
  calendar: "default" | "other";
}

// Default values for Employee
export const defaultEmployee: Employee = {
  totalSalary: "",
  id: "",
  designation: "",
  name: "",
  memberNo: 0,
  nic: "",
  basic: 21000,
  workingDays: {
    mon: "full",
    tue: "full",
    wed: "full",
    thu: "full",
    fri: "full",
    sat: "half",
    sun: "off",
  },
  divideBy: 240,
  remark: "",
  active: true,
  otMethod: "",
  overrides: {
    shifts: false,
    workingDays: false,
    probabilities: false,
    paymentStructure: false,
    calendar: false,
  },
  shifts: [{ start: "08:00", end: "17:00", break: 1 }],
  probabilities: {
    workOnOff: 1,
    workOnHoliday: 1,
    absent: 5,
    late: 2,
    ot: 75,
  },
  paymentStructure: {
    additions: [],
    deductions: [],
  },
  startedAt: "",
  resignedAt: "",
  company: "",
  phoneNumber: "",
  email: "",
  address: "",
  calendar: "default",
};

export const ddmmyyyy_to_mmddyyyy = (ddmmyyyy: string) => {
  if (!ddmmyyyy || typeof ddmmyyyy !== "string") {
    return null; // Or handle the error appropriately
  }
  const parts = ddmmyyyy.split("-");
  if (parts.length !== 3) {
    return null; // Or handle the error appropriately
  }
  const [dd, mm, yyyy] = parts;
  return `${mm}-${dd}-${yyyy}`;
};

const fetchEmployees = async (companyId: string): Promise<Employee[]> => {
  const response = await fetch(`/api/employees?companyId=${companyId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch employees");
  }
  const data = await response.json();
  return data.employees.map((employee: any) => ({
    ...employee,
    id: employee._id,
  }));
};

const EmployeesDataGrid: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  isEditingEmployeeInHome: boolean;
  companyId: string;
}> = ({ user, isEditingEmployeeInHome, companyId }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const {
    data: employees,
    isLoading,
    isError,
    error,
  } = useQuery<Employee[], Error>({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const columns: GridColDef[] = [
    {
      field: "memberNo",
      headerName: "Member No",
      editable: isEditingEmployeeInHome,
      type: "number",
      align: "left",
      headerAlign: "left",
      flex: 1,
      display: "text",
      maxWidth: 150,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 200,
      editable: isEditingEmployeeInHome,
    },
    {
      field: "nic",
      headerName: "NIC",
      flex: 1,
      editable: isEditingEmployeeInHome,
    },
    {
      field: "basic",
      headerName: "Basic",
      flex: 1,
      editable: isEditingEmployeeInHome,
      type: "number",
      align: "left",
      headerAlign: "left",
      maxWidth: 250,
    },
    {
      field: "totalSalary",
      headerName: "Total",
      flex: 1,
      editable: isEditingEmployeeInHome,
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
      editable: isEditingEmployeeInHome,
    },
    {
      field: "remark",
      headerName: "Remark",
      flex: 1,
      editable: isEditingEmployeeInHome,
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
      type: "singleSelect",
      valueOptions: [200, 240],
      editable: isEditingEmployeeInHome,
    },
    {
      field: "otMethod",
      headerName: "OT Method",
      flex: 1,
      type: "singleSelect",
      valueOptions: ["random", "noOt", "calc"],
      editable: isEditingEmployeeInHome,
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
      field: "overrides",
      headerName: "Overrides",
      flex: 1,
      renderCell: (params) => {
        const value = params.value;
        if (typeof value === "object") {
          return (
            <div style={{ display: "flex" }}>
              {Object.entries(value).map(([key, val]) => {
                if (key !== "_id" && val === true)
                  return (
                    <Chip
                      label={key}
                      key={key}
                      variant="outlined"
                      color="primary"
                      sx={{ margin: "2px" }}
                    />
                  );
              })}
            </div>
          );
        }

        return value;
      },
      editable: true,
      renderEditCell(params) {
        const value = params.value;
        if (typeof value === "object") {
          return (
            <div style={{ display: "flex" }}>
              {Object.entries(value).map(([key, val]) => {
                if (key !== "_id") {
                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          checked={!!val}
                          onChange={(event) => {
                            params.api.setEditCellValue({
                              id: params.id,
                              field: params.field,
                              value: {
                                ...value,
                                [key]: event.target.checked,
                              },
                            });
                          }}
                        />
                      }
                      label={key}
                    />
                  );
                }
                return null;
              })}
            </div>
          );
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
  ];

  if (user.role === "admin") {
    columns.push({
      field: "probabilities",
      headerName: "Probabilities",
      flex: 1,
      renderCell: (params) => {
        const value = params.value;
        if (typeof value === "object" && value !== null) {
          return `
              Off: ${value.workOnOff}%,
              Holiday: ${value.workOnHoliday}%,
              Absent: ${value.absent}%,
              Late: ${value.late}%,
              OT: ${value.ot}%`;
        }
        return value;
      },
    });
  }

  columns.push(
    {
      field: "startedAt",
      headerName: "Started At",
      flex: 1,
      editable: isEditingEmployeeInHome,
      valueGetter: (params) => {
        // Ensure the date is formatted correctly for display
        return params;
      },
      renderEditCell: (params) => (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            label="Started At"
            openTo="year"
            views={["year", "month", "day"]}
            value={
              params.value ? dayjs(ddmmyyyy_to_mmddyyyy(params.value)) : null
            }
            onChange={(newDate) => {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: newDate ? newDate.format("DD-MM-YYYY") : "",
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
      field: "resignedAt",
      headerName: "Resigned At",
      flex: 1,
      editable: isEditingEmployeeInHome,
      valueGetter: (params) => {
        // Ensure the date is formatted correctly for display
        return params;
      },
      renderEditCell: (params) => (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            label="Resigned At"
            openTo="year"
            views={["year", "month", "day"]}
            value={
              params.value ? dayjs(ddmmyyyy_to_mmddyyyy(params.value)) : null
            }
            onChange={(newDate) => {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: newDate ? newDate.format("DD-MM-YYYY") : "",
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
      field: "active",
      headerName: "Active",
      flex: 1,
      editable: isEditingEmployeeInHome,
      type: "boolean",
      maxWidth: 100,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      editable: isEditingEmployeeInHome,
    },
    {
      field: "phoneNumber",
      headerName: "Phone",
      flex: 1,
      editable: isEditingEmployeeInHome,
    },
    {
      field: "address", // Add this block
      headerName: "Address",
      flex: 1,
      editable: isEditingEmployeeInHome,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      maxWidth: 150,
      renderCell: (params) => (
        <Link
          href={`/user/mycompanies/${companyId}?companyPageSelect=employees&employeeId=${params.id}`}
        >
          <Button variant="text">View</Button>
        </Link>
      ),
    }
  );

  const updateEmployeeMutation = useMutation({
    mutationFn: async (newEmployee: Employee) => {
      const response = await fetch("/api/employees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newEmployee,
          userId: user.id, // Include user ID
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update employee");
      }
      return response.json();
    },
    onSuccess: (data: any, newEmployee: Employee) => {
      const queryKey = [
        "employees",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      showSnackbar({
        message: "Employee updated successfully!",
        severity: "success",
      });
    },
    onError: (err) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const validate = (newEmployee: {
    id: string;
    name: string;
    memberNo: string;
    nic: string;
    basic: string;
  }) => {
    const errors: {
      name?: string;
      memberNo?: string;
      nic?: string;
      basic?: string;
    } = {};
    if (newEmployee.name === "") {
      errors.name = "Name is required";
    }
    if (newEmployee.memberNo === null || newEmployee.memberNo === "") {
      errors.memberNo = "Member number is required";
    } else {
      //check if number already exists except this one
      const existingEmployee = employees?.find((employee) => {
        return (
          employee.memberNo === parseInt(newEmployee.memberNo) &&
          employee.id !== newEmployee.id
        );
      });
      if (existingEmployee) {
        errors.memberNo = "Member number already exists";
      }
    }
    if (newEmployee.nic === "") {
      errors.nic = "NIC is required";
    }
    if (newEmployee.basic === "") {
      errors.basic = "Basic salary is required";
    }
    return errors;
  };

  const handleRowUpdate = async (newEmployee: any) => {
    try {
      // Validate the new employee data
      const errors = validate(newEmployee);
      if (Object.keys(errors).length > 0) {
        throw new Error(
          `Validation error in ${newEmployee.memberNo}: ${Object.values(
            errors
          ).join(", ")}`
        );
      }

      // Format data
      newEmployee.name = newEmployee.name.toUpperCase();
      newEmployee.nic = newEmployee.nic.toUpperCase();
      newEmployee.basic = parseFloat(newEmployee.basic);
      await updateEmployeeMutation.mutateAsync(newEmployee);

      return newEmployee;
    } catch (error: any) {
      // Add type 'any' to the 'error' object
      // Pass the error details along
      throw {
        message:
          error?.message || "An error occurred while updating the employee.",
        error: error,
      };
    }
  };

  const handleRowUpdateError = (params: any) => {
    // Revert changes if necessary
    const updatedEmployees = employees?.map((employee: Employee) => {
      if (employee.id === params.id) {
        return params.oldRow; // Revert to old row data
      }
      return employee;
    });

    // Log error and revert row updates
    console.error("Row update error:", params.error?.error || params.error);

    // Display the error details in Snackbar
    // setSnackbarMessage(params.error?.message || "An unexpected error occurred."); // Removed
    // setSnackbarSeverity("error"); // Removed
    // setSnackbarOpen(true); // Removed
    showSnackbar({
      message: params.error?.message || "An unexpected error occurred.",
      severity: "error",
    });
  };

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
      _id: false,
      company: false,
      id: false,
      overrides: false,
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
      totalSalary: false,
      email: false,
      phoneNumber: false,
      address: false,
      probabilities: false,
    });
  const [rowSelectionModel, setRowSelectionModel] = React.useState<string[]>(
    []
  );

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
        height: "calc(100vh - 230px)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div>
        <DataGrid
          rows={employees || []}
          columns={columns}
          getRowId={(row) => row._id}
          editMode="row"
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
          //disableColumnFilter
          disableDensitySelector
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleRowUpdateError}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
        />
      </div>
    </Box>
  );
};

export default EmployeesDataGrid;
