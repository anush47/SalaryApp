import { ApiResponse } from '@/app/lib/apiResponse';

export const getShiftAssignments = async (employeeId: string, startDate?: string, endDate?: string): Promise<ApiResponse> => {
    let url = `/api/shifts/assignments?employeeId=${employeeId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url);
    return response.json();
};

export const createShiftAssignment = async (data: { employeeId: string; shiftId?: string; date: string; isOffDay?: boolean }): Promise<ApiResponse> => {
    const response = await fetch('/api/shifts/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return response.json();
};

export const deleteShiftAssignment = async (employeeId: string, date: string): Promise<ApiResponse> => {
    const response = await fetch(`/api/shifts/assignments?employeeId=${employeeId}&date=${date}`, {
        method: 'DELETE',
    });
    return response.json();
};

export const getActiveShift = async (employeeId: string, date: string, time?: string): Promise<ApiResponse> => {
    let url = `/api/shifts/active?employeeId=${employeeId}&date=${date}`;
    if (time) url += `&time=${time}`;
    const response = await fetch(url);
    return response.json();
};
