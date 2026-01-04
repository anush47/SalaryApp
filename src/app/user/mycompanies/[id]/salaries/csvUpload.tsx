import { CheckCircle, LiveHelpOutlined, Upload } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  MenuItem,
  Select,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { ExpandMore } from "@mui/icons-material";

export interface ParsedInOutEntry {
  employeeIdentifier: string;
  timestamp: string;
  type: "employeeId" | "memberNo";
}

export const handleCsvUpload = async (file: File): Promise<string> => {
  try {
    const reader = new FileReader();

    const result = await new Promise<string>((resolve, reject) => {
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result.toString());
        } else {
          reject(new Error("Failed to read the file content"));
        }
      };

      reader.onerror = () => {
        reject(new Error("An error occurred while reading the file"));
      };

      reader.readAsText(file);
    });

    return result;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during file upload or processing"
    );
  }
};

export const UploadInOutBtn = ({
  inOut,
  setInOut,
}: {
  inOut: string;
  setInOut: (value: string) => void;
}) => {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={0.5}
      width="100%"
    >
      <Tooltip title="Choose in-out csv file to Upload">
        <Button
          variant="outlined"
          color="primary"
          component="label"
          fullWidth
          startIcon={inOut ? <CheckCircle /> : <Upload />}
        >
          {inOut ? "Re-Upload In-Out CSV" : "Upload In-Out CSV"}
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={async (event) => {
              if (event.target.files && event.target.files[0]) {
                const _inOut = await handleCsvUpload(event.target.files[0]);
                setInOut(_inOut);
              }
            }}
          />
        </Button>
      </Tooltip>
      <Tooltip title="Help with in-out csv format">
        <Button
          variant="outlined"
          color="primary"
          onClick={() => window.open("/help?section=in-out-csv", "_blank")}
        >
          <LiveHelpOutlined />
        </Button>
      </Tooltip>
    </Stack>
  );
};

export const ViewUploadedInOutBtn = ({
  inOut,
  openDialog,
  setOpenDialog,
  companyId,
}: {
  inOut: string;
  openDialog: boolean;
  setOpenDialog: (value: boolean) => void;
  companyId: string;
}) => {
  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => setOpenDialog(true)}
        disabled={!inOut || inOut === ""}
      >
        View Uploaded In-Out
      </Button>
      {inOut && inOut !== "" && (
        <ViewUploadedInOutDialog
          openDialog={openDialog}
          setOpenDialog={setOpenDialog}
          inOutFetched={inOut}
          companyId={companyId}
        />
      )}
    </>
  );
};

export const ViewUploadedInOutDialog = (props: {
  inOutFetched: string;
  openDialog: boolean;
  setOpenDialog: (value: boolean) => void;
  companyId: string;
}) => {
  const { inOutFetched, openDialog, setOpenDialog, companyId } = props;
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<"all" | "individual">("all");

  const fetchEmployees = async (companyId: string) => {
    const response = await fetch(`/api/employees?companyId=${companyId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.employees.map((employee: { _id: string }) => ({
      ...employee,
      id: employee._id,
    }));
  };

  const { data: employees, isLoading: employeesLoading } = useQuery<
    Employee[],
    Error
  >({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const parseCsvString = (csvString: string): ParsedInOutEntry[] => {
    const lines = csvString.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return [];
    }

    const header = lines[0].toLowerCase().trim();
    let type: "employeeId" | "memberNo";

    if (header.startsWith("employee,")) {
      type = "employeeId";
    } else if (header.startsWith("memberno,")) {
      type = "memberNo";
    } else {
      console.warn(
        "Invalid CSV header. Expected 'employee,timestamp' or 'memberNo,timestamp'. Falling back to 'employee,timestamp'."
      );
      type = "employeeId";
    }

    const parsedData: ParsedInOutEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const identifier = parts[0].trim();
        const timestamp = parts[1].trim();
        if (identifier && timestamp) {
          parsedData.push({
            employeeIdentifier: identifier,
            timestamp: timestamp,
            type,
          });
        }
      }
    }
    return parsedData;
  };

  const parsedInOutFetched = useMemo(
    () => parseCsvString(inOutFetched),
    [inOutFetched]
  );

  const mappedInOutData = parsedInOutFetched.map((entry) => {
    const employee = employees?.find((emp) => {
      if (entry.type === "employeeId") {
        return emp.id === entry.employeeIdentifier;
      } else {
        return emp.memberNo === Number(entry.employeeIdentifier);
      }
    });
    return {
      employeeId: employee?.id || "N/A",
      memberNo: employee?.memberNo || "N/A",
      name: employee?.name || "N/A",
      nic: employee?.nic || "N/A",
      timestamp: entry.timestamp,
      date: dayjs(entry.timestamp).format("YYYY-MM-DD"),
      time: dayjs(entry.timestamp).format("HH:mm:ss"),
    };
  });

  const groupedInOutData = mappedInOutData.reduce((acc, curr) => {
    if (!acc[curr.employeeId]) {
      acc[curr.employeeId] = [];
    }
    acc[curr.employeeId].push(curr);
    return acc;
  }, {} as Record<string, typeof mappedInOutData>);

  return (
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
      maxWidth={"xl"}
      fullWidth
    >
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Fetched In-Out</Typography>
          <Select
            value={viewMode}
            onChange={(e) =>
              setViewMode(e.target.value as "all" | "individual")
            }
            size="small"
          >
            <MenuItem value="all">Show All</MenuItem>
            <MenuItem value="individual">Show by Employee</MenuItem>
          </Select>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {employeesLoading ? (
          <CircularProgress />
        ) : viewMode === "all" ? (
          <div style={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={mappedInOutData.map((row, index) => ({ ...row, id: index }))}
              columns={[
                { field: "memberNo", headerName: "Member No", width: 120 },
                { field: "name", headerName: "Name", flex: 1, minWidth: 200 },
                { field: "nic", headerName: "NIC", width: 150 },
                { field: "date", headerName: "Date", width: 120 },
                { field: "time", headerName: "Time", width: 120 },
              ]}
              slots={{
                toolbar: (props) => (
                  <GridToolbar
                    {...props}
                    csvOptions={{ disableToolbarButton: true }}
                    printOptions={{ disableToolbarButton: true }}
                  />
                ),
              }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              disableRowSelectionOnClick
              disableDensitySelector
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
            />
          </div>
        ) : (
          <Stack spacing={2}>
            {Object.keys(groupedInOutData).map((employeeId) => {
              const employeeData = groupedInOutData[employeeId];
              const firstEntry = employeeData[0];
              return (
                <Accordion key={employeeId}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>{`${firstEntry.name} (${firstEntry.memberNo}) - ${firstEntry.nic}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <div style={{ height: 400, width: "100%" }}>
                      <DataGrid
                        rows={employeeData.map((row, index) => ({ ...row, id: index }))}
                        columns={[
                          { field: "date", headerName: "Date", flex: 1 },
                          { field: "time", headerName: "Time", flex: 1 },
                        ]}
                        disableRowSelectionOnClick
                        disableDensitySelector
                        hideFooter
                      />
                    </div>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpenDialog(false);
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
