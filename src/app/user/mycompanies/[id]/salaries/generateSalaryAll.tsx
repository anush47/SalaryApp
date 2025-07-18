import { Autorenew, Save } from "@mui/icons-material";
import {
  // Alert, // Removed if only for snackbar
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  Grid,
  // Snackbar, // Removed
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Salary } from "./salariesDataGrid";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import EmployeesInclude from "./employeesInclude";
import GeneratedSalaries from "./generatedSalaries";
import { LoadingButton } from "@mui/lab";
import { UploadInOutBtn, ViewUploadedInOutBtn } from "./csvUpload";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar
import { useQueryClient } from "@tanstack/react-query";

const GenerateSalaryAll = ({
  period,
  companyId,
}: {
  period: string;
  companyId: string;
}) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [inOut, setInOut] = useState<string>("");
  const [generatedSalaries, setGeneratedSalaries] = useState<Salary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeIds, setEmployeeIds] = useState<String[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch employees");
        }
        const data = await response.json();
        const employeesWithId = data.employees.map((employee: any) => ({
          ...employee,
          id: employee._id,
          include: employee.active,
        }));
        setEmployees(employeesWithId);

        const activeEmployeeIds = employeesWithId
          .filter((employee: any) => employee.active)
          .map((employee: any) => employee.id);
        setEmployeeIds(activeEmployeeIds);
      } catch (error) {
        showSnackbar({
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [companyId, showSnackbar]);

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
    console.log(transformedSalaries);
    try {
      const response = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salaries: transformedSalaries,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar({
          message: "Salary records saved successfully!",
          severity: "success",
        });
        queryClient.invalidateQueries({ queryKey: ["salaries", companyId] });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setErrors({});
        setGeneratedSalaries([]);
      } else {
        showSnackbar({
          message: result.message || "Error saving salary. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error saving salary:", error);
      showSnackbar({
        message: "Error saving salary. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIncludeChange = (employeeId: String) => {
    setEmployeeIds((prevEmployeeIds) =>
      prevEmployeeIds.includes(employeeId)
        ? prevEmployeeIds.filter((id) => id !== employeeId)
        : [...prevEmployeeIds, employeeId]
    );
  };

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
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
          .map((employeeId) => employees.find((e) => e.id === employeeId)?.name)
          .filter(Boolean)
          .join(", ");

        showSnackbar({
          message: `Salaries for employees (${alreadyGeneratedEmployeeNames}) have already been generated for this period.`,
          severity: "warning",
        });
        return;
      }

      const calcEmployees = employees.filter(
        (employee) =>
          employee.otMethod === "calc" && employeeIds.includes(employee.id)
      );
      if (calcEmployees.length > 0 && !inOut) {
        const calcEmployeeNames = calcEmployees
          .map((employee) => employee.name)
          .join(", ");
        showSnackbar({
          message: `InOut required for calculated OT for employees: ${calcEmployeeNames}`,
          severity: "error",
        });
        return;
      }

      const response = await fetch(`/api/salaries/generate`, {
        method: "POST",
        body: JSON.stringify({
          companyId,
          employees: employeeIds,
          period,
          inOut,
        }),
      });
      console.log(response);
      if (!response.ok) {
        const data = await response.json();
        if (
          typeof data?.message === "string" &&
          data.message.startsWith("Month not Purchased")
        ) {
          throw new Error(data.message);
        } else {
          throw new Error("Failed to fetch Salary");
        }
      }
      const data = await response.json();
      console.log(data);
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
              employees.find((e) => e.id === employeeId)?.name
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
          const employee = employees.find((e) => e.id === salary.employee);

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
      queryClient.invalidateQueries({ queryKey: ["salaries", companyId, period] });
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
              <Typography variant="h5">Generated Salary Information</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title="Save new salary record" arrow>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Save />}
                    onClick={onSaveClick}
                    disabled={
                      loading ||
                      (generatedSalaries && generatedSalaries.length <= 0)
                    }
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Save"}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <UploadInOutBtn inOut={inOut} setInOut={setInOut} />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <ViewUploadedInOutBtn
                  inOut={inOut}
                  openDialog={openDialog}
                  setOpenDialog={setOpenDialog}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <LoadingButton
                  variant="contained"
                  color="primary"
                  loading={loading}
                  loadingPosition="center"
                  endIcon={<Autorenew />}
                  onClick={onGenerateClick}
                >
                  <span>Generate</span>
                </LoadingButton>
              </FormControl>
            </Grid>
          </Grid>
          <hr className="my-2" />
          <EmployeesInclude
            companyId={companyId}
            employees={employees}
            employeeIds={employeeIds}
            handleIncludeChange={handleIncludeChange}
          />
          <hr className="my-2" />
          {generatedSalaries && generatedSalaries.length > 0 && (
            <GeneratedSalaries
              generatedSalaries={generatedSalaries}
              setGeneratedSalaries={setGeneratedSalaries}
              loading={loading}
              setLoading={setLoading}
              error={null}
            />
          )}
        </CardContent>
      </Card>
      {/* Snackbar component removed, global one will be used */}
    </>
  );
};

export default GenerateSalaryAll;
