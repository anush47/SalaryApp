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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Add } from "@mui/icons-material";

export interface LeaveType {
  _id: string;
  name: string;
  code: string;
  company: string;
  maxDaysPerYear: number;
  carryForward: boolean;
  maxCarryForwardDays?: number;
  maxConsecutiveDays?: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  applicableFor: "all" | "permanent" | "contract" | "intern";
  gender?: "all" | "male" | "female";
  color: string;
  isActive: boolean;
  createdAt: string;
}

// Fetch leave types
const fetchLeaveTypes = async (companyId: string): Promise<LeaveType[]> => {
  const response = await fetch(
    `/api/leave-types?companyId=${companyId}&includeInactive=true`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch leave types");
  }
  const data = await response.json();
  return data.leaveTypes || [];
};

const LeaveTypesManagement: React.FC<{
  user: { id: string; name: string; email: string; role: string };
  companyId: string;
}> = ({ user, companyId }) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(
    null
  );

  // Form state for new leave type
  const [newLeaveType, setNewLeaveType] = useState({
    name: "",
    code: "",
    maxDaysPerYear: 14,
    carryForward: false,
    maxCarryForwardDays: 0,
    maxConsecutiveDays: 0,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    applicableFor: "all" as "all" | "permanent" | "contract" | "intern",
    gender: "all" as "all" | "male" | "female",
    color: "#1976d2",
  });

  // Fetch leave types
  const {
    data: leaveTypes,
    isLoading,
    isError,
    error,
  } = useQuery<LeaveType[], Error>({
    queryKey: ["leaveTypes", companyId],
    queryFn: () => fetchLeaveTypes(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Create leave type mutation
  const createLeaveTypeMutation = useMutation({
    mutationFn: async (leaveType: any) => {
      const response = await fetch("/api/leave-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...leaveType,
          companyId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create leave type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", companyId] });
      showSnackbar({
        message: "Leave type created successfully!",
        severity: "success",
      });
      setAddDialogOpen(false);
      setNewLeaveType({
        name: "",
        code: "",
        maxDaysPerYear: 14,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 0,
        requiresApproval: true,
        requiresDocument: false,
        isPaid: true,
        applicableFor: "all",
        gender: "all",
        color: "#1976d2",
      });
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  // Update leave type mutation
  const updateLeaveTypeMutation = useMutation({
    mutationFn: async (leaveType: any) => {
      const response = await fetch("/api/leave-types", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveTypeId: leaveType._id,
          ...leaveType,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update leave type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", companyId] });
      showSnackbar({
        message: "Leave type updated successfully!",
        severity: "success",
      });
      setEditDialogOpen(false);
      setEditingLeaveType(null);
    },
    onError: (err: Error) => {
      showSnackbar({ message: err.message, severity: "error" });
    },
  });

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "code",
      headerName: "Code",
      flex: 0.5,
      maxWidth: 100,
    },
    {
      field: "maxDaysPerYear",
      headerName: "Max Days/Year",
      flex: 0.7,
      maxWidth: 130,
    },
    {
      field: "carryForward",
      headerName: "Carry Forward",
      flex: 0.7,
      maxWidth: 130,
      type: "boolean",
    },
    {
      field: "requiresApproval",
      headerName: "Needs Approval",
      flex: 0.7,
      maxWidth: 130,
      type: "boolean",
    },
    {
      field: "requiresDocument",
      headerName: "Needs Document",
      flex: 0.7,
      maxWidth: 140,
      type: "boolean",
    },
    {
      field: "isPaid",
      headerName: "Paid",
      flex: 0.5,
      maxWidth: 80,
      type: "boolean",
    },
    {
      field: "applicableFor",
      headerName: "Applicable For",
      flex: 1,
      minWidth: 130,
      valueGetter: (params) => {
        return params.toString().toUpperCase();
      },
    },
    {
      field: "isActive",
      headerName: "Status",
      flex: 0.7,
      maxWidth: 100,
      renderCell: (params) => {
        return (
          <Chip
            label={params.value ? "Active" : "Inactive"}
            size="small"
            color={params.value ? "success" : "default"}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => handleEdit(params.row)}
            >
              Edit
            </Button>
          </Box>
        );
      },
    },
  ];

  const handleEdit = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setEditDialogOpen(true);
  };

  const handleAddLeaveType = () => {
    createLeaveTypeMutation.mutate(newLeaveType);
  };

  const handleUpdateLeaveType = () => {
    if (editingLeaveType) {
      updateLeaveTypeMutation.mutate(editingLeaveType);
    }
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      requiresDocument: false,
      applicableFor: false,
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
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Leave Type
        </Button>
      </Box>

      <Box sx={{ height: "calc(100vh - 400px)", minHeight: "400px" }}>
        <DataGrid
          rows={leaveTypes || []}
          columns={columns}
          getRowId={(row) => row._id}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 20,
              },
            },
          }}
          pageSizeOptions={[10, 20, 50]}
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
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
          }
        />
      </Box>

      {/* Add Leave Type Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Leave Type</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              label="Name"
              required
              value={newLeaveType.name}
              onChange={(e) =>
                setNewLeaveType({ ...newLeaveType, name: e.target.value })
              }
            />
            <TextField
              label="Code"
              required
              value={newLeaveType.code}
              onChange={(e) =>
                setNewLeaveType({ ...newLeaveType, code: e.target.value })
              }
            />
            <TextField
              label="Max Days Per Year"
              type="number"
              value={newLeaveType.maxDaysPerYear}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  maxDaysPerYear: parseInt(e.target.value),
                })
              }
            />
            <TextField
              label="Color"
              type="color"
              value={newLeaveType.color}
              onChange={(e) =>
                setNewLeaveType({ ...newLeaveType, color: e.target.value })
              }
            />
            <TextField
              select
              label="Applicable For"
              value={newLeaveType.applicableFor}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  applicableFor: e.target.value as any,
                })
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="permanent">Permanent</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="intern">Intern</MenuItem>
            </TextField>
            <TextField
              select
              label="Gender"
              value={newLeaveType.gender}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  gender: e.target.value as any,
                })
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newLeaveType.isPaid}
                  onChange={(e) =>
                    setNewLeaveType({
                      ...newLeaveType,
                      isPaid: e.target.checked,
                    })
                  }
                />
              }
              label="Paid Leave"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newLeaveType.requiresApproval}
                  onChange={(e) =>
                    setNewLeaveType({
                      ...newLeaveType,
                      requiresApproval: e.target.checked,
                    })
                  }
                />
              }
              label="Requires Approval"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newLeaveType.requiresDocument}
                  onChange={(e) =>
                    setNewLeaveType({
                      ...newLeaveType,
                      requiresDocument: e.target.checked,
                    })
                  }
                />
              }
              label="Requires Document"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newLeaveType.carryForward}
                  onChange={(e) =>
                    setNewLeaveType({
                      ...newLeaveType,
                      carryForward: e.target.checked,
                    })
                  }
                />
              }
              label="Carry Forward"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddLeaveType}
            variant="contained"
            disabled={!newLeaveType.name || !newLeaveType.code}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Leave Type Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingLeaveType(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Leave Type</DialogTitle>
        <DialogContent>
          {editingLeaveType && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mt: 2,
              }}
            >
              <TextField
                label="Name"
                required
                value={editingLeaveType.name}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    name: e.target.value,
                  })
                }
              />
              <TextField
                label="Code"
                required
                disabled
                value={editingLeaveType.code}
              />
              <TextField
                label="Max Days Per Year"
                type="number"
                value={editingLeaveType.maxDaysPerYear}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    maxDaysPerYear: parseInt(e.target.value),
                  })
                }
              />
              <TextField
                label="Color"
                type="color"
                value={editingLeaveType.color}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    color: e.target.value,
                  })
                }
              />
              <TextField
                select
                label="Applicable For"
                value={editingLeaveType.applicableFor}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    applicableFor: e.target.value as any,
                  })
                }
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="permanent">Permanent</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
              </TextField>
              <TextField
                select
                label="Gender"
                value={editingLeaveType.gender}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    gender: e.target.value as any,
                  })
                }
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingLeaveType.isPaid}
                    onChange={(e) =>
                      setEditingLeaveType({
                        ...editingLeaveType,
                        isPaid: e.target.checked,
                      })
                    }
                  />
                }
                label="Paid Leave"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingLeaveType.requiresApproval}
                    onChange={(e) =>
                      setEditingLeaveType({
                        ...editingLeaveType,
                        requiresApproval: e.target.checked,
                      })
                    }
                  />
                }
                label="Requires Approval"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingLeaveType.requiresDocument}
                    onChange={(e) =>
                      setEditingLeaveType({
                        ...editingLeaveType,
                        requiresDocument: e.target.checked,
                      })
                    }
                  />
                }
                label="Requires Document"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingLeaveType.carryForward}
                    onChange={(e) =>
                      setEditingLeaveType({
                        ...editingLeaveType,
                        carryForward: e.target.checked,
                      })
                    }
                  />
                }
                label="Carry Forward"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingLeaveType.isActive}
                    onChange={(e) =>
                      setEditingLeaveType({
                        ...editingLeaveType,
                        isActive: e.target.checked,
                      })
                    }
                  />
                }
                label="Active"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingLeaveType(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateLeaveType}
            variant="contained"
            disabled={!editingLeaveType?.name}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveTypesManagement;
