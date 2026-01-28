import { Autorenew, Save, Info, Warning, CheckCircle } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  Grid,
  Tooltip,
  Typography,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { Salary } from "./salariesDataGrid";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import EmployeesInclude from "./employeesInclude";
import GeneratedSalaries from "./generatedSalaries";
import { LoadingButton } from "@mui/lab";
import { UploadInOutBtn, ViewUploadedInOutBtn } from "./csvUpload";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME, GC_TIME } from "@/app/lib/consts";
import { fetchEmployees, generateSalaries, saveSalaries } from "@/app/lib/api";

const GenerateSalaryAll = ({
  period,
  companyId,
  user,
  selectedEmployeeId,
  employees: employeesProp,
  isLoading: isLoadingProp,
}: {
  period: string;
  companyId: string;
  user: { id: string; name: string; email: string; role: string };
  selectedEmployeeId?: string;
  employees?: Employee[];
  isLoading?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [inOut, setInOut] = useState<string>("");
  const [generatedSalaries, setGeneratedSalaries] = useState<Salary[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [useLiveAttendance, setUseLiveAttendance] = useState(true);

  // Transform props to match local Employee type expectations if needed
  const employees = React.useMemo(() => {
    if (!employeesProp) return [];
    return employeesProp.map(e => ({
      ...e,
      id: e._id || (e as any).id,
      active: e.active !== false,
      include: e.active !== false
    }));
  }, [employeesProp]);

  const isLoading = isLoadingProp || false;
  const isError = false; // Error handled by parent or simplified here

  useEffect(() => {
    if (employees) {
      if (selectedEmployeeId && selectedEmployeeId !== 'all') {
        setEmployeeIds([selectedEmployeeId]);
        return;
      }

      const activeEmployeeIds = (Array.isArray(employees) ? employees : [])
        .filter((employee: any) => employee.active !== false)
        .map((employee: any) => employee.id);
      setEmployeeIds(activeEmployeeIds);
    }
  }, [employees, selectedEmployeeId]);

  const onSaveClick = async () => {
    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      return;
    }

    setLoading(true);
    const transformedSalaries = generatedSalaries.map((salary: any) => ({
      ...salary,
      ot: {
        amount: salary.ot,
        reason: salary.otReason,
      },
      noPay: {
        amount: salary.noPay,
        reason: salary.noPayReason,
      },
    }));
    try {
      const result = await saveSalaries(transformedSalaries);

      showSnackbar({
        message: "Salary records saved successfully!",
        severity: "success",
      });
      const queryKey = [
        "salaries",
        ...(user.role === "admin" ? [companyId] : []),
      ];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setErrors({});
      setGeneratedSalaries([]);
    } catch (error) {
      showSnackbar({
        message: "Error saving salary. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIncludeChange = (employeeId: string) => {
    setEmployeeIds((prevEmployeeIds) =>
      prevEmployeeIds.includes(employeeId)
        ? prevEmployeeIds.filter((id) => id !== employeeId)
        : [...prevEmployeeIds, employeeId]
    );
  };

  const onGenerateClick = async () => {
    try {
      setLoading(true);
      const alreadyGenerated = employeeIds.some((employeeId) =>
        generatedSalaries.some(
          (salary) => salary.employee === employeeId && salary.period === period
        )
      );

      if (alreadyGenerated) {
        const alreadyGeneratedEmployeeNames = employeeIds
          .filter((employeeId) =>
            generatedSalaries.some(
              (salary) =>
                salary.employee === employeeId && salary.period === period
            )
          )
          .map(
            (employeeId) => employees?.find((e) => e.id === employeeId)?.name
          )
          .filter(Boolean)
          .join(", ");

        showSnackbar({
          message: `Salaries for employees (${alreadyGeneratedEmployeeNames}) have already been generated for this period.`,
          severity: "warning",
        });
        return;
      }

      const calcEmployees = Array.isArray(employees)
        ? employees.filter(
          (employee) =>
            employee.calculationMethod === "attendance" && employeeIds.includes(employee.id)
        )
        : [];

      const data = await generateSalaries({
        companyId,
        employees: employeeIds,
        period,
        inOut: useLiveAttendance ? undefined : inOut,
        useLiveAttendance,
        save: false,
      });

      if (
        (!data.salaries[0] ||
          !data.salaries[0].employee ||
          !data.salaries[0].period) &&
        !(data.exists && data.exists.length > 0)
      ) {
        throw new Error("Invalid Salary Data");
      }

      if (data.exists && data.exists.length > 0) {
        let msg = "Salary already exists:\n";

        msg += data.exists
          .map(
            (employeeId: string) =>
              employees?.find((e) => e.id === employeeId)?.name
          )
          .filter(Boolean)
          .join(", ");

        showSnackbar({ message: msg, severity: "warning" });
      }

      data.salaries.forEach(
        (salary: {
          ot: any;
          otReason: string;
          noPayReason: string;
          noPay: any;
          id: string;
          _id: string;
          employee: any;
          memberNo: number | undefined;
          name: string | undefined;
          nic: string | undefined;
          inOut:
          | {
            in: string | Date;
            out: string | Date;
            workingHours: number;
            otHours: number;
            ot: number;
            noPay: number;
            holiday: string;
            description: string;
          }[]
          | undefined;
        }) => {
          const employee = employees?.find((e) => e.id === salary.employee);

          salary.id = salary._id;
          salary.otReason = salary.ot.reason;
          salary.ot = salary.ot.amount;
          salary.noPayReason = salary.noPay.reason;
          salary.noPay = salary.noPay.amount;
          salary.memberNo = employee?.memberNo;
          salary.name = employee?.name;
          salary.nic = employee?.nic;
        }
      );

      setGeneratedSalaries([...generatedSalaries, ...data.salaries]);

      // Show informative message about attendance
      const attendanceEmployees = calcEmployees.length;
      if (attendanceEmployees > 0 && useLiveAttendance) {
        showSnackbar({
          message: `Generated salaries using live attendance data for ${attendanceEmployees} employee(s)`,
          severity: "success",
        });
      }
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "Error fetching Salary.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const attendanceBasedEmployees = Array.isArray(employees)
    ? employees.filter(
      (employee) => employee.calculationMethod === "attendance" && employeeIds.includes(employee.id)
    )
    : [];

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <Typography variant="h5">Salary Generation</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title="Save new salary record" arrow>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Save />}
                    onClick={onSaveClick}
                    disabled={
                      isLoading ||
                      loading ||
                      (generatedSalaries && generatedSalaries.length <= 0)
                    }
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {loading || isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Stack spacing={3}>
            {/* Attendance Status Info */}
            {attendanceBasedEmployees.length > 0 && (
              <Alert
                severity="info"
                icon={<Info />}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Attendance-Based Calculation
                </Typography>
                <Typography variant="body2">
                  {attendanceBasedEmployees.length} employee(s) use attendance-based calculation.
                  {useLiveAttendance
                    ? " Live attendance data will be fetched automatically from the database."
                    : " Using CSV upload for attendance data."}
                </Typography>
                {useLiveAttendance && (
                  <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: "italic" }}>
                    💡 Tip: Ensure attendance records exist for the selected period before generating salaries.
                  </Typography>
                )}
              </Alert>
            )}

            {/* Generation Controls */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LoadingButton
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  loading={loading || isLoading}
                  loadingPosition="center"
                  startIcon={<Autorenew />}
                  onClick={onGenerateClick}
                  sx={{ py: 1.5 }}
                >
                  <span>Generate Salaries</span>
                </LoadingButton>
              </Grid>
            </Grid>

            {/* Legacy CSV Upload - Collapsed by default */}
            {attendanceBasedEmployees.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1">
                      Legacy: CSV Upload (Optional)
                    </Typography>
                    <Chip
                      label="Deprecated"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    CSV upload is deprecated. The system now uses live attendance data from the database automatically.
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <UploadInOutBtn
                          inOut={inOut}
                          setInOut={(value) => {
                            setInOut(value);
                            setUseLiveAttendance(false);
                          }}
                        />
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <ViewUploadedInOutBtn
                          inOut={inOut}
                          openDialog={openDialog}
                          setOpenDialog={setOpenDialog}
                          companyId={companyId}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>
                  {inOut && (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        setInOut("");
                        setUseLiveAttendance(true);
                      }}
                    >
                      Clear CSV & Use Live Attendance
                    </Button>
                  )}
                </AccordionDetails>
              </Accordion>
            )}

            <hr className="my-2" />

            {/* Employee Selection */}
            <EmployeesInclude
              companyId={companyId}
              employees={employees || []}
              employeeIds={employeeIds}
              handleIncludeChange={handleIncludeChange}
            />

            <hr className="my-2" />

            {/* Generated Salaries Display */}
            {generatedSalaries && generatedSalaries.length > 0 && (
              <GeneratedSalaries
                generatedSalaries={generatedSalaries}
                setGeneratedSalaries={setGeneratedSalaries}
                loading={loading || isLoading}
                setLoading={setLoading}
                companyId={companyId}
                error={null}
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
};

export default GenerateSalaryAll;
