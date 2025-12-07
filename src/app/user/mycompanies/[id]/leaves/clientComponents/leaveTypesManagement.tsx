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

import {
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  LeaveType,
} from "@/app/lib/api/leaveTypeApi";

const ALL_EMPLOYEE_TYPES = ["permanent", "contract", "intern", "temporary"];

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
    accrualPeriod: "yearly" as "yearly" | "monthly" | "weekly" | "quarterly" | "half-yearly" | "custom",
    maxDaysPerPeriod: 14,
    customPeriodDays: 30,
    accrualMethod: "upfront" as "upfront" | "monthly-accrual" | "pro-rata",
    resetDay: 1,
    carryForward: false,
    maxCarryForwardDays: 0,
    maxConsecutiveDays: 0,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    applicableFor: ["all"] as string[],
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
    queryFn: () => fetchLeaveTypes(companyId, true),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Create leave type mutation
  const createLeaveTypeMutation = useMutation({
    mutationFn: (leaveType: any) => {
      const payload = { ...leaveType, companyId };
      if (payload.applicableFor.includes("all")) {
        payload.applicableFor = ALL_EMPLOYEE_TYPES;
      }
      return createLeaveType(payload);
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
        accrualPeriod: "yearly",
        maxDaysPerPeriod: 14,
        customPeriodDays: 30,
        accrualMethod: "upfront",
        resetDay: 1,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 0,
        requiresApproval: true,
        requiresDocument: false,
        isPaid: true,
        applicableFor: ["all"],
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
    mutationFn: (leaveType: any) => {
      const payload = {
        leaveTypeId: leaveType._id,
        ...leaveType,
      };
      if (payload.applicableFor.includes("all")) {
        payload.applicableFor = ALL_EMPLOYEE_TYPES;
      }
      return updateLeaveType(payload);
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
      field: "maxDaysPerPeriod",
      headerName: "Max Days/Period",
      flex: 1,
      minWidth: 150,
      valueGetter: (value, row) => {
        const period = row.accrualPeriod || "yearly";
        const days = row.maxDaysPerPeriod;

        const periodLabels: Record<string, string> = {
          yearly: "year",
          monthly: "month",
          weekly: "week",
          quarterly: "quarter",
          "half-yearly": "half-year",
          custom: `${row.customPeriodDays || 30} days`,
        };

        return `${days} days/${periodLabels[period]}`;
      },
    },
    {
      field: "accrualMethod",
      headerName: "Accrual Method",
      flex: 0.8,
      minWidth: 120,
      valueGetter: (value, row) => {
        const method = row.accrualMethod || "upfront";
        const methodLabels: Record<string, string> = {
          upfront: "Upfront",
          "monthly-accrual": "Monthly Accrual",
          "pro-rata": "Pro-Rata",
        };
        return methodLabels[method] || method;
      },
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
      valueGetter: (value: string[]) => {
        return value ? value.join(", ") : "";
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
              select
              label="Accrual Period"
              required
              value={newLeaveType.accrualPeriod}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  accrualPeriod: e.target.value as any,
                })
              }
              helperText="How often does the leave balance reset?"
            >
              <MenuItem value="yearly">Yearly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="half-yearly">Half-Yearly</MenuItem>
              <MenuItem value="custom">Custom Period</MenuItem>
            </TextField>
            <TextField
              label="Max Days Per Period"
              type="number"
              required
              value={newLeaveType.maxDaysPerPeriod}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  maxDaysPerPeriod: parseFloat(e.target.value),
                })
              }
              helperText="Maximum leave days available per period"
            />
            <TextField
              select
              label="Accrual Method"
              required
              value={newLeaveType.accrualMethod}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  accrualMethod: e.target.value as any,
                })
              }
              helperText="How are leaves made available?"
            >
              <MenuItem value="upfront">Upfront (All at period start)</MenuItem>
              <MenuItem value="monthly-accrual">Monthly Accrual (Gradual)</MenuItem>
              <MenuItem value="pro-rata">Pro-Rata (Based on time worked)</MenuItem>
            </TextField>
            {newLeaveType.accrualPeriod === "custom" && (
              <TextField
                label="Custom Period Days"
                type="number"
                required
                value={newLeaveType.customPeriodDays}
                onChange={(e) =>
                  setNewLeaveType({
                    ...newLeaveType,
                    customPeriodDays: parseInt(e.target.value),
                  })
                }
                helperText="Number of days in custom period (e.g., 30, 60, 90)"
              />
            )}
            {(newLeaveType.accrualPeriod === "monthly" || newLeaveType.accrualPeriod === "weekly") && (
              <TextField
                label="Reset Day"
                type="number"
                value={newLeaveType.resetDay}
                onChange={(e) =>
                  setNewLeaveType({
                    ...newLeaveType,
                    resetDay: parseInt(e.target.value),
                  })
                }
                helperText={
                  newLeaveType.accrualPeriod === "monthly"
                    ? "Day of month (1-31)"
                    : "Day of week (0=Sunday, 1=Monday, ...)"
                }
              />
            )}
            {newLeaveType.carryForward && (
              <TextField
                label="Max Carry Forward Days"
                type="number"
                value={newLeaveType.maxCarryForwardDays}
                onChange={(e) =>
                  setNewLeaveType({
                    ...newLeaveType,
                    maxCarryForwardDays: parseInt(e.target.value),
                  })
                }
                helperText="Maximum days that can carry to next period"
              />
            )}
            <TextField
              label="Max Consecutive Days"
              type="number"
              value={newLeaveType.maxConsecutiveDays}
              onChange={(e) =>
                setNewLeaveType({
                  ...newLeaveType,
                  maxConsecutiveDays: parseInt(e.target.value),
                })
              }
              helperText="Maximum consecutive days allowed (0 = no limit)"
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
              onChange={(e) => {
                const value = e.target.value;
                const newValue = typeof value === 'string' ? value.split(',') : value;
                const oldValue = newLeaveType.applicableFor;
                let finalValue = newValue;

                const allTypes = ["permanent", "contract", "intern", "temporary"];
                if (newValue.includes("all")) {
                  if (!oldValue.includes("permanent") || !oldValue.includes("contract") || !oldValue.includes("intern") || !oldValue.includes("temporary")) {
                    // "all" was selected (or implied), so select all types
                    finalValue = allTypes;
                  } else if (newValue.length > allTypes.length) {
                    // Something was added when all were already selected - no-op or specific logic if needed?
                    // Actually, if "all" is in the menu value but not in state... logic acts up.
                    // Simplified: If user clicks "All", set to allTypes.
                    // Since 'all' is not in the type, we check the event value carefully.
                    // The Select 'value' passed is 'all'.
                    finalValue = allTypes;
                  }
                } else {
                  // If user Deselects one from "All", "all" won't be in newValue if we use it directly,
                  // BUT we are using a "All" Option.
                  // Let's rely on standard multi-select behavior but intercept "all".
                }

                // Re-implementing clearer logic:
                if (newValue.includes("all")) {
                  // If "All" is currently selected in the dropdown
                  // Check if it was ALREADY effectively "all"
                  const wasAll = oldValue.length === 4; // assuming 4 types

                  if (wasAll && newValue.length < 5) {
                    // If it was all, and now it's less (user deselected something? No, this block is if "all" IS in newValue)
                    // The "All" option logic in MUI Select with unique values is tricky.
                    // Let's assume: If "all" is in `newValue`, user explicitly clicked "All".
                    // If `oldValue` wasn't full, user wants to Select All.
                    // If `oldValue` WAS full, user wants to Deselect All (toggle behavior) or it's just maintaining state.

                    // Standard pattern: If "All" is clicked:
                    // 1. If not all were selected -> Select All
                    // 2. If all were selected -> Deselect All

                    // But newValue contains what is currently "checked". 
                    // If "All" is in newValue, it means the user just clicked it (if it wasn't there before) 
                    // OR it was there and they clicked something else? No, "all" isn't a state value.

                    finalValue = allTypes;
                  } else {
                    // "All" is in the list, but maybe we just want to ensure all are there?
                    // For simplicity, if "all" is present, force all types.
                    finalValue = allTypes;
                  }
                }

                // Wait, the error is likely that we are trying to set `applicableFor` to `["all"]`.
                // The user wants "all" in the UI to MEAN "permanent, contract, intern, temporary".

                if (newValue.includes("all")) {
                  finalValue = ["permanent", "contract", "intern", "temporary"];
                }

                setNewLeaveType({
                  ...newLeaveType,
                  applicableFor: finalValue as any,
                });
              }}
              SelectProps={{
                multiple: true,
                renderValue: (selected: any) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value: string) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                ),
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="permanent">Permanent</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="intern">Intern</MenuItem>
              <MenuItem value="temporary">Temporary</MenuItem>
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
                select
                label="Accrual Period"
                required
                value={editingLeaveType.accrualPeriod}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    accrualPeriod: e.target.value as any,
                  })
                }
                helperText="How often does the leave balance reset?"
              >
                <MenuItem value="yearly">Yearly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="half-yearly">Half-Yearly</MenuItem>
                <MenuItem value="custom">Custom Period</MenuItem>
              </TextField>
              <TextField
                label="Max Days Per Period"
                type="number"
                required
                value={editingLeaveType.maxDaysPerPeriod}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    maxDaysPerPeriod: parseFloat(e.target.value),
                  })
                }
                helperText="Maximum leave days available per period"
              />
              <TextField
                select
                label="Accrual Method"
                required
                value={editingLeaveType.accrualMethod}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    accrualMethod: e.target.value as any,
                  })
                }
                helperText="How are leaves made available?"
              >
                <MenuItem value="upfront">Upfront (All at period start)</MenuItem>
                <MenuItem value="monthly-accrual">Monthly Accrual (Gradual)</MenuItem>
                <MenuItem value="pro-rata">Pro-Rata (Based on time worked)</MenuItem>
              </TextField>
              {editingLeaveType.accrualPeriod === "custom" && (
                <TextField
                  label="Custom Period Days"
                  type="number"
                  required
                  value={editingLeaveType.customPeriodDays}
                  onChange={(e) =>
                    setEditingLeaveType({
                      ...editingLeaveType,
                      customPeriodDays: parseInt(e.target.value),
                    })
                  }
                  helperText="Number of days in custom period (e.g., 30, 60, 90)"
                />
              )}
              {(editingLeaveType.accrualPeriod === "monthly" || editingLeaveType.accrualPeriod === "weekly") && (
                <TextField
                  label="Reset Day"
                  type="number"
                  value={editingLeaveType.resetDay}
                  onChange={(e) =>
                    setEditingLeaveType({
                      ...editingLeaveType,
                      resetDay: parseInt(e.target.value),
                    })
                  }
                  helperText={
                    editingLeaveType.accrualPeriod === "monthly"
                      ? "Day of month (1-31)"
                      : "Day of week (0=Sunday, 1=Monday, ...)"
                  }
                />
              )}
              {editingLeaveType.carryForward && (
                <TextField
                  label="Max Carry Forward Days"
                  type="number"
                  value={editingLeaveType.maxCarryForwardDays}
                  onChange={(e) =>
                    setEditingLeaveType({
                      ...editingLeaveType,
                      maxCarryForwardDays: parseInt(e.target.value),
                    })
                  }
                  helperText="Maximum days that can carry to next period"
                />
              )}
              <TextField
                label="Max Consecutive Days"
                type="number"
                value={editingLeaveType.maxConsecutiveDays}
                onChange={(e) =>
                  setEditingLeaveType({
                    ...editingLeaveType,
                    maxConsecutiveDays: parseInt(e.target.value),
                  })
                }
                helperText="Maximum consecutive days allowed (0 = no limit)"
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
                onChange={(e) => {
                  const value = e.target.value;
                  const newValue = typeof value === 'string' ? value.split(',') : value;
                  const oldValue = editingLeaveType.applicableFor;
                  let finalValue = newValue;

                  if (newValue.includes("all")) {
                    finalValue = ["permanent", "contract", "intern", "temporary"];
                  }

                  setEditingLeaveType({
                    ...editingLeaveType,
                    applicableFor: finalValue as any,
                  });
                }}
                SelectProps={{
                  multiple: true,
                  renderValue: (selected: any) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value: string) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  ),
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="permanent">Permanent</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
                <MenuItem value="temporary">Temporary</MenuItem>
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
