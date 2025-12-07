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
            };
        } else {
            const companyLeaveType = availableLeaveTypes.find(lt => lt._id === leaveTypeId);
            if (companyLeaveType) {
                updatedLeaveTypes.push({
                    leaveType: leaveTypeId,
                    maxDaysPerPeriod: field === 'maxDaysPerPeriod' ? value : (companyLeaveType.maxDaysPerPeriod ?? 0),
                    balance: field === 'balance' ? value : (companyLeaveType.maxDaysPerPeriod ?? 0),
                    carryForward: field === 'carryForward' ? value : false,
                });
            }
        }
        setEmployeeLeaveTypes(updatedLeaveTypes);
    };

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'Leave Name', flex: 1, minWidth: 150 },
        {
            field: 'maxDaysPerPeriod',
            headerName: 'Max Days',
            flex: 1,
            minWidth: 120,
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
                    />
                );
            }
        },
        {
            field: 'balance',
            headerName: 'Balance',
            flex: 1,
            minWidth: 120,
            renderCell: (params) => {
                const leaveTypeId = params.row._id;
                const employeeLeave = employeeLeaveTypes.find((lt) => {
                    const id = typeof lt.leaveType === 'object' ? (lt.leaveType as any)._id : lt.leaveType;
                    return id === leaveTypeId;
                });
                const value = employeeLeave ? employeeLeave.balance : params.row.maxDaysPerPeriod; // Default to max days

                return (
                    <TextField
                        type="number"
                        size="small"
                        value={value}
                        onChange={(e) => handleLeaveChange(leaveTypeId, "balance", parseFloat(e.target.value))}
                        disabled={!isEditing}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        sx={{ width: '100%' }}
                    />
                );
            }
        },
        {
            field: 'carryForward',
            headerName: 'Carry Forward',
            flex: 0.5,
            minWidth: 100,
            renderCell: (params) => {
                const leaveTypeId = params.row._id;
                const employeeLeave = employeeLeaveTypes.find((lt) => {
                    const id = typeof lt.leaveType === 'object' ? (lt.leaveType as any)._id : lt.leaveType;
                    return id === leaveTypeId;
                });
                const value = employeeLeave ? employeeLeave.carryForward : false;

                return (
                    <Switch
                        checked={value}
                        onChange={(e) => handleLeaveChange(leaveTypeId, "carryForward", e.target.checked)}
                        disabled={!isEditing}
                        size="small"
                    />
                );
            }
        }
    ];

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
