import React, { useState } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    IconButton,
    Chip,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
} from "@mui/material";
import { Edit, Save, Cancel, ExpandMore, CheckCircle } from "@mui/icons-material";
import dayjs from "dayjs";

interface DailyRecord {
    date: Date;
    attendanceRecords: string[];
    shift?: string;
    appliedLeaves: string[];
    workingHours: number;
    breakHours: number;
    normalOT: number;
    doubleOT: number;
    tripleOT: number;
    noPay: number;
    noPayReason: string;
    holiday: string;
    isMercantileHoliday: boolean;
    isPublicHoliday: boolean;
    day_status: "full" | "half" | "off";
    remark: string;
}

interface DailyRecordsTableProps {
    dailyRecords: DailyRecord[];
    onBreakHoursChange?: (index: number, newBreakHours: number) => void;
    editable?: boolean;
}

export const DailyRecordsTable: React.FC<DailyRecordsTableProps> = ({
    dailyRecords,
    onBreakHoursChange,
    editable = false,
}) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedBreakHours, setEditedBreakHours] = useState<number>(0);

    const handleEditClick = (index: number, currentBreakHours: number) => {
        setEditingIndex(index);
        setEditedBreakHours(currentBreakHours);
    };

    const handleSaveClick = (index: number) => {
        if (onBreakHoursChange) {
            onBreakHoursChange(index, editedBreakHours);
        }
        setEditingIndex(null);
    };

    const handleCancelClick = () => {
        setEditingIndex(null);
    };

    const calculateTotalOT = (record: DailyRecord) => {
        return record.normalOT + record.doubleOT + record.tripleOT;
    };

    const getHolidayChip = (record: DailyRecord) => {
        if (record.isMercantileHoliday) {
            return <Chip label="Mercantile" color="error" size="small" />;
        }
        if (record.isPublicHoliday) {
            return <Chip label="Public" color="warning" size="small" />;
        }
        if (record.day_status === "off") {
            return <Chip label="Off Day" color="default" size="small" />;
        }
        if (record.day_status === "half") {
            return <Chip label="Half Day" color="info" size="small" />;
        }
        return null;
    };

    // Calculate totals
    const totals = dailyRecords.reduce(
        (acc, record) => ({
            workingHours: acc.workingHours + record.workingHours,
            breakHours: acc.breakHours + record.breakHours,
            normalOT: acc.normalOT + record.normalOT,
            doubleOT: acc.doubleOT + record.doubleOT,
            tripleOT: acc.tripleOT + record.tripleOT,
            noPay: acc.noPay + record.noPay,
        }),
        { workingHours: 0, breakHours: 0, normalOT: 0, doubleOT: 0, tripleOT: 0, noPay: 0 }
    );

    return (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                    <Typography variant="h6">Daily Attendance Records</Typography>
                    <Chip
                        label={`${dailyRecords.length} days`}
                        color="primary"
                        size="small"
                    />
                    <Chip
                        label={`Total OT: ${(totals.normalOT + totals.doubleOT + totals.tripleOT).toFixed(2)}h`}
                        color="success"
                        size="small"
                    />
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small" sx={{ minWidth: 1200 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "action.hover" }}>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Day Type</strong></TableCell>
                                <TableCell align="right"><strong>Working Hours</strong></TableCell>
                                <TableCell align="right"><strong>Break Hours</strong></TableCell>
                                <TableCell align="right"><strong>Normal OT (1.5x)</strong></TableCell>
                                <TableCell align="right"><strong>Double OT (2x)</strong></TableCell>
                                <TableCell align="right"><strong>Triple OT (3x)</strong></TableCell>
                                <TableCell align="right"><strong>Total OT</strong></TableCell>
                                <TableCell align="right"><strong>No Pay</strong></TableCell>
                                <TableCell><strong>Attendance</strong></TableCell>
                                <TableCell><strong>Remark</strong></TableCell>
                                {editable && <TableCell align="center"><strong>Actions</strong></TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dailyRecords.map((record, index) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        "&:hover": { backgroundColor: "action.hover" },
                                        backgroundColor:
                                            record.isMercantileHoliday || record.isPublicHoliday
                                                ? "warning.light"
                                                : "inherit",
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2">
                                            {dayjs(record.date).format("MMM DD, YYYY")}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {dayjs(record.date).format("ddd")}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                            {getHolidayChip(record)}
                                            {record.holiday && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {record.holiday}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        {record.workingHours.toFixed(2)}h
                                    </TableCell>
                                    <TableCell align="right">
                                        {editingIndex === index ? (
                                            <TextField
                                                type="number"
                                                value={editedBreakHours}
                                                onChange={(e) => setEditedBreakHours(parseFloat(e.target.value))}
                                                size="small"
                                                sx={{ width: 80 }}
                                                inputProps={{ step: 0.25, min: 0 }}
                                            />
                                        ) : (
                                            <>{record.breakHours.toFixed(2)}h</>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {record.normalOT > 0 ? (
                                            <Chip
                                                label={`${record.normalOT.toFixed(2)}h`}
                                                color="success"
                                                size="small"
                                                variant="outlined"
                                            />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {record.doubleOT > 0 ? (
                                            <Chip
                                                label={`${record.doubleOT.toFixed(2)}h`}
                                                color="warning"
                                                size="small"
                                                variant="outlined"
                                            />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {record.tripleOT > 0 ? (
                                            <Chip
                                                label={`${record.tripleOT.toFixed(2)}h`}
                                                color="error"
                                                size="small"
                                                variant="outlined"
                                            />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <strong>{calculateTotalOT(record).toFixed(2)}h</strong>
                                    </TableCell>
                                    <TableCell align="right">
                                        {record.noPay > 0 ? (
                                            <Tooltip title={record.noPayReason}>
                                                <Chip
                                                    label={record.noPay.toFixed(2)}
                                                    color="error"
                                                    size="small"
                                                />
                                            </Tooltip>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={<CheckCircle />}
                                            label={`${record.attendanceRecords.length} records`}
                                            size="small"
                                            color={record.attendanceRecords.length > 0 ? "primary" : "default"}
                                        />
                                        {record.appliedLeaves.length > 0 && (
                                            <Chip
                                                label={`${record.appliedLeaves.length} leave(s)`}
                                                size="small"
                                                color="info"
                                                sx={{ ml: 0.5 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">{record.remark}</Typography>
                                    </TableCell>
                                    {editable && (
                                        <TableCell align="center">
                                            {editingIndex === index ? (
                                                <Box sx={{ display: "flex", gap: 0.5 }}>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => handleSaveClick(index)}
                                                    >
                                                        <Save fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={handleCancelClick}
                                                    >
                                                        <Cancel fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            ) : (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditClick(index, record.breakHours)}
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {/* Totals Row */}
                            <TableRow sx={{ backgroundColor: "primary.light", fontWeight: "bold" }}>
                                <TableCell colSpan={2}><strong>TOTALS</strong></TableCell>
                                <TableCell align="right"><strong>{totals.workingHours.toFixed(2)}h</strong></TableCell>
                                <TableCell align="right"><strong>{totals.breakHours.toFixed(2)}h</strong></TableCell>
                                <TableCell align="right"><strong>{totals.normalOT.toFixed(2)}h</strong></TableCell>
                                <TableCell align="right"><strong>{totals.doubleOT.toFixed(2)}h</strong></TableCell>
                                <TableCell align="right"><strong>{totals.tripleOT.toFixed(2)}h</strong></TableCell>
                                <TableCell align="right">
                                    <strong>{(totals.normalOT + totals.doubleOT + totals.tripleOT).toFixed(2)}h</strong>
                                </TableCell>
                                <TableCell align="right"><strong>{totals.noPay.toFixed(2)}</strong></TableCell>
                                <TableCell colSpan={editable ? 3 : 2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </AccordionDetails>
        </Accordion>
    );
};
