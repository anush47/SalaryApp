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
  DialogContentText,
  TextField,
  MenuItem,
  Chip,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Add } from "@mui/icons-material";
import {
  fetchDepartments,
  fetchEmployees,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/lib/api";

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



const DepartmentsDataGrid: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
  isEditingDepartment: boolean;
}> = ({ user, companyId, isEditingDepartment }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);

  // Fetch departments for this company
  const {
    data: departments,
    isLoading,
    isError,
    error,
  } = useQuery<Department[], Error>({
    queryKey: ["departments", companyId],
    queryFn: () => fetchDepartments(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!companyId,
  });

  // Fetch employees for manager dropdown
  const { data: employees } = useQuery<Employee[], Error>({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees({ companyId }),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!companyId,
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
        return params
          ? `${(params as any).name} (${(params as any).memberNo})`
          : "None";
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
        return params ? (params as any).name : "None";
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
      return updateDepartment({
        id: department._id,
        name: department.name,
        manager: department.managerId || null,
        parentDepartment: department.parentDepartmentId || null,
        description: department.description,
        costCenter: department.costCenter,
        isActive: department.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", companyId] });
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
      return createDepartment({
        name: department.name,
        company: companyId,
        manager: department.managerId || null,
        parentDepartment: department.parentDepartmentId || null,
        description: department.description,
        costCenter: department.costCenter,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", companyId] });
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
      return deleteDepartment(departmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", companyId] });
      showSnackbar({
        message: "Department deleted successfully!",
        severity: "success",
      });
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const handleConfirmDelete = async () => {
    if (departmentToDelete) {
      await deleteDepartmentMutation.mutateAsync(departmentToDelete);
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    }
  };

  const handleRowUpdate = async (newRow: any) => {
    try {
      if (!newRow.name || newRow.name.trim() === "") {
        throw new Error("Department name is required");
      }
      await updateDepartmentMutation.mutateAsync(newRow);
      return newRow;
    } catch (error: any) {
      throw {
        message:
          error?.message || "An error occurred while updating the department.",
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

  const handleDeleteDepartment = (departmentId: string) => {
    setDepartmentToDelete(departmentId);
    setDeleteDialogOpen(true);
  };

  const handleAddDepartment = async () => {
    await createDepartmentMutation.mutateAsync(newDepartment);
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      costCenter: false,
      description: false,
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
        height: "calc(100vh - 230px)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
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
                setNewDepartment({
                  ...newDepartment,
                  managerId: e.target.value,
                })
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
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
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
                    {employee.name} ({employee.memberNo}) -{" "}
                    {employee.designation}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this department? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <LoadingButton
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            loading={deleteDepartmentMutation.isPending}
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default DepartmentsDataGrid;
