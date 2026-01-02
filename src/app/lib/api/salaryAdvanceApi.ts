import { apiFetch } from './commonApi';

/**
 * Fetch salary advances
 */
export async function fetchSalaryAdvances(params: {
    employeeId?: string;
    companyId?: string;
    status?: "active" | "fully_deducted" | "written_off";
    page?: number;
    limit?: number;
    search?: string;
} = {}) {
    const queryParams = new URLSearchParams();

    if (params.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/salary-advances?${queryParams.toString()}`;
    const data = await apiFetch(url);

    if (data && Array.isArray(data)) {
        return data;
    }

    if (data && data.advances) {
        return Array.isArray(data.advances) ? data.advances : [data.advances];
    }

    if (data && data.data && data.data.advances) {
        return Array.isArray(data.data.advances) ? data.data.advances : [data.data.advances];
    }

    return [];
}

/**
 * Create salary advance
 */
export async function createSalaryAdvance(advance: any) {
    return apiFetch('/api/salary-advances', {
        method: 'POST',
        body: JSON.stringify(advance),
    });
}

/**
 * Update salary advance
 */
export async function updateSalaryAdvance(advance: any) {
    return apiFetch('/api/salary-advances', {
        method: 'PUT',
        body: JSON.stringify(advance),
    });
}

/**
 * Delete salary advances
 */
export async function deleteSalaryAdvances(advanceIds: string[]) {
    return apiFetch('/api/salary-advances', {
        method: 'DELETE',
        body: JSON.stringify({ advanceIds }),
    });
}
