import { ApiResponse } from '@/app/lib/apiResponse';

export const markAttendance = async (data: any): Promise<ApiResponse> => {
    const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return response.json();
};

export const createAttendance = markAttendance;

export const getAttendanceLogs = async (companyId: string, date?: string, startDate?: string, endDate?: string): Promise<ApiResponse> => {
    let url = `/api/attendance?companyId=${companyId}`;
    if (date) url += `&date=${date}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url);
    return response.json();
};

export const updateAttendanceStatus = async (id: string, status: 'approved' | 'rejected' | 'pending', timestamp?: string, shiftId?: string, remarks?: string): Promise<ApiResponse> => {
    const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, timestamp, shiftId, remarks }),
    });
    return response.json();
};

export const deleteAttendance = async (id: string): Promise<ApiResponse> => {
    const response = await fetch(`/api/attendance?id=${id}`, {
        method: 'DELETE',
    });
    return response.json();
};
