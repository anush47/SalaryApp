import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  Box,
  Alert,
  CircularProgress,
  Chip,
  Snackbar,
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import { companyId } from "../clientComponents/NavContainer";
import { LoadingButton } from "@mui/lab";
import Link from "next/link";
import { DeleteOutline } from "@mui/icons-material";

export interface Salary {
  id: string;
  _id: string;
  employee: string; // Will hold employee ID initially
  period: string;
  basic: number;
  holidayPay: number;
  inOut: {
    _id: string;
    in: string;
    out: string;
    workingHours: number;
    otHours: number;
    holiday: string;
    ot: number;
    noPay: number;
    description: string;
    remark: string;
  }[];
  noPay: {
    amount: number;
    reason: string;
  };
  ot: {
    amount: number;
    reason: string;
  };
  paymentStructure: {
    additions: { name: string; amount: string; affectTotalEarnings: boolean }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };
  advanceAmount: number;
  finalSalary: number;
  remark: string;
}

const SalariesDataGrid: React.FC<{
  user: { id: string; name: string; email: string };
  isEditing: boolean;
  period?: string;
}> = ({ user, isEditing, period }) => {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );

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
      flex: 1,
      align: "left",
      type: "number",
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
      editable: isEditing,
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
      editable: isEditing,
    },

    {
      field: "advanceAmount",
      headerName: "Advance",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: isEditing,
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
      field: "remark",
      headerName: "Remark",
      flex: 1,
      editable: isEditing,
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
    {
      field: "delete",
      headerName: "Delete",
      flex: 1,
      renderCell: (params) => {
        return (
          <Button
            variant="text"
            color="error"
            size="small"
            disabled={!isEditing}
            onClick={() => {
              handleDeleteClick(params.id.toString());
            }}
          >
            Delete
          </Button>
        );
      },
    },
  ];

  useEffect(() => {
    const fetchSalaries = async () => {
      try {
        setLoading(true);
        const fetchLink = period
          ? `/api/salaries/?companyId=${companyId}&period=${period}`
          : `/api/salaries/?companyId=${companyId}`;
        const response = await fetch(fetchLink);
        if (!response.ok) {
          throw new Error("Failed to fetch salaries");
        }
        const data = await response.json();
        const salariesWithId = data.salaries.map((salary: any) => ({
          ...salary,
          id: salary._id,
          ot: salary.ot.amount,
          otReason: salary.ot.reason,
          noPay: salary.noPay.amount,
          noPayReason: salary.noPay.reason,
        }));
        setSalaries(salariesWithId);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSalaries();
  }, [user, companyId]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      //basic: false,
      otReason: false,
      noPayReason: false,
      nic: false,
      delete: false,
      remark: false,
      ot: false,
      noPay: false,
      advanceAmount: false,
    });

  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);

  const handleRowUpdate = async (newSalary: any) => {
    try {
      // Validate the new employee data
      const errors: { [key: string]: string } = {};
      if (!newSalary.basic) {
        errors.basic = "Basic Salary is required";
      }
      if (!newSalary.finalSalary) {
        errors.finalSalary = "Final Salary is required";
      }

      if (Object.keys(errors).length > 0) {
        throw new Error(
          `Validation error in ${newSalary.period}: ${Object.values(
            errors
          ).join(", ")}`
        );
      }
      //console.log(newSalary);

      // Format data
      newSalary.basic = parseFloat(newSalary.basic);
      newSalary.ot = {
        amount: parseFloat(newSalary.ot),
        reason: newSalary.otReason,
      };
      newSalary.noPay = {
        amount: parseFloat(newSalary.noPay),
        reason: newSalary.noPayReason,
      };
      newSalary.advanceAmount = parseFloat(newSalary.advanceAmount);
      //console.log(newSalary);
      // Calculate total additions
      const totalAdditions = newSalary.paymentStructure.additions.reduce(
        (total: number, addition: { amount: number }) =>
          total + addition.amount,
        0
      );

      // Calculate total deductions
      const totalDeductions = newSalary.paymentStructure.deductions.reduce(
        (total: number, deduction: { amount: number }) =>
          total + deduction.amount,
        0
      );

      // Calculate final salary with payment structures
      newSalary.finalSalary =
        newSalary.basic +
        newSalary.ot.amount -
        newSalary.noPay.amount -
        newSalary.advanceAmount +
        totalAdditions -
        totalDeductions;

      const body = {
        ...newSalary,
        ot: newSalary.ot,
        noPay: newSalary.noPay,
      };

      try {
        // Perform POST request to update the employee
        const response = await fetch("/api/salaries", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok) {
          setSnackbarMessage(
            result.message || "Error saving salary. Please try again."
          );
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        }
        //reset newsalary

        newSalary.ot = newSalary.ot.amount;
        newSalary.noPay = newSalary.noPay.amount;
      } catch (error) {
        console.error("Error saving salary:", error);
        setSnackbarMessage("Error saving salary. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
      // }
      //console.log(newEmployee);

      // Success feedback
      setSnackbarMessage(
        `Employee ${newSalary.memberNo} - updated successfully!`
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      return newSalary;
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
    const updatedSalaries = salaries.map((salary) => {
      if (salary.id === params.id) {
        return params.oldRow; // Revert to old row data
      }
      return salary;
    });

    // Log error and revert row updates
    console.error("Row update error:", params.error?.error || params.error);

    setSalaries(updatedSalaries); // Update state with reverted data

    // Display the error details in Snackbar
    setSnackbarMessage(
      params.error?.message || "An unexpected error occurred." // Show detailed error message
    );
    setSnackbarSeverity("error"); // Set snackbar severity to error
    setSnackbarOpen(true); // Open Snackbar
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryIds, setSalaryIds] = useState<string[]>([]);

  const handleDeleteClick = (salayId: string) => {
    setSalaryIds([salayId]);
    setDialogOpen(true);
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      // Perform the delete action here
      console.log(`Deleting salary record`);
      await onDeleteClick(salaryIds);
    }
    setDialogOpen(false);
  };

  interface ConfirmationDialogProps {
    open: boolean;
    onClose: (confirmed: boolean) => void;
    title: string;
    message: string;
  }

  const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onClose,
    title,
    message,
  }) => {
    const handleConfirm = () => {
      onClose(true);
    };

    const handleCancel = () => {
      onClose(false);
    };

    return (
      <Dialog open={open} onClose={() => onClose(false)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="primary">
            Cancel
          </Button>
          <LoadingButton
            onClick={handleConfirm}
            color="primary"
            loading={loading}
          >
            Confirm
          </LoadingButton>
        </DialogActions>
      </Dialog>
    );
  };

  const onDeleteClick = async (salaryIds: string[]) => {
    setLoading(true);
    try {
      // Perform DELETE request to delete the salary record
      const response = await fetch(`/api/salaries/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salaryIds: salaryIds,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbarMessage("Salary record deleted successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 200));
        //remove row
        setSalaries(
          salaries.filter((salary) => !salaryIds.includes(salary.id))
        );
      } else {
        // Handle validation or other errors returned by the API
        setSnackbarMessage(
          result.message || "Error deleting salary. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error deleting salary:", error);

      setSnackbarMessage("Error deleting salary. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    setSalaryIds(rowSelectionModel as string[]);
    setDialogOpen(true);
  };

  return (
    <Box
      sx={{
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {loading && <CircularProgress />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!loading && !error && (
        <div>
          {isEditing && rowSelectionModel.length > 0 && (
            <Button
              sx={{
                mb: 1,
              }}
              variant="outlined"
              color="error"
              onClick={deleteSelected}
              startIcon={
                <DeleteOutline
                  style={{ marginRight: "8px" }}
                  color="error"
                  fontSize="small"
                />
              }
            >
              Delete Selected
            </Button>
          )}

          <DataGrid
            rows={salaries}
            columns={columns}
            sx={{
              height: period ? 400 : "calc(100vh - 230px)",
            }}
            //autoPageSize
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
            //disableColumnFilter
            disableDensitySelector
            processRowUpdate={handleRowUpdate}
            onProcessRowUpdateError={handleRowUpdateError}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) =>
              setColumnVisibilityModel(newModel)
            }
            onRowSelectionModelChange={(newModel) =>
              setRowSelectionModel(newModel)
            }
          />
        </div>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        //TransitionComponent={(props) => <Slide {...props} direction="up" />}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <ConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the salary record(s) ?`}
      />
    </Box>
  );
};

export default SalariesDataGrid;
