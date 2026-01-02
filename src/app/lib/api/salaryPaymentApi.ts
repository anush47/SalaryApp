import { apiFetch } from './commonApi';

/**
 * Fetch salary payments
 */
export async function fetchSalaryPayments(params: {
    salaryId?: string;
    employeeId?: string;
    companyId?: string;
    period?: string;
    page?: number;
    limit?: number;
    search?: string;
} = {}) {
    const queryParams = new URLSearchParams();

    if (params.salaryId) queryParams.append('salaryId', params.salaryId);
    if (params.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.period) queryParams.append('period', params.period);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/salary-payments?${queryParams.toString()}`;
    const data = await apiFetch(url);

    if (data && Array.isArray(data)) {
        return data;
    }

    if (data && data.payments) {
        return Array.isArray(data.payments) ? data.payments : [data.payments];
    }

    if (data && data.data && data.data.payments) {
        return Array.isArray(data.data.payments) ? data.data.payments : [data.data.payments];
    }

    return [];
}

/**
 * Create salary payment
 */
export async function createSalaryPayment(payment: any) {
    return apiFetch('/api/salary-payments', {
        method: 'POST',
        body: JSON.stringify(payment),
    });
}

/**
 * Update salary payment
 */
export async function updateSalaryPayment(payment: any) {
    return apiFetch('/api/salary-payments', {
        method: 'PUT',
        body: JSON.stringify(payment),
    });
}

/**
 * Delete salary payments
 */
export async function deleteSalaryPayments(paymentIds: string[]) {
    return apiFetch('/api/salary-payments', {
        method: 'DELETE',
        body: JSON.stringify({ paymentIds }),
    });
}
