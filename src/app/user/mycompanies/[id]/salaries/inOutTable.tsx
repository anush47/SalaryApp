import { Add, Autorenew, DeleteOutline, ExpandMore } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";

const DateTimeFormat = ({ date }: { date: string }) => {
  const dateObj = dayjs(date.slice(0, 23), "YYYY-MM-DDTHH:mm:ss.SSS");
  const formattedDate = dateObj.format("MM-DD");
  const time = dateObj.format("hh:mm A");

  return (
    <Chip
      label={`${time} | ${formattedDate}`} // Combine time and date with a separator
      variant="outlined" // Use outlined variant for a subtle effect
      color="default"
      style={{
        fontSize: "12px", // Set a smaller font size
        padding: "6px 10px", // Add padding for a better appearance
        borderRadius: "16px", // Rounded corners
        margin: "4px", // Space around the chip
      }}
    />
  );
};

//inout interface
export interface InOut {
  id: any;
  employeeName: string | undefined;
  employeeNIC: string | undefined;
  basic: number;
  divideBy: number;
  in: string;
  out: string;
  workingHours: number;
  otHours: number;
  ot: number;
  noPay: number;
  holiday: string;
  description: string;
  remark: string;
}

export const InOutTable = ({
  inOuts,
  setInOuts,
  fetchSalary,
  editable,
}: {
  inOuts: InOut[];
  setInOuts: any;
  fetchSalary: any;
  editable: boolean;
}) => {
  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({
      id: false,
      employeeName: false,
      employeeNIC: false,
      workingHours: false,
      otHours: false,
      holiday: false,
      description: true,
      delete: false,
    });

  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);

  const [newInOut, setNewInOut] = useState<InOut>(
    inOuts.length > 0
      ? {
          id: inOuts[inOuts.length - 1].id + 1,
          employeeName: inOuts[inOuts.length - 1].employeeName,
          employeeNIC: inOuts[inOuts.length - 1].employeeNIC,
          basic: inOuts[inOuts.length - 1].basic,
          divideBy: inOuts[inOuts.length - 1].divideBy,
          in: dayjs().toISOString(),
          out: dayjs().toISOString(),
          workingHours: 0,
          otHours: 0,
          ot: 0,
          noPay: 0,
          holiday: "",
          description: "",
          remark: "",
        }
      : {
          id: 0,
          employeeName: "",
          employeeNIC: "",
          basic: 0,
          divideBy: 0,
          in: dayjs().toISOString(),
          out: dayjs().toISOString(),
          workingHours: 0,
          otHours: 0,
          ot: 0,
          noPay: 0,
          holiday: "",
          description: "",
          remark: "",
        }
  );
  const [loading, setLoading] = useState(false);

  const columns: GridColDef[] = [
    { field: "employeeName", headerName: "Employee", flex: 1 },
    { field: "employeeNIC", headerName: "NIC", flex: 1 },
    {
      field: "in",
      headerName: "In",
      flex: 1,
      editable: editable,
      // Render cell for displaying the formatted date
      renderCell(params) {
        return <DateTimeFormat date={params.value} />;
      },
      renderEditCell(params) {
        // Create a dayjs object from the value without considering timezone
        //remove z and get date and time seperately
        const date = dayjs(
          params.value.slice(0, 23),
          "YYYY-MM-DDTHH:mm:ss.SSS"
        );

        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              // Use the dayjs object directly
              value={date.isValid() ? date : null} // Ensure the value is valid
              onChange={(newDate) => {
                if (newDate && newDate.isValid()) {
                  params.api.setEditCellValue({
                    id: params.id,
                    field: params.field,
                    value: newDate.format("YYYY-MM-DDTHH:mm:ss.SSS"), // Store the value as a string
                  });
                }
              }}
            />
          </LocalizationProvider>
        );
      },
    },
    {
      field: "out",
      headerName: "Out",
      flex: 1,
      editable: editable,
      // Render cell for displaying the formatted date
      renderCell(params) {
        return <DateTimeFormat date={params.value} />;
      },
      renderEditCell(params) {
        // Create a dayjs object from the value without considering timezone
        //remove z and get date and time seperately
        const date = dayjs(
          params.value.slice(0, 23),
          "YYYY-MM-DDTHH:mm:ss.SSS"
        );

        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              // Use the dayjs object directly
              value={date.isValid() ? date : null} // Ensure the value is valid
              onChange={(newDate) => {
                if (newDate && newDate.isValid()) {
                  params.api.setEditCellValue({
                    id: params.id,
                    field: params.field,
                    value: newDate.format("YYYY-MM-DDTHH:mm:ss.SSS"), // Store the value as a string
                  });
                }
              }}
            />
          </LocalizationProvider>
        );
      },
    },
    {
      field: "day",
      headerName: "Day",
      flex: 1,
      renderCell(params) {
        return dayjs(params.row.in.split("T")[0]).format("ddd");
      },
    },
    {
      field: "workingHours",
      headerName: "Working Hours",
      flex: 1,
      renderCell(params) {
        return params.value.toFixed(2);
      },
    },
    {
      field: "otHours",
      headerName: "OT Hours",
      type: "number",
      flex: 1,
      renderCell(params) {
        return params.value.toFixed(2);
      },
    },
    {
      field: "ot",
      headerName: "OT",
      flex: 1,
      type: "number",
      renderCell(params) {
        return params.value.toFixed(2);
      },
    },
    {
      field: "noPay",
      headerName: "No Pay",
      flex: 1,
      editable,
      type: "number",
      renderCell(params) {
        return params.value.toFixed(2);
      },
    },
    {
      field: "holiday",
      headerName: "Holiday",
      flex: 1,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
    },
    {
      field: "remark",
      headerName: "Remark",
      flex: 1,
      editable: editable,
    },
    {
      //delete
      field: "delete",
      headerName: "Delete",
      renderCell(params) {
        return (
          <IconButton
            color="error"
            onClick={() => handleDeleteClick(params.row.id)} // Show confirmation dialog
            disabled={!editable}
          >
            <DeleteOutline />
          </IconButton>
        );
      },
    },
  ];

  const [edited, setEdited] = useState(false);

  const handleRowUpdate = async (newInOut: any) => {
    try {
      // Ensure 'in' and 'out' fields have 'Z' at the end if not present
      if (!newInOut.in.endsWith("Z")) {
        newInOut.in += "Z";
      }
      if (!newInOut.out.endsWith("Z")) {
        newInOut.out += "Z";
      }

      setEdited(true);

      // Perform the update operation
      const newInOuts = inOuts.map((inOut) => {
        if (inOut.id === newInOut.id) {
          return newInOut;
        }
        return inOut;
      });
      setInOuts(newInOuts);
      return newInOut;
    } catch (error: any) {
      // Pass the error details along
      throw {
        message:
          error?.message || "An error occurred while updating the employee.",
        error: error,
      };
    }
  };

  const [openDelete, setOpenDelete] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  // State for storing the ids of the items to delete (support for multiple)
  const [deleteIds, setDeleteIds] = useState<(string | null)[]>([]);

  // Handle click for deleting a single row (opens dialog)
  const handleDeleteClick = (id: string | null) => {
    setDeleteIds([id]); // Store single ID in an array
    setOpenDelete(true); // Open the dialog
  };

  // Handle click for deleting multiple rows (opens dialog)
  const handleMultipleDeleteClick = (
    rowSelectionModel: GridRowSelectionModel
  ) => {
    setDeleteIds([...rowSelectionModel] as string[]); // Store multiple selected IDs in the array
    setOpenDelete(true); // Open the dialog
  };

  // Confirm deletion of selected rows (single or multiple)
  const handleConfirmDelete = () => {
    const newInOuts = inOuts.filter((inOut) => !deleteIds.includes(inOut.id));
    setInOuts(newInOuts); // Update the state with filtered data
    setEdited(true);
    setOpenDelete(false); // Close the dialog
  };

  // Close the dialog without deleting anything
  const handleDeleteClose = () => {
    setOpenDelete(false); // Close the dialog
  };

  //close without adding
  const handleAddClose = () => {
    setOpenAdd(false);
  };

  //confirm add
  const handleConfirmAdd = () => {
    const newInOutRecord: InOut = {
      ...newInOut,
      id: inOuts.length > 0 ? inOuts[inOuts.length - 1].id + 1 : 0,
      //add z to in and out if necessary
      in: newInOut.in.endsWith("Z") ? newInOut.in : newInOut.in + "Z",
      out: newInOut.out.endsWith("Z") ? newInOut.out : newInOut.out + "Z",
    };

    setInOuts([...inOuts, newInOutRecord]);
    setEdited(true);
    setOpenAdd(false);
  };

  //calculate function
  const handleCalculate = async () => {
    try {
      setLoading(true);
      await fetchSalary(true);
      setEdited(false);
    } catch (error) {
      console.error("Error during calculation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="panel1-content"
        id="panel1-header"
      >
        <Typography variant="h5">In Out Details</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: editable ? "flex" : "none",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 1,
          }}
        >
          <Tooltip title="Delete Selected In-Out records" arrow>
            <Button
              variant="outlined"
              color="error"
              onClick={
                rowSelectionModel.length === 1
                  ? () => handleDeleteClick(rowSelectionModel[0] as string)
                  : () => handleMultipleDeleteClick(rowSelectionModel)
              }
              disabled={!editable || rowSelectionModel.length === 0}
              startIcon={<DeleteOutline />}
            >
              Delete Selected
            </Button>
          </Tooltip>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {edited && (
              <Tooltip title="Calculate Salary based on In-Outs" arrow>
                <LoadingButton
                  variant="contained"
                  onClick={async () => {
                    await handleCalculate();
                  }}
                  disabled={!editable}
                  startIcon={<Autorenew />}
                  loading={loading}
                  loadingPosition="start"
                >
                  Calculate
                </LoadingButton>
              </Tooltip>
            )}
            <Tooltip title="Add new In-Out record" arrow>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setOpenAdd(true)}
                disabled={!editable}
              >
                Add Record
              </Button>
            </Tooltip>
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            height: "calc(100vh - 230px)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <DataGrid
            rows={inOuts}
            columns={columns}
            editMode="row"
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 31,
                },
              },
              filter: {
                filterModel: {
                  items: [],
                  quickFilterExcludeHiddenColumns: false,
                },
              },
            }}
            pageSizeOptions={[5, 10, 31]}
            slots={{
              toolbar: (props) => (
                <GridToolbar
                  {...props}
                  // csvOptions={{ disableToolbarButton: true }}
                  printOptions={{ disableToolbarButton: true }}
                />
              ),
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
              },
            }}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) =>
              setColumnVisibilityModel(newModel)
            }
            processRowUpdate={handleRowUpdate}
            disableRowSelectionOnClick
            disableDensitySelector
            checkboxSelection={editable}
            onRowSelectionModelChange={(newModel) =>
              setRowSelectionModel(newModel)
            }
          />
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={openDelete} onClose={handleDeleteClose}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this record?
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={openAdd} onClose={handleAddClose} fullWidth>
          <DialogTitle>Add Record</DialogTitle>
          <DialogContent>
            <Grid my={3} container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DateTimePicker
                      label="In time"
                      value={dayjs(newInOut?.in)}
                      onChange={
                        (date) =>
                          setNewInOut({
                            ...newInOut,
                            in: date
                              ? date.format("YYYY-MM-DDTHH:mm:ss.SSS")
                              : newInOut.in,
                          }) // Store the value as a string
                      }
                    />
                  </LocalizationProvider>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DateTimePicker
                      label="Out time"
                      value={dayjs(newInOut?.out)}
                      minDate={newInOut?.in ? dayjs(newInOut?.in) : undefined}
                      onChange={
                        (date) =>
                          setNewInOut({
                            ...newInOut,
                            out: date
                              ? date.format("YYYY-MM-DDTHH:mm:ss.SSS")
                              : newInOut.out,
                          }) // Store the value as a string
                      }
                    />
                  </LocalizationProvider>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <TextField
                    label="Details"
                    name="designation"
                    variant="filled"
                    multiline
                    rows={2}
                    value={newInOut?.description}
                    onChange={(e) =>
                      setNewInOut({
                        ...newInOut,
                        description: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddClose} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdd}
              color="success"
              variant="outlined"
              disabled={
                !newInOut?.in ||
                !newInOut?.out ||
                newInOut?.in === newInOut?.out
              }
              startIcon={<Add />}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};
