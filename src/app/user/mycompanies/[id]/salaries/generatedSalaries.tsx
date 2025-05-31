import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import React, { useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Salary } from "./salariesDataGrid";
import { ExpandMore } from "@mui/icons-material";

interface GeneratedSalariesProps {
  generatedSalaries: Salary[];
  setGeneratedSalaries: React.Dispatch<React.SetStateAction<Salary[]>>;
  error: string | null;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const GeneratedSalaries: React.FC<GeneratedSalariesProps> = ({
  generatedSalaries,
  setGeneratedSalaries,
  error,
  loading,
  setLoading,
}) => {
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
    },
    {
      field: "basic",
      headerName: "Basic Salary",
      type: "number",
      flex: 1,
      align: "left",
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
      editable: true,
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
      field: "advanceAmount",
      headerName: "Advance",
      type: "number",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: true,
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
      editable: true,
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

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      basic: false,
      otReason: false,
      noPayReason: false,
      nic: false,
      //delete: false,
      paymentStructure: false,
      remark: false,
      ot: false,
      noPay: false,
      advanceAmount: false,
    });

  const handleRowUpdate = async (newSalary: any) => {
    try {
      newSalary.advanceAmount = parseFloat(newSalary.advanceAmount || 0);
      //set new Salary
      const newSalaries = generatedSalaries.map((salary) => {
        if (salary._id === newSalary._id) {
          salary.advanceAmount = newSalary.advanceAmount;
          salary.remark = newSalary.remark;
        }
        return salary;
      });
      setGeneratedSalaries(newSalaries);
      return newSalary;
    } catch (error: any) {
      // Add type 'any' to the 'error' object
      // Pass the error details along
      throw {
        message:
          error?.message || "An error occurred while updating the salary.",
        error: error,
      };
    }
  };

  const handleRowUpdateError = (params: any) => {
    // Revert changes if necessary
    const updatedSalaries = generatedSalaries.map((salary: { _id: any }) => {
      if (salary._id === params.id) {
        return params.oldRow; // Revert to old row data
      }
      return salary;
    });

    // Log error and revert row updates
    console.error("Row update error:", params);

    setGeneratedSalaries(updatedSalaries); // Update state with reverted data
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryId, setSalaryId] = useState("");

  const handleDeleteClick = (salayId: string) => {
    setSalaryId(salayId);
    setDialogOpen(true);
  };

  const handleDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      // Perform the delete action here
      console.log(`Deleting salary record`);
      await onDeleteClick(salaryId);
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

  const onDeleteClick = async (salaryId: string) => {
    setLoading(true);
    //remove the salary from generated salaries
    const newSalaries = generatedSalaries.filter(
      (salary) => salary.id !== salaryId
    );
    setGeneratedSalaries(newSalaries);
    setLoading(false);
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6">{`Generated Salaries - ${generatedSalaries.length}`}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            width: "100%",
            height: 400,
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
            <DataGrid
              rows={generatedSalaries}
              columns={columns}
              editMode="row"
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 5,
                  },
                },
              }}
              pageSizeOptions={[5]}
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
              disableColumnFilter
              disableDensitySelector
              processRowUpdate={handleRowUpdate}
              onProcessRowUpdateError={handleRowUpdateError}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) =>
                setColumnVisibilityModel(newModel)
              }
            />
          )}
          <ConfirmationDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            title="Confirm Deletion"
            message={`Are you sure you want to delete the salary record?`}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default GeneratedSalaries;
