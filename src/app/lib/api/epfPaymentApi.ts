import { apiFetch } from './commonApi';

/**
 * Fetch EPF payments
 */
export async function fetchEpfPayments(params: {
    companyId?: string;
    period?: string;
    page?: number;
    limit?: number;
    search?: string;
} = {}) {
    const queryParams = new URLSearchParams();

    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.period) queryParams.append('period', params.period);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/epf-payments?${queryParams.toString()}`;
    const data = await apiFetch(url);

    if (data && Array.isArray(data)) {
        return data;
    }

    if (data && data.payments) {
        return Array.isArray(data.payments) ? data.payments : [data.payments];
    }

    if (data && data.data) {
        return Array.isArray(data.data) ? data.data : (data.data.payments || []);
    }

    return [];
}

/**
 * Create EPF payment
 */
export async function createEpfPayment(payment: any) {
    return apiFetch('/api/epf-payments', {
        method: 'POST',
        body: JSON.stringify(payment),
    });
}

/**
 * Update EPF payment
 */
export async function updateEpfPayment(payment: any) {
    return apiFetch('/api/epf-payments', {
        method: 'PUT',
        body: JSON.stringify(payment),
    });
}

/**
 * Delete EPF payment
 */
export async function deleteEpfPayment(paymentId: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('paymentId', paymentId);

    return apiFetch(`/api/epf-payments?${queryParams.toString()}`, {
        method: 'DELETE',
    });
}
