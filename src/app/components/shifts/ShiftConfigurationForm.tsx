"use client";
import React, { useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography,
    IconButton,
    Collapse,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormHelperText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import { Add, Delete, Edit, ExpandMore, ExpandLess, AccessTime } from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";

export interface Shift {
    _id?: string;
    name: string;
    type: "fixed" | "dynamic";
    startTime?: string;
    endTime?: string;
    duration?: number;
    breakDuration: number;
    minStartTime?: string;
    maxStartTime?: string;
    minEndTime?: string;
    maxEndTime?: string;
    maxDuration?: number;
}

export interface ShiftSettingsData {
    mode: "fixed" | "dynamic" | "roster" | "manual";
    shifts: Shift[];
    defaultShiftId?: string;
    autoSelect: boolean;
}

interface ShiftConfigurationFormProps {
    settings: ShiftSettingsData;
    onChange: (settings: ShiftSettingsData) => void;
    isEditing: boolean;
}

export const ShiftConfigurationForm = ({
    settings,
    onChange,
    isEditing,
}: ShiftConfigurationFormProps) => {
    const [openShiftDialog, setOpenShiftDialog] = useState(false);
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const handleModeChange = (event: React.ChangeEvent<HTMLInputElement | any> | any) => {
        onChange({
            ...settings,
            mode: event.target.value,
        });
    };

    const handleAutoSelectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...settings,
            autoSelect: event.target.checked,
        });
    };

    const handleAddShift = () => {
        setCurrentShift({
            name: "",
            type: "fixed",
            breakDuration: 1,
            startTime: "08:00",
            endTime: "17:00",
        });
        setEditingIndex(-1);
        setOpenShiftDialog(true);
    };

    const handleEditShift = (index: number) => {
        setCurrentShift({ ...settings.shifts[index] });
        setEditingIndex(index);
        setOpenShiftDialog(true);
    };

    const handleDeleteShift = (index: number) => {
        const newShifts = settings.shifts.filter((_, i) => i !== index);
        onChange({ ...settings, shifts: newShifts });
    };

    const handleSaveShift = () => {
        if (!currentShift) return;

        // Basic Validation
        if (!currentShift.name) return;

        const shiftToSave = { ...currentShift };
        if (!shiftToSave._id) {
            shiftToSave._id = uuidv4();
        }

        const newShifts = [...settings.shifts];
        if (editingIndex >= 0) {
            newShifts[editingIndex] = shiftToSave;
        } else {
            newShifts.push(shiftToSave);
        }

        onChange({ ...settings, shifts: newShifts });
        setOpenShiftDialog(false);
        setCurrentShift(null);
    };

    const handleSetDefault = (shiftId?: string) => {
        onChange({ ...settings, defaultShiftId: shiftId });
    };

    return (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h5">Shifts Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>

                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Scheduling Mode</InputLabel>
                            <Select
                                value={settings.mode || "fixed"}
                                label="Scheduling Mode"
                                onChange={handleModeChange}
                                readOnly={!isEditing}
                            >
                                <MenuItem value="fixed">Fixed Schedule</MenuItem>
                                <MenuItem value="dynamic">Dynamic (Check-in based)</MenuItem>
                                <MenuItem value="roster">Roster / Assignments</MenuItem>
                                <MenuItem value="manual">Manual Selection</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.autoSelect}
                                        onChange={handleAutoSelectChange}
                                        disabled={!isEditing}
                                    />
                                }
                                label="Smart Auto-Select Shift"
                            />
                            <FormHelperText>Automatically select shift based on check-in time</FormHelperText>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle1">Shift Pool</Typography>
                            {isEditing && (
                                <Button variant="outlined" startIcon={<Add />} onClick={handleAddShift}>
                                    Add Shift
                                </Button>
                            )}
                        </Box>

                        <Grid container spacing={2}>
                            {settings.shifts?.map((shift, index) => (
                                <Grid item xs={12} md={6} key={index}>
                                    <Card variant="outlined" sx={{ position: 'relative' }}>
                                        <CardContent>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                <Box>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Typography variant="h6">{shift.name}</Typography>
                                                        <Chip
                                                            label={shift.type === 'fixed' ? 'Fixed' : 'Dynamic'}
                                                            size="small"
                                                            color={shift.type === 'fixed' ? 'primary' : 'secondary'}
                                                            variant="outlined"
                                                        />
                                                        {settings.defaultShiftId === shift._id && (
                                                            <Chip label="Default" size="small" color="success" />
                                                        )}
                                                    </Box>

                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                        {shift.type === 'fixed' ? (
                                                            <>
                                                                <AccessTime fontSize="small" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
                                                                {shift.startTime} - {shift.endTime} (Break: {shift.breakDuration}h)
                                                            </>
                                                        ) : (
                                                            <>
                                                                Duration: {shift.duration}h (Break: {shift.breakDuration}h)
                                                            </>
                                                        )}
                                                    </Typography>
                                                </Box>
                                                {isEditing && (
                                                    <Box>
                                                        <IconButton size="small" onClick={() => handleEditShift(index)}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteShift(index)}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </Box>
                                            {isEditing && settings.defaultShiftId !== shift._id && (
                                                <Button size="small" onClick={() => handleSetDefault(shift._id)} sx={{ mt: 1 }}>
                                                    Set as Default
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {settings.shifts?.length === 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary" align="center">
                                        No shifts configured. Add a shift to get started.
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                {/* Edit/Add Shift Dialog */}
                <Dialog open={openShiftDialog} onClose={() => setOpenShiftDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>{editingIndex >= 0 ? "Edit Shift" : "Add Shift"}</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={3} mt={1}>
                            <TextField
                                label="Shift Name"
                                value={currentShift?.name || ""}
                                onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                                fullWidth
                            />

                            <FormControl fullWidth>
                                <InputLabel>Shift Type</InputLabel>
                                <Select
                                    value={currentShift?.type || "fixed"}
                                    label="Shift Type"
                                    onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, type: e.target.value as "fixed" | "dynamic" }) : null)}
                                >
                                    <MenuItem value="fixed">Fixed (Set Start/End Time)</MenuItem>
                                    <MenuItem value="dynamic">Dynamic (Duration based)</MenuItem>
                                </Select>
                            </FormControl>

                            {currentShift?.type === "fixed" ? (
                                <Box display="flex" gap={2}>
                                    <TextField
                                        label="Start Time"
                                        type="time"
                                        value={currentShift?.startTime || ""}
                                        onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, startTime: e.target.value }) : null)}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="End Time"
                                        type="time"
                                        value={currentShift?.endTime || ""}
                                        onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, endTime: e.target.value }) : null)}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>
                            ) : (
                                <TextField
                                    label="Duration (Hours)"
                                    type="number"
                                    value={currentShift?.duration || ""}
                                    onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, duration: parseFloat(e.target.value) }) : null)}
                                    fullWidth
                                />
                            )}

                            <TextField
                                label="Break Duration (Hours)"
                                type="number"
                                value={currentShift?.breakDuration || 0}
                                onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, breakDuration: parseFloat(e.target.value) }) : null)}
                                fullWidth
                            />

                            {/* Advanced Constraints */}
                            <Typography variant="subtitle2" sx={{ mt: 1 }}>Advanced Constraints (Optional)</Typography>
                            <Box display="flex" gap={2}>
                                <TextField
                                    label="Min Start Time"
                                    type="time"
                                    value={currentShift?.minStartTime || ""}
                                    onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, minStartTime: e.target.value }) : null)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="Max Start Time"
                                    type="time"
                                    value={currentShift?.maxStartTime || ""}
                                    onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, maxStartTime: e.target.value }) : null)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>
                            <Box display="flex" gap={2}>
                                <TextField
                                    label="Min End Time"
                                    type="time"
                                    value={currentShift?.minEndTime || ""}
                                    onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, minEndTime: e.target.value }) : null)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="Max End Time"
                                    type="time"
                                    value={currentShift?.maxEndTime || ""}
                                    onChange={(e) => setCurrentShift(prev => prev ? ({ ...prev, maxEndTime: e.target.value }) : null)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenShiftDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveShift} variant="contained">Save</Button>
                    </DialogActions>
                </Dialog>

            </AccordionDetails>
        </Accordion>
    );
};
