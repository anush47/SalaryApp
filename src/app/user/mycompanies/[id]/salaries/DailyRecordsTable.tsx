import React, { useState } from "react";
import {
    Box,
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
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import dayjs from "dayjs";

interface DailyRecord {
    date: Date;
    attendanceRecords: string[];
    shift?: string;
    shiftName?: string;
    shiftStartTime?: string;
    shiftEndTime?: string;
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

    const columns: GridColDef[] = [
        {
            field: "date",
            headerName: "Date",
            width: 120,
            valueGetter: (params, row) => dayjs(row.date).format("MMM DD, YYYY"),
            renderCell: (params) => (
                <Box>
                    <Typography variant="body2">{dayjs(params.row.date).format("MMM DD, YYYY")}</Typography>
                    <Typography variant="caption" color="text.secondary">{dayjs(params.row.date).format("ddd")}</Typography>
                </Box>
            )
        },
        {
            field: "shiftName",
            headerName: "Shift",
            width: 150,
            renderCell: (params) => (
                <Box>
                    <Typography variant="body2">{params.row.shiftName || "Standard"}</Typography>
                    {params.row.shiftStartTime && (
                        <Typography variant="caption" color="text.secondary">
                            {params.row.shiftStartTime} - {params.row.shiftEndTime}
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            field: "day_status",
            headerName: "Day Type",
            width: 130,
            renderCell: (params) => getHolidayChip(params.row)
        },
        {
            field: "workingHours",
            headerName: "Working Hrs",
            type: "number",
            width: 110,
            valueGetter: (params, row) => row.workingHours.toFixed(2) + "h"
        },
        {
            field: "breakHours",
            headerName: "Break Hrs",
            type: "number",
            width: 110,
            renderCell: (params) => (
                editingIndex === dailyRecords.indexOf(params.row) ? (
                    <TextField
                        type="number"
                        value={editedBreakHours}
                        onChange={(e) => setEditedBreakHours(parseFloat(e.target.value))}
                        size="small"
                        sx={{ width: 80 }}
                        inputProps={{ step: 0.25, min: 0 }}
                    />
                ) : (
                    <>{params.row.breakHours.toFixed(2)}h</>
                )
            )
        },
        {
            field: "ot",
            headerName: "OT (1.5 / 2 / 3)",
            width: 200,
            renderCell: (params) => (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    {params.row.normalOT > 0 && <Chip label={params.row.normalOT.toFixed(2)} color="success" size="small" variant="outlined" />}
                    {params.row.doubleOT > 0 && <Chip label={params.row.doubleOT.toFixed(2)} color="warning" size="small" variant="outlined" />}
                    {params.row.tripleOT > 0 && <Chip label={params.row.tripleOT.toFixed(2)} color="error" size="small" variant="outlined" />}
                </Box>
            )
        },
        {
            field: "totalOT",
            headerName: "Total OT",
            width: 100,
            valueGetter: (params, row) => calculateTotalOT(row).toFixed(2) + "h",
            cellClassName: "font-bold"
        },
        {
            field: "noPay",
            headerName: "No Pay",
            width: 100,
            renderCell: (params) => (
                params.row.noPay > 0 ? (
                    <Tooltip title={params.row.noPayReason}>
                        <Chip label={params.row.noPay.toFixed(2)} color="error" size="small" />
                    </Tooltip>
                ) : "-"
            )
        },
        {
            field: "attendance",
            headerName: "Attendance",
            width: 180,
            renderCell: (params) => (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Chip
                        icon={<CheckCircle fontSize="small" />}
                        label={`${params.row.attendanceRecords.length} records`}
                        size="small"
                        color={params.row.attendanceRecords.length > 0 ? "primary" : "default"}
                    />
                    {params.row.appliedLeaves.length > 0 && (
                        <Chip label={`${params.row.appliedLeaves.length} leave`} size="small" color="info" />
                    )}
                </Box>
            )
        },
        {
            field: "remark",
            headerName: "Remark",
            flex: 1,
            minWidth: 150
        }
    ];

    if (editable) {
        columns.push({
            field: "actions",
            headerName: "Actions",
            width: 100,
            align: "center",
            renderCell: (params) => {
                const index = dailyRecords.indexOf(params.row);
                return editingIndex === index ? (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton size="small" color="success" onClick={() => handleSaveClick(index)}>
                            <Save fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={handleCancelClick}>
                            <Cancel fontSize="small" />
                        </IconButton>
                    </Box>
                ) : (
                    <IconButton size="small" onClick={() => handleEditClick(index, params.row.breakHours)}>
                        <Edit fontSize="small" />
                    </IconButton>
                );
            }
        });
    }

    return (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                    <Typography variant="h6">Daily Attendance Records</Typography>
                    <Chip label={`${dailyRecords.length} days`} color="primary" size="small" />
                    <Chip label={`Total OT: ${(totals.normalOT + totals.doubleOT + totals.tripleOT).toFixed(2)}h`} color="success" size="small" />
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <div style={{ height: 500, width: "100%" }}>
                    <DataGrid
                        rows={dailyRecords.map((r, i) => ({ ...r, id: i }))}
                        columns={columns}
                        disableRowSelectionOnClick
                        slots={{
                            toolbar: (props) => (
                                <GridToolbar
                                    {...props}
                                    csvOptions={{ disableToolbarButton: true }}
                                    printOptions={{ disableToolbarButton: true }}
                                />
                            ),
                        }}
                        slotProps={{
                            toolbar: {
                                showQuickFilter: true,
                            },
                        }}
                        pageSizeOptions={[10, 20, 50, 100]}
                        initialState={{
                            pagination: {
                                paginationModel: { pageSize: 31 },
                            },
                        }}
                        disableDensitySelector
                        sx={{
                            '& .font-bold': { fontWeight: 'bold' },
                            '& .MuiDataGrid-cell:focus': { outline: 'none' },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: 'action.hover',
                            }
                        }}
                    />
                </div>
                <Box sx={{ mt: 1, p: 1, bgcolor: "action.hover", borderRadius: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                    <Typography variant="caption"><strong>Total Working:</strong> {totals.workingHours.toFixed(2)}h</Typography>
                    <Typography variant="caption"><strong>Total OT:</strong> {(totals.normalOT + totals.doubleOT + totals.tripleOT).toFixed(2)}h</Typography>
                    <Typography variant="caption"><strong>Total No Pay:</strong> {totals.noPay.toFixed(2)}</Typography>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};
