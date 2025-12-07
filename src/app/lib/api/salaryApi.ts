import { apiFetch } from './commonApi';
import { ApiResponse } from '../apiResponse';
import { PaginatedResponse } from '../types';

/**
 * Fetch salaries with pagination and filtering
 */
export async function fetchSalaries(params: {
    companyId?: string;
    page?: number;
    limit?: number;
    period?: string;
    salaryId?: string;
    employeeId?: string;
} = {}): Promise<PaginatedResponse | any> {
    const queryParams = new URLSearchParams();

    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.period) queryParams.append('period', params.period);
    if (params.salaryId) queryParams.append('salaryId', params.salaryId);
    if (params.employeeId) queryParams.append('employee', params.employeeId);

    const url = `/api/salaries?${queryParams.toString()}`;
    const data = await apiFetch(url);

    // Handle standardized response structure
    if (data && data.data && data.pagination) {
        return {
            data: data.data,
            pagination: data.pagination
        };
    }

    // Handle single salary response (wrapped in data object or direct)
    if (params.salaryId) {
        return data.data?.salary || data.salary || data;
    }

    return data;
}

/**
 * Generate salaries
 */
export async function generateSalaries(data: {
    companyId: string;
    employees: string[];
    period: string;
    inOut?: string | any[];
    existingSalaries?: any[];
    update?: boolean;
}) {
    return apiFetch('/api/salaries/generate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Save (Create/Update) salaries
 */
export async function saveSalaries(salaries: any[]) {
    return apiFetch('/api/salaries', {
        method: 'POST',
        body: JSON.stringify({ salaries }),
    });
}

/**
 * Update a single salary
 */
export async function updateSalary(salary: any) {
    return apiFetch('/api/salaries', {
        method: 'PUT',
        body: JSON.stringify(salary),
    });
}

/**
 * Delete salaries
 */
export async function deleteSalaries(salaryIds: string[]) {
    return apiFetch('/api/salaries', {
        method: 'DELETE',
        body: JSON.stringify({ salaryIds }),
    });
}
