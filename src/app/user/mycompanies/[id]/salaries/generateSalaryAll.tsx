import { Autorenew, Save, Upload } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  Grid,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Salary } from "./salariesDataGrid";
import { Employee } from "../employees/clientComponents/employeesDataGrid";
import EmployeesInclude from "./employeesInclude";
import GeneratedSalaries from "./generatedSalaries";
import { LoadingButton } from "@mui/lab";
import { handleCsvUpload } from "./csvUpload";
import { SimpleDialog } from "./inOutTable";

const GenerateSalaryAll = ({
  period,
  companyId,
}: {
  period: string;
  companyId: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inOut, setInOut] = useState<string>("");
  const [generatedSalaries, setGeneratedSalaries] = useState<Salary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeIds, setEmployeeIds] = useState<String[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning" | "info"
  >("success");
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
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [companyId]);

  const onSaveClick = async () => {
    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      return;
    }

    setLoading(true);
    // Transform generatedSalaries to match the desired format
    const transformedSalaries = generatedSalaries.map((salary: any) => ({
      ...salary,
      ot: {
        amount: salary.ot,
        reason: salary.otReason, // Assuming you have otReason set in the generated salary
      },
      noPay: {
        amount: salary.noPay,
        reason: salary.noPayReason, // Assuming you have noPayReason set in the generated salary
      },
    }));
    console.log(transformedSalaries);
    try {
      // Perform POST request to add a new salary record
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
        setSnackbarMessage("Salary records saved successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Wait before clearing the form
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Clear the form after successful save
        // setFormFields({
        // });
        setErrors({});
        setGeneratedSalaries([]);
      } else {
        // Handle validation or other errors returned by the API
        setSnackbarMessage(
          result.message || "Error saving salary. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error saving salary:", error);

      setSnackbarMessage("Error saving salary. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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
    setSnackbarOpen(false);
  };

  const onGenerateClick = async () => {
    try {
      setLoading(true);
      // Check for each employeeId if there is a salary with the same period and employeeId in generatedSalaries
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
          .filter(Boolean) // Remove undefined names
          .join(", ");

        setSnackbarMessage(
          `Salaries for employees (${alreadyGeneratedEmployeeNames}) have already been generated for this period.`
        );
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
        return;
      }

      //check if inOut is available for calc employees who are included
      const calcEmployees = employees.filter(
        (employee) =>
          employee.otMethod === "calc" && employeeIds.includes(employee.id)
      );
      if (calcEmployees.length > 0 && !inOut) {
        const calcEmployeeNames = calcEmployees
          .map((employee) => employee.name)
          .join(", ");
        setSnackbarMessage(
          `InOut required for calculated OT for employees: ${calcEmployeeNames}`
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }

      //use post method
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
      //check if data.salaries[0] is in correct form
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

        // Use map to generate the list of names, and join to combine them into a single string
        msg += data.exists
          .map(
            (employeeId: string) =>
              employees.find((e) => e.id === employeeId)?.name
          )
          .filter(Boolean) // Remove undefined names
          .join(", ");

        setSnackbarMessage(msg);
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
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
    } catch (error) {
      setSnackbarMessage(
        error instanceof Error ? error.message : "Error fetching Salary."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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
                <Button
                  variant="outlined"
                  color="primary"
                  component="label"
                  startIcon={<Upload />}
                >
                  Upload In-Out CSV
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (event) => {
                      if (event.target.files && event.target.files[0]) {
                        const _inOut = await handleCsvUpload(
                          event.target.files[0]
                        );
                        setInOut(_inOut);
                      }
                    }}
                  />
                </Button>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                {/* show fetched inout in a dialog */}
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setOpenDialog(true)}
                  disabled={!inOut || inOut === ""}
                >
                  View In-Out
                </Button>
                {inOut && inOut !== "" && (
                  <SimpleDialog
                    openDialog={openDialog}
                    setOpenDialog={setOpenDialog}
                    inOutFetched={inOut}
                  />
                )}
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
              error={error}
            />
          )}
        </CardContent>
      </Card>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        //TransitionComponent={SlideTransition}
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
    </>
  );
};

export default GenerateSalaryAll;
