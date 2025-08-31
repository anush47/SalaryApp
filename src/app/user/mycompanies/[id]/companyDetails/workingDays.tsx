import React from "react";
import {
  Box,
  Button,
  FormControl,
  Grid,
  Typography,
  Tooltip,
  Card,
  CardHeader,
  CardContent,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";

interface WorkingDaysProps {
  workingDays: {
    mon: "full" | "half" | "off";
    tue: "full" | "half" | "off";
    wed: "full" | "half" | "off";
    thu: "full" | "half" | "off";
    fri: "full" | "half" | "off";
    sat: "full" | "half" | "off";
    sun: "full" | "half" | "off";
    isDynamicHolidays: boolean;
  };
  setWorkingDays: (workingDays: {
    mon: "full" | "half" | "off";
    tue: "full" | "half" | "off";
    wed: "full" | "half" | "off";
    thu: "full" | "half" | "off";
    fri: "full" | "half" | "off";
    sat: "full" | "half" | "off";
    sun: "full" | "half" | "off";
    isDynamicHolidays: boolean;
  }) => void;
  isEditing: boolean;
}

const daysOfWeek: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const WorkingDays = ({
  workingDays,
  setWorkingDays,
  isEditing,
}: WorkingDaysProps) => {
  const theme = useTheme();

  const handleDayChange = (
    day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
  ) => {
    const currentValue = workingDays ? workingDays[day] : "off";
    const nextValue =
      currentValue === "full"
        ? "half"
        : currentValue === "half"
        ? "off"
        : "full";
    setWorkingDays({ ...workingDays, [day]: nextValue });
  };

  const getColor = (value: "full" | "half" | "off") => {
    switch (value) {
      case "full":
        return theme.palette.success.main;
      case "half":
        return theme.palette.warning.main;
      case "off":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="panel1-content"
        id="panel1-header"
      >
        <Typography variant="h5">Working Days</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          {daysOfWeek.map((day) => (
            <Grid item xs={12} sm={6} md={4} key={day}>
              <FormControl fullWidth>
                <Tooltip title={workingDays?.[day] ?? "off"}>
                  <>
                    <Button
                      variant="outlined"
                      style={{
                        borderColor: getColor(workingDays?.[day] ?? "off"),
                        color: getColor(workingDays?.[day] ?? "off"),
                      }}
                      onClick={() => handleDayChange(day)}
                      disabled={!isEditing}
                    >
                      {day.toUpperCase()}: {workingDays?.[day] ?? "off"}
                    </Button>
                  </>
                </Tooltip>
              </FormControl>
            </Grid>
          ))}
          <Grid item xs={12} sm={6} md={4} key="isDynamic">
            <FormControlLabel
              control={
                <Checkbox
                  checked={workingDays?.isDynamicHolidays || false}
                  onChange={() =>
                    setWorkingDays({
                      ...workingDays,
                      isDynamicHolidays: !workingDays?.isDynamicHolidays,
                    })
                  }
                  disabled={!isEditing}
                />
              }
              label="Dynamic Holidays"
            />
          </Grid>
        </Grid>
        <Box mt={2}></Box>
      </AccordionDetails>
    </Accordion>
  );
};
