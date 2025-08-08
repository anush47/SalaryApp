import { CheckCircle, LiveHelpOutlined, Upload } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
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
import { useQuery } from "@tanstack/react-query";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { ExpandMore } from "@mui/icons-material";
import { useSnackbar } from "@/app/contexts/SnackbarContext";
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
const mapInOutDataToEmployees = (
  parsedInOutFetched: ParsedInOutEntry[] = [],
  employees: Employee[] = []
) => {
  return parsedInOutFetched.map((entry) => {
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
};
const groupInOutData = (
  mappedInOutData: {
    employeeId: string;
    memberNo: string | number;
    name: string;
    nic: string;
    timestamp: string;
    date: string;
    time: string;
  }[]
) => {
  return mappedInOutData.reduce((acc, curr) => {
    if (!acc[curr.employeeId]) {
      acc[curr.employeeId] = [];
    }
    acc[curr.employeeId].push(curr);
    return acc;
  }, {} as Record<string, typeof mappedInOutData>);
};
const validateInOutCsv = (
  inOut: string,
  employees: Employee[],
  period: string
): { valid: boolean; reason?: string; warnings?: string[] } => {
  if (!inOut || inOut.trim() === "") {
    return { valid: false, reason: "CSV content cannot be empty." };
  }
  const lines = inOut.split("\n").filter((line) => line.trim() !== "");
  const header = lines[0].toLowerCase().trim();
  if (!header.startsWith("employee,") && !header.startsWith("memberno,")) {
    return {
      valid: false,
      reason:
        "Invalid header. The header should be 'employee,timestamp' or 'memberno,timestamp'.",
    };
  }
  const warnings: string[] = [];
  const periodStart = dayjs(period).startOf("month");
  const periodEnd = dayjs(period).endOf("month");
  const prevMonthHalf = periodStart.subtract(15, "day");
  let afterPeriodCount = 0;
  let beforePeriodCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(",");
    if (parts.length < 2) {
      return {
        valid: false,
        reason: `Invalid data on line ${
          i + 1
        }. Each row must contain an employee identifier and timestamp, separated by a comma.`,
      };
    }
    const identifier = parts[0].trim();
    const timestampStr = parts[1].trim();
    if (!identifier || !timestampStr) {
      return {
        valid: false,
        reason: `Missing data on line ${
          i + 1
        }. Both identifier and timestamp are required.`,
      };
    }
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    if (!timestampRegex.test(timestampStr)) {
      return {
        valid: false,
        reason: `Invalid timestamp format on line ${
          i + 1
        }: "${timestampStr}". Expected format is YYYY-MM-DDTHH:mm:ss.`,
      };
    }
    const timestamp = dayjs(timestampStr);
    if (timestamp.isAfter(periodEnd)) {
      afterPeriodCount++;
    }
    if (timestamp.isBefore(prevMonthHalf)) {
      beforePeriodCount++;
    }
  }
  if (afterPeriodCount > 0) {
    warnings.push(
      `${afterPeriodCount} timestamp(s) are after the selected period.`
    );
  }
  if (beforePeriodCount > 0) {
    warnings.push(
      `${beforePeriodCount} timestamp(s) are before the 15th of the previous month.`
    );
  }
  const activeEmployees = employees.filter((emp) => emp.active);
  const csvMemberNos = new Set(
    lines
      .slice(1)
      .map((line) => line.split(",")[0].trim())
      .filter(Boolean)
      .map(Number)
  );
  activeEmployees.forEach((emp) => {
    if (!csvMemberNos.has(emp.memberNo)) {
      warnings.push(
        `Active employee ${emp.name} (Member No: ${emp.memberNo}) is missing from the CSV.`
      );
    }
  });
  csvMemberNos.forEach((memberNo) => {
    if (!activeEmployees.some((emp) => emp.memberNo === memberNo)) {
      warnings.push(
        `Employee with Member No: ${memberNo} from the CSV is not an active employee.`
      );
    }
  });
  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
};
export interface ParsedInOutEntry {
  employeeIdentifier: string;
  timestamp: string;
  type: "employeeId" | "memberNo";
}
export const handleCsvUpload = async (
  file: File,
  employees: Employee[],
  period: string,
  showSnackbar: (args: {
    message: string;
    severity: "error" | "warning";
  }) => void
): Promise<string> => {
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
    const validationResult = validateInOutCsv(result, employees, period);
    if (!validationResult.valid) {
      showSnackbar({
        message: validationResult.reason || "Error",
        severity: "error",
      });
      return "";
    }
    if (validationResult.warnings) {
      showSnackbar({
        message: validationResult.warnings.join("\n"),
        severity: "warning",
      });
    }
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
  employees,
  period,
}: {
  inOut: string;
  setInOut: (value: string) => void;
  employees: Employee[];
  period: string;
}) => {
  const { showSnackbar } = useSnackbar();
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
                const _inOut = await handleCsvUpload(
                  event.target.files[0],
                  employees,
                  period,
                  showSnackbar
                );
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
  const [viewMode, setViewMode] = useState<"all" | "individual">("all");
  const { data: employees, isLoading: employeesLoading } = useQuery<
    Employee[],
    Error
  >({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees(companyId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
  const parsedInOutFetched = useMemo(
    () => parseCsvString(inOutFetched),
    [inOutFetched]
  );
  const mappedInOutData = mapInOutDataToEmployees(
    parsedInOutFetched,
    employees
  );
  const groupedInOutData = groupInOutData(mappedInOutData);
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
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Member No</TableCell> <TableCell>Name</TableCell>
                  <TableCell>NIC</TableCell> <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappedInOutData.map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.memberNo}
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.nic}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
                    <TableContainer component={Paper}>
                      <Table
                        sx={{ minWidth: 400 }}
                        aria-label="employee in-out table"
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Time</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {employeeData.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{row.date}</TableCell>
                              <TableCell>{row.time}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
