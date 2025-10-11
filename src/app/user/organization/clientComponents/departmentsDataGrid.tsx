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
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
} from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Add } from "@mui/icons-material";

export interface Department {
  _id: string;
  name: string;
  company: string;
  manager?: {
    _id: string;
    name: string;
    memberNo: number;
    designation: string;
  };
  parentDepartment?: {
    _id: string;
    name: string;
  };
  description: string;
  costCenter: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  name: string;
  memberNo: number;
  designation: string;
}

// Fetch departments
const fetchDepartments = async (companyId: string): Promise<Department[]> => {
  const response = await fetch(`/api/departments?companyId=${companyId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch departments");
  }
  const data = await response.json();
  return data.departments || [];
};

// Fetch employees for manager dropdown
const fetchEmployees = async (companyId: string): Promise<Employee[]> => {
  const response = await fetch(`/api/employees?companyId=${companyId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch employees");
  }
  const data = await response.json();
  return data.employees || [];
};

const DepartmentsDataGrid: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  isEditingDepartment: boolean;
}> = ({ user, isEditingDepartment }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );

  // Fetch user's companies first
  const { data: companies } = useQuery<any[]>({
    queryKey: ["companies", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/companies?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch companies");
      const data = await response.json();
      return data.companies || [];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Set default company when companies load
  React.useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id);
    }
  }, [companies, selectedCompanyId]);

  // Fetch departments for selected company
  const {
    data: departments,
    isLoading,
    isError,
    error,
  } = useQuery<Department[], Error>({
    queryKey: ["departments", selectedCompanyId],
    queryFn: () => fetchDepartments(selectedCompanyId!),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!selectedCompanyId,
  });

  // Fetch employees for manager dropdown
  const { data: employees } = useQuery<Employee[], Error>({
    queryKey: ["employees", selectedCompanyId],
    queryFn: () => fetchEmployees(selectedCompanyId!),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!selectedCompanyId,
  });

  // Form state for new department
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    managerId: "",
    parentDepartmentId: "",
    description: "",
    costCenter: "",
  });

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 200,
      editable: isEditingDepartment,
    },
    {
      field: "manager",
      headerName: "Manager",
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => {
        return params ? `${params.name} (${params.memberNo})` : "None";
      },
      renderCell: (params) => {
        return params.value !== "None" ? (
          <Chip label={params.value} size="small" color="primary" />
        ) : (
          <Chip label="None" size="small" />
        );
      },
    },
    {
      field: "parentDepartment",
      headerName: "Parent Department",
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => {
        return params ? params.name : "None";
      },
      renderCell: (params) => {
        return params.value !== "None" ? (
          <Chip label={params.value} size="small" color="secondary" />
        ) : (
          <Chip label="None" size="small" />
        );
      },
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 200,
      editable: isEditingDepartment,
    },
    {
      field: "costCenter",
      headerName: "Cost Center",
      flex: 1,
      minWidth: 150,
      editable: isEditingDepartment,
    },
    {
      field: "isActive",
      headerName: "Active",
      flex: 1,
      maxWidth: 100,
      type: "boolean",
      editable: isEditingDepartment,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      maxWidth: 150,
      renderCell: (params) => (
        <Box>
          <Button
            variant="text"
            size="small"
            onClick={() => handleEditDepartment(params.row)}
          >
            Edit
          </Button>
          <Button
            variant="text"
            size="small"
            color="error"
            onClick={() => handleDeleteDepartment(params.row._id)}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async (department: any) => {
      const response = await fetch("/api/departments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentId: department._id,
          name: department.name,
          managerId: department.managerId || null,
          parentDepartmentId: department.parentDepartmentId || null,
          description: department.description,
          costCenter: department.costCenter,
          isActive: department.isActive,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update department");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", selectedCompanyId] });
      showSnackbar({
        message: "Department updated successfully!",
        severity: "success",
      });
      setEditDialogOpen(false);
      setEditingDepartment(null);
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (department: any) => {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: department.name,
          companyId: selectedCompanyId,
          managerId: department.managerId || null,
          parentDepartmentId: department.parentDepartmentId || null,
          description: department.description,
          costCenter: department.costCenter,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create department");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", selectedCompanyId] });
      showSnackbar({
        message: "Department created successfully!",
        severity: "success",
      });
      setAddDialogOpen(false);
      setNewDepartment({
        name: "",
        managerId: "",
        parentDepartmentId: "",
        description: "",
        costCenter: "",
      });
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (departmentId: string) => {
      const response = await fetch(
        `/api/departments?departmentId=${departmentId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete department");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", selectedCompanyId] });
      showSnackbar({
        message: "Department deleted successfully!",
        severity: "success",
      });
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const handleRowUpdate = async (newRow: any) => {
    try {
      if (!newRow.name || newRow.name.trim() === "") {
        throw new Error("Department name is required");
      }
      await updateDepartmentMutation.mutateAsync(newRow);
      return newRow;
    } catch (error: any) {
      throw {
        message: error?.message || "An error occurred while updating the department.",
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

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment({
      ...department,
      managerId: department.manager?._id || "",
      parentDepartmentId: department.parentDepartment?._id || "",
    } as any);
    setEditDialogOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (editingDepartment) {
      await updateDepartmentMutation.mutateAsync(editingDepartment);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      await deleteDepartmentMutation.mutateAsync(departmentId);
    }
  };

  const handleAddDepartment = async () => {
    await createDepartmentMutation.mutateAsync(newDepartment);
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      costCenter: false,
      description: false,
    });

  if (!companies || companies.length === 0) {
    return (
      <Box
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Alert severity="info">
          No companies found. Please create a company first.
        </Alert>
      </Box>
    );
  }

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
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          select
          label="Company"
          value={selectedCompanyId || ""}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          sx={{ minWidth: 300 }}
        >
          {companies?.map((company) => (
            <MenuItem key={company._id} value={company._id}>
              {company.name} ({company.employerNo})
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Department
        </Button>
      </Box>

      <DataGrid
        rows={departments || []}
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
        disableRowSelectionOnClick
        disableDensitySelector
        processRowUpdate={handleRowUpdate}
        onProcessRowUpdateError={handleRowUpdateError}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(newModel) =>
          setColumnVisibilityModel(newModel)
        }
      />

      {/* Add Department Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              required
              value={newDepartment.name}
              onChange={(e) =>
                setNewDepartment({ ...newDepartment, name: e.target.value })
              }
            />
            <TextField
              select
              label="Manager"
              value={newDepartment.managerId}
              onChange={(e) =>
                setNewDepartment({ ...newDepartment, managerId: e.target.value })
              }
            >
              <MenuItem value="">None</MenuItem>
              {employees?.map((employee) => (
                <MenuItem key={employee._id} value={employee._id}>
                  {employee.name} ({employee.memberNo}) - {employee.designation}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Parent Department"
              value={newDepartment.parentDepartmentId}
              onChange={(e) =>
                setNewDepartment({
                  ...newDepartment,
                  parentDepartmentId: e.target.value,
                })
              }
            >
              <MenuItem value="">None</MenuItem>
              {departments?.map((dept) => (
                <MenuItem key={dept._id} value={dept._id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              multiline
              rows={3}
              value={newDepartment.description}
              onChange={(e) =>
                setNewDepartment({
                  ...newDepartment,
                  description: e.target.value,
                })
              }
            />
            <TextField
              label="Cost Center"
              value={newDepartment.costCenter}
              onChange={(e) =>
                setNewDepartment({
                  ...newDepartment,
                  costCenter: e.target.value,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddDepartment}
            variant="contained"
            disabled={!newDepartment.name.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingDepartment(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Department</DialogTitle>
        <DialogContent>
          {editingDepartment && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <TextField
                label="Name"
                required
                value={editingDepartment.name}
                onChange={(e) =>
                  setEditingDepartment({
                    ...editingDepartment,
                    name: e.target.value,
                  })
                }
              />
              <TextField
                select
                label="Manager"
                value={(editingDepartment as any).managerId || ""}
                onChange={(e) =>
                  setEditingDepartment({
                    ...editingDepartment,
                    managerId: e.target.value,
                  } as any)
                }
              >
                <MenuItem value="">None</MenuItem>
                {employees?.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {employee.name} ({employee.memberNo}) - {employee.designation}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Parent Department"
                value={(editingDepartment as any).parentDepartmentId || ""}
                onChange={(e) =>
                  setEditingDepartment({
                    ...editingDepartment,
                    parentDepartmentId: e.target.value,
                  } as any)
                }
              >
                <MenuItem value="">None</MenuItem>
                {departments
                  ?.filter((dept) => dept._id !== editingDepartment._id)
                  .map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                label="Description"
                multiline
                rows={3}
                value={editingDepartment.description}
                onChange={(e) =>
                  setEditingDepartment({
                    ...editingDepartment,
                    description: e.target.value,
                  })
                }
              />
              <TextField
                label="Cost Center"
                value={editingDepartment.costCenter}
                onChange={(e) =>
                  setEditingDepartment({
                    ...editingDepartment,
                    costCenter: e.target.value,
                  })
                }
              />
              <TextField
                select
                label="Status"
                value={editingDepartment.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setEditingDepartment({
                    ...editingDepartment,
                    isActive: e.target.value === "active",
                  })
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingDepartment(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateDepartment}
            variant="contained"
            disabled={!editingDepartment?.name.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentsDataGrid;
