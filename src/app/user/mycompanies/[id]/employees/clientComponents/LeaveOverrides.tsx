import React, { useEffect, useState } from "react";
import {
    Box,
    CircularProgress,
    TextField,
    Switch,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaveTypes, LeaveType } from "@/app/lib/api/leaveTypeApi";

interface EmployeeLeaveType {
    leaveType: string | LeaveType;
    maxDaysPerPeriod: number;
    balance: number;
    carryForward: boolean;
    currrentPeriodStart?: string;
    lastAccrualDate?: string;
    carriedForwardBalance?: number;
}

interface LeaveOverridesProps {
    isEditing: boolean;
    employeeLeaveTypes: EmployeeLeaveType[];
    setEmployeeLeaveTypes: (leaveTypes: EmployeeLeaveType[]) => void;
    companyId: string;
    employeeType?: string;
}

export const LeaveOverrides: React.FC<LeaveOverridesProps> = ({
    isEditing,
    employeeLeaveTypes,
    setEmployeeLeaveTypes,
    companyId,
    employeeType = "permanent",
}) => {
    const { data: allLeaveTypes = [], isLoading: loading } = useQuery<LeaveType[]>({
        queryKey: ["leaveTypes", companyId],
        queryFn: () => fetchLeaveTypes(companyId),
        enabled: !!companyId,
    });

    // Filter leave types based on employee type
    const availableLeaveTypes = allLeaveTypes.filter(lt =>
        (lt.applicableFor as any[]).includes(employeeType) || (lt.applicableFor as any[]).includes("all")
    );

    // Auto-populate missing leave types and repair invalid ones
    useEffect(() => {
        if (availableLeaveTypes.length > 0) {
            let hasChanges = false;
            const updatedTypes = [...employeeLeaveTypes];

            // 1. Find missing types
            const missingTypes = availableLeaveTypes.filter(lt =>
                !updatedTypes.some(elt => {
                    const eltId = typeof elt.leaveType === 'object' ? (elt.leaveType as any)._id : elt.leaveType;
                    return eltId === lt._id;
                })
            );

            if (missingTypes.length > 0) {
                const newTypes = missingTypes.map(lt => ({
                    leaveType: lt._id,
                    maxDaysPerPeriod: lt.maxDaysPerPeriod ?? 0,
                    balance: lt.maxDaysPerPeriod ?? 0,
                    carryForward: lt.carryForward,
                }));
                updatedTypes.push(...newTypes);
                hasChanges = true;
            }

            // 2. Repair existing types with invalid data
            updatedTypes.forEach((elt, index) => {
                // If maxDaysPerPeriod is undefined or null (loose check covers both)
                if (elt.maxDaysPerPeriod == null || elt.balance == null) {
                    const eltId = typeof elt.leaveType === 'object' ? (elt.leaveType as any)._id : elt.leaveType;
                    const companyDefault = availableLeaveTypes.find(lt => lt._id === eltId);
                    if (companyDefault) {
                        updatedTypes[index] = {
                            ...elt,
                            maxDaysPerPeriod: elt.maxDaysPerPeriod ?? (companyDefault.maxDaysPerPeriod ?? 0),
                            balance: elt.balance ?? (companyDefault.maxDaysPerPeriod ?? 0)
                        };
                        hasChanges = true;
                    }
                }
            });

            if (hasChanges) {
                setEmployeeLeaveTypes(updatedTypes);
            }
        }
    }, [availableLeaveTypes, employeeLeaveTypes, setEmployeeLeaveTypes]);

    const handleLeaveChange = (
        leaveTypeId: string,
        field: keyof EmployeeLeaveType,
        value: any
    ) => {
        const updatedLeaveTypes = [...employeeLeaveTypes];
        const existingIndex = updatedLeaveTypes.findIndex((lt: EmployeeLeaveType) => {
            const id = typeof lt.leaveType === 'object' ? (lt.leaveType as any)._id : lt.leaveType;
            return id === leaveTypeId;
        });

        if (existingIndex !== -1) {
            updatedLeaveTypes[existingIndex] = {
                ...updatedLeaveTypes[existingIndex],
                [field]: value,
                // If updating Max Days, automatically update Balance to match (refill wallet)
                // This ensures the robust "Safety Cap" logic (Min(Balance, Max-Used)) has a high enough Balance to grant the new days.
                ...(field === 'maxDaysPerPeriod' ? { balance: value } : {})
            };
        } else {
            const companyLeaveType = availableLeaveTypes.find(lt => lt._id === leaveTypeId);
            if (companyLeaveType) {
                updatedLeaveTypes.push({
                    leaveType: leaveTypeId,
                    maxDaysPerPeriod: field === 'maxDaysPerPeriod' ? value : (companyLeaveType.maxDaysPerPeriod ?? 0),
                    balance: field === 'balance' ? value : (field === 'maxDaysPerPeriod' ? value : (companyLeaveType.maxDaysPerPeriod ?? 0)),
                    carryForward: field === 'carryForward' ? value : false,
                });
            }
        }
        setEmployeeLeaveTypes(updatedLeaveTypes);
    };

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'Leave Name', flex: 1, minWidth: 150 },
        {
            field: 'period',
            headerName: 'Period',
            flex: 1.5,
            minWidth: 200,
            valueGetter: (value, row) => {
                // Determine period description from the *Company Policy* (source of truth for period logic)
                const leaveTypeId = row._id;
                const companyLeaveType = availableLeaveTypes.find((lt) => lt._id === leaveTypeId);

                if (!companyLeaveType) return "Unknown";

                const { accrualPeriod, resetDay, customPeriodDays } = companyLeaveType;

                switch (accrualPeriod) {
                    case "yearly": return "Yearly (Jan 1 - Dec 31)";
                    case "monthly": return `Monthly (Resets on ${resetDay || 1}${getOrdinalSuffix(resetDay || 1)})`;
                    case "weekly": return `Weekly (Resets on ${getDayName(resetDay || 0)})`; // Default Monday (1) or Sunday (0) logic check needed
                    case "quarterly": return "Quarterly (Jan, Apr, Jul, Oct)";
                    case "half-yearly": return "Half-Yearly (Jan, Jul)";
                    case "custom": return `Custom (Every ${customPeriodDays || 30} days)`;
                    default: return accrualPeriod;
                }
            }
        },
        {
            field: 'maxDaysPerPeriod',
            headerName: 'Max Days (Override)',
            flex: 1,
            minWidth: 150,
            renderCell: (params) => {
                const leaveTypeId = params.row._id;
                const employeeLeave = employeeLeaveTypes.find((lt) => {
                    const id = typeof lt.leaveType === 'object' ? (lt.leaveType as any)._id : lt.leaveType;
                    return id === leaveTypeId;
                });
                const value = employeeLeave ? employeeLeave.maxDaysPerPeriod : params.row.maxDaysPerPeriod;

                return (
                    <TextField
                        type="number"
                        size="small"
                        value={value}
                        onChange={(e) => handleLeaveChange(leaveTypeId, "maxDaysPerPeriod", parseFloat(e.target.value))}
                        disabled={!isEditing}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        sx={{ width: '100%' }}
                        helperText={!employeeLeave ? "Default Policy" : "Overridden"}
                    />
                );
            }
        }
    ];

    // Helper functions for period display
    function getOrdinalSuffix(i: number) {
        var j = i % 10,
            k = i % 100;
        if (j == 1 && k != 11) {
            return "st";
        }
        if (j == 2 && k != 12) {
            return "nd";
        }
        if (j == 3 && k != 13) {
            return "rd";
        }
        return "th";
    }

    function getDayName(dayIndex: number) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[dayIndex] || "Day " + dayIndex;
    }

    if (loading) {
        return <CircularProgress size={20} />;
    }

    return (
        <Box sx={{ width: '100%', height: 350 }}>
            <DataGrid
                rows={availableLeaveTypes}
                columns={columns}
                getRowId={(row) => row._id}
                hideFooter
                disableRowSelectionOnClick
                density="compact"
                sx={{
                    '& .MuiDataGrid-cell:focus': {
                        outline: 'none',
                    },
                }}
            />
        </Box>
    );
};
