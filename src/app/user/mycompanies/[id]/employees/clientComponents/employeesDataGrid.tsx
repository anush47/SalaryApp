import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
  GridPaginationModel,
} from "@mui/x-data-grid";
import {
  Box,
  Alert,
  CircularProgress,
  Button,
  FormControlLabel,
  Checkbox,
  Chip,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Link from "next/link";
import { useSnackbar } from "@/app/context/SnackbarContext";

// Set dayjs format for consistency
dayjs.locale("en-gb");

import { PaginatedResponse } from "@/app/lib/types";

// Updated fetch function to support pagination and new API response structure
const fetchEmployees = async (
  companyId: string,
  page: number,
  limit: number
): Promise<PaginatedResponse> => {
  const response = await fetch(
    `/api/employees?companyId=${companyId}&page=${page}&limit=${limit}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();

  // Handle the new API response structure
  if (data.success) {
    const responseEmployees = data.data?.data || data.data || data.employees || [];
    const paginationData = data.data?.pagination || data.pagination;

    return {
      data: responseEmployees.map((employee: { _id: string }) => ({
        ...employee,
        id: employee._id,
      })),
      pagination: {
        page: paginationData?.page || 1,
        limit: paginationData?.limit || limit,
        total: paginationData?.total || (responseEmployees ? responseEmployees.length : 0),
        totalPages: paginationData?.totalPages || 0,
        hasNextPage: (paginationData?.page || 1) < (paginationData?.totalPages || 0),
        hasPrevPage: (paginationData?.page || 1) > 1,
      },
    };
  } else {
    throw new Error(data.error?.message || "Failed to fetch employees");
  }
};

export interface Employee {
  totalSalary: string;
  id: string;
  _id: string;
  designation: string;
  name: string;
  memberNo: number;
  nic: string;
  basic: number;
  workingDays: {
    mon: "full" | "half" | "off";
    tue: "full" | "half" | "off";
    wed: "full" | "half" | "off";
    thu: "full" | "half" | "off";
    fri: "full" | "half" | "off";
    sat: "full" | "half" | "off";
    sun: "full" | "half" | "off";
    isDynamicHolidays: boolean;
  };
  divideBy: 240 | 200;
  remark: string;
  active: boolean;
  canLogin: boolean;
  user: any;
  otMethod: string;
  overrides: {
    shifts: boolean;
    workingDays: boolean;
    probabilities: boolean;
    paymentStructure: boolean;
    calendar: boolean;
    leaveTypes: boolean;
    attendance: boolean;
    salaryPeriod: boolean;
  };
  shiftSettings: {
    mode: "fixed" | "dynamic" | "roster" | "manual";
    shifts: {
      _id?: string;
      name: string;
      type: "fixed" | "dynamic";
      startTime?: string;
      endTime?: string;
      duration?: number;
      breakDuration: number;
      minStartTime?: string;
      maxStartTime?: string;
      minEndTime?: string;
      maxEndTime?: string;
      maxDuration?: number;
    }[];
    defaultShiftId?: string;
    autoSelect: boolean;
  };
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
  department?: any;
  manager?: any;
  employeeType?: "permanent" | "contract" | "intern" | "temporary";
  // Personal details
  fullName?: string;
  motherName?: string;
  fatherName?: string;
  isMarried?: boolean;
  spouseName?: string;
  nationality?: string;
  emergencyContact?: string;
  editable?: boolean;
  documents?: Record<string, string>;
  taxType?: "company" | "individual";
  leaveTypes?: {
    leaveType: string | any;
    maxDaysPerPeriod: number;
    balance: number;
    carryForward: boolean;
    currentPeriodStart?: string;
    lastAccrualDate?: string;
    carriedForwardBalance?: number;
  }[];
  attendanceOverrides: {
    enabled: boolean;
    features: {
      pwaCheckIn: boolean;
      hardwareIntegration: boolean;
      salaryIntegration: boolean;
    };
  };
  geoFencing?: {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    enforceValidation: boolean;
  };
  allowRemoteCheckIn: boolean;
  requireApproval: boolean;
  isRemote: boolean;
  allowedLocations: {
    lat: number;
    lng: number;
    radius: number;
    name: string;
    _id?: string;
  }[];
  // Salary Period Configuration
  salaryPeriod?: "daily" | "weekly" | "bi-weekly" | "monthly" | "custom";
  customPeriodDays?: number;
  rateDivisor?: number;

  payPeriodConfig?: {
    startDay?: number;
    endDay?: number;
    type?: "fixed_dates" | "start_to_end_of_month" | "end_to_end_of_month";
  };
  calculationMethod?: "attendance" | "fixed_days" | "no_ot";
  autoAcknowledge?: boolean;
  faceData?: {
    descriptors?: number[][];
    descriptor?: number[]; // Legacy support
  };
};


// Default values for Employee
export const defaultEmployee: Employee = {
  totalSalary: "",
  id: "",
  _id: "",
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
    isDynamicHolidays: false,
  },
  divideBy: 240,
  remark: "",
  active: true,
  canLogin: false,
  user: null,
  otMethod: "",
  overrides: {
    shifts: false,
    workingDays: false,
    probabilities: false,
    paymentStructure: false,
    calendar: false,
    leaveTypes: false,
    attendance: false,
    salaryPeriod: false,
  },
  attendanceOverrides: {
    enabled: false,
    features: {
      pwaCheckIn: false,
      hardwareIntegration: false,
      salaryIntegration: false,
    },
  },
  geoFencing: {
    enabled: false,
    latitude: 0,
    longitude: 0,
    radiusMeters: 100,
    enforceValidation: false,
  },
  allowRemoteCheckIn: false,
  requireApproval: false,
  isRemote: false,
  allowedLocations: [],
  leaveTypes: [],
  shiftSettings: {
    mode: "fixed",
    shifts: [],
    autoSelect: false,
  },
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
  department: null,
  manager: null,
  employeeType: "permanent",
  fullName: "",
  motherName: "",
  fatherName: "",
  isMarried: false,
  spouseName: "",
  nationality: "Sri Lankan",
  emergencyContact: "",
  editable: false,
  documents: {},
  // Salary Period Configuration
  salaryPeriod: "monthly",
  rateDivisor: 30,
  calculationMethod: "fixed_days",
  autoAcknowledge: true,
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

const EmployeesDataGrid: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  isEditingEmployeeInHome: boolean;
  companyId: string;
}> = ({ user, isEditingEmployeeInHome, companyId }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: 20,
  });

  const {
    data: paginatedResponse,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedResponse, Error>({
    queryKey: [
      "employees",
      companyId,
      paginationModel.page,
      paginationModel.pageSize,
    ],
    queryFn: () =>
      fetchEmployees(
        companyId,
        paginationModel.page + 1,
        paginationModel.pageSize
      ),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: (previousData) => previousData,
  });

  const employees = paginatedResponse?.data || [];
  const rowCount = paginatedResponse?.pagination.total || 0;

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
      valueOptions: ["noOt", "calc"],
      editable: isEditingEmployeeInHome,
    },
    {
      field: "shifts",
      headerName: "Shifts",
      flex: 1,
      renderCell: (params) => {
        const value = params.row.shiftSettings;
        if (value && value.shifts) {
          return value.shifts.map((s: any) => s.name).join(", ");
        }
        return "-";
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
      field: "canLogin",
      headerName: "Can Login",
      flex: 1,
      editable: isEditingEmployeeInHome,
      type: "boolean",
      maxWidth: 120,
    },
    {
      field: "user",
      headerName: "User Account",
      flex: 1,
      maxWidth: 150,
      renderCell: (params) => {
        return params.value ? (
          <Chip label="Exists" color="success" size="small" />
        ) : (
          <Chip label="None" color="default" size="small" />
        );
      },
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
      renderCell: (params) => {
        // Get the employee object from the current row data
        const employee = params.row;
        return (
          <Link
            href={`/user/mycompanies/${employee.company || companyId}?companyPageSelect=employees&employeeId=${params.id}`}
          >
            <Button variant="text">View</Button>
          </Link>
        );
      },
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
      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error?.message || result.message || "Failed to update employee";
        throw new Error(errorMessage);
      }

      // Handle the new API response structure
      if (result.success) {
        return result;
      } else {
        const errorMessage = result.error?.message || "Failed to update employee";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data: any, newEmployee: Employee) => {
      const queryKey = [
        "employees",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      showSnackbar({
        message: data?.message || "Employee updated successfully!",
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
    showSnackbar({
      message: params.error?.message || "An unexpected error occurred.",
      severity: "error",
    });
  };

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
      canLogin: false,
      user: false,
    });
  const [rowSelectionModel, setRowSelectionModel] = React.useState<string[]>(
    []
  );

  if (isLoading && !paginatedResponse) {
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
      <DataGrid
        rows={employees}
        rowCount={rowCount}
        columns={columns}
        getRowId={(row) => row._id}
        editMode="row"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        paginationMode="server"
        loading={isLoading}
        // initialState={{
        //   pagination: {
        //     paginationModel: {
        //       pageSize: 20,
        //     },
        //   },
        //   filter: {
        //     filterModel: {
        //       items: [],
        //       quickFilterExcludeHiddenColumns: false,
        //     },
        //   },
        // }}
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
    </Box>
  );
};

export default EmployeesDataGrid;
