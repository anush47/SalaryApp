"use client";
import React, { useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Tooltip,
  Card,
  CardHeader,
  CardContent,
  AccordionSummary,
  Accordion,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Add, ExpandMore, Remove } from "@mui/icons-material";

interface PaymentStructureProps {
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  paymentStructure: {
    additions: { name: string; amount: string; affectTotalEarnings: boolean }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };
  setPaymentStructure: (paymentStructure: {
    additions: { name: string; amount: string; affectTotalEarnings: boolean }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  }) => void;
  isEditing: boolean;
  isSalary?: boolean;
}

export const validateAmountNumberString = (
  value: string,
  isSalary: boolean = false
) => {
  // Regex to allow either a single number, a range (number-number), or empty string
  //if isSalary only allow number
  const regex = isSalary
    ? /^\d+$/
    : /^(\d+(\.\d{2})?|\d+(\.\d{2})?-\d+(\.\d{2})?)?$/;
  if (!regex.test(value)) {
    //if undefined
    if (value === "") return true;
    return false;
  }
  return true;
};

export const PaymentStructure = ({
  handleChange,
  paymentStructure,
  setPaymentStructure,
  isEditing,
  isSalary = false,
}: PaymentStructureProps) => {
  useEffect(() => {
    //do once only when company fetched
    setAdditions(paymentStructure?.additions);
    setDeductions(paymentStructure?.deductions);
  }, [paymentStructure]);
  const [additions, setAdditions] = React.useState(
    paymentStructure?.additions || [
      { name: "Incentive", amount: "", affectTotalEarnings: false },
      { name: "Performance Allowance", amount: "", affectTotalEarnings: false },
    ]
  );
  const [deductions, setDeductions] = React.useState(
    paymentStructure?.deductions || []
  );
  const [errors, setErrors] = React.useState<{
    additions: string[];
    deductions: string[];
  }>({ additions: [], deductions: [] });

  const handleAddField = (type: "additions" | "deductions") => {
    if (type === "additions") {
      setAdditions([
        ...additions,
        { name: "", amount: "", affectTotalEarnings: false },
      ]);
      setErrors((prev) => ({ ...prev, additions: [...prev.additions, ""] }));
    } else {
      setDeductions([
        ...deductions,
        { name: "", amount: "", affectTotalEarnings: false },
      ]);
      setErrors((prev) => ({ ...prev, deductions: [...prev.deductions, ""] }));
    }
  };

  const handleRemoveField = (
    type: "additions" | "deductions",
    index: number
  ) => {
    if (type === "additions") {
      const newAdditions = additions.filter((_, i) => i !== index);
      setAdditions(newAdditions);
      setErrors((prev) => ({
        ...prev,
        additions: prev.additions.filter((_, i) => i !== index),
      }));
      setPaymentStructure({ additions: newAdditions, deductions });
    } else {
      const newDeductions = deductions.filter((_, i) => i !== index);
      setDeductions(newDeductions);
      setErrors((prev) => ({
        ...prev,
        deductions: prev.deductions.filter((_, i) => i !== index),
      }));
      setPaymentStructure({ additions, deductions: newDeductions });
    }
  };

  const handleFieldChange = (
    type: "additions" | "deductions",
    index: number,
    field: "name" | "amount" | "affectTotalEarnings",
    value: string | boolean
  ) => {
    let newAdditions = [...additions];
    let newDeductions = [...deductions];
    let newErrors = { ...errors };

    if (type === "additions") {
      newAdditions[index] = { ...newAdditions[index], [field]: value };
      setAdditions(newAdditions);
      newErrors.additions[index] =
        (field === "amount" &&
          validateAmountNumberString(value as string, isSalary)) ||
        (field === "name" && value !== "") ||
        field === "affectTotalEarnings"
          ? ""
          : "Invalid format";
      setErrors(newErrors);
      setPaymentStructure({ additions: newAdditions, deductions });
    } else {
      newDeductions[index] = { ...newDeductions[index], [field]: value };
      setDeductions(newDeductions);
      newErrors.deductions[index] =
        (field === "amount" &&
          validateAmountNumberString(value as string, isSalary)) ||
        (field === "name" && value !== "")
          ? ""
          : "Invalid format";
      setErrors(newErrors);
      setPaymentStructure({ additions, deductions: newDeductions });
    }
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="panel1-content"
        id="panel1-header"
      >
        <Typography variant="h5">Payment Structure</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6">Additions</Typography>
            <div className="my-2"></div>
            {additions.map((addition, index) => (
              <Grid
                mb={1}
                container
                spacing={2}
                alignItems="center"
                key={index}
              >
                <Grid item xs={6} sm={5}>
                  <FormControl fullWidth>
                    <TextField
                      label="Name"
                      variant="filled"
                      value={addition.name}
                      onChange={(e) =>
                        handleFieldChange(
                          "additions",
                          index,
                          "name",
                          e.target.value
                        )
                      }
                      InputProps={{
                        readOnly: !isEditing,
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth>
                    <TextField
                      label="Amount"
                      type="text"
                      variant="filled"
                      value={addition.amount || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "additions",
                          index,
                          "amount",
                          e.target.value
                        )
                      }
                      helperText={errors.additions[index]}
                      error={!!errors.additions[index]}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">LKR</InputAdornment>
                        ),
                        readOnly: !isEditing,
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={8} sm={2}>
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={
                        <Checkbox
                          disabled={!isEditing}
                          checked={addition.affectTotalEarnings || false}
                          onChange={(e) =>
                            handleFieldChange(
                              "additions",
                              index,
                              "affectTotalEarnings",
                              e.target.checked
                            )
                          }
                        />
                      }
                      label="Total Earnings"
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={1}>
                  {isEditing && (
                    <Tooltip title="Remove" arrow>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveField("additions", index)}
                      >
                        <Remove />
                      </IconButton>
                    </Tooltip>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <hr className="mb-2" />
                </Grid>
              </Grid>
            ))}
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleAddField("additions")}
              >
                Add Addition
              </Button>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography my={1} variant="h6">
              Deductions
            </Typography>
            {deductions.map((deduction, index) => (
              <Grid
                mb={1}
                container
                spacing={2}
                alignItems="center"
                key={index}
              >
                <Grid item xs={6} sm={5}>
                  <FormControl fullWidth>
                    <TextField
                      label="Name"
                      variant="filled"
                      value={deduction.name}
                      onChange={(e) =>
                        handleFieldChange(
                          "deductions",
                          index,
                          "name",
                          e.target.value
                        )
                      }
                      InputProps={{
                        readOnly: !isEditing || deduction.name === "EPF 8%",
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth>
                    <TextField
                      label="Amount"
                      type="text"
                      variant="filled"
                      value={deduction.amount || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "deductions",
                          index,
                          "amount",
                          e.target.value
                        )
                      }
                      helperText={errors.deductions[index]}
                      error={!!errors.deductions[index]}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">LKR</InputAdornment>
                        ),
                        readOnly: !isEditing || deduction.name === "EPF 8%",
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={8} sm={2}>
                  {deduction.name !== "EPF 8%" && (
                    <Tooltip title="Include To Total Earnings" arrow>
                      <FormControl fullWidth>
                        <FormControlLabel
                          control={
                            <Checkbox
                              disabled={!isEditing}
                              checked={deduction.affectTotalEarnings || false}
                              onChange={(e) =>
                                handleFieldChange(
                                  "deductions",
                                  index,
                                  "affectTotalEarnings",
                                  e.target.checked
                                )
                              }
                            />
                          }
                          label="Total Earnings"
                        />
                      </FormControl>
                    </Tooltip>
                  )}
                </Grid>
                <Grid item xs={1}>
                  {isEditing && deduction.name !== "EPF 8%" && (
                    <Tooltip title="Remove" arrow>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveField("deductions", index)}
                      >
                        <Remove />
                      </IconButton>
                    </Tooltip>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <hr className="mb-2" />
                </Grid>
              </Grid>
            ))}
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleAddField("deductions")}
              >
                Add Deduction
              </Button>
            )}
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};
