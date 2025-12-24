import { ApiResponse } from '@/app/lib/apiResponse';

export const markAttendance = async (data: {
    type: 'in' | 'out';
    location: { lat: number; lng: number; accuracy: number };
}): Promise<ApiResponse> => {
    const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return response.json();
};

export const getAttendanceLogs = async (companyId: string, date?: string, startDate?: string, endDate?: string): Promise<ApiResponse> => {
    let url = `/api/attendance?companyId=${companyId}`;
    if (date) url += `&date=${date}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url);
    return response.json();
};
