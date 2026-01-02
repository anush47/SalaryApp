import { apiFetch } from './commonApi';

/**
 * Fetch ETF payments
 */
export async function fetchEtfPayments(params: {
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

    const url = `/api/etf-payments?${queryParams.toString()}`;
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
 * Create ETF payment
 */
export async function createEtfPayment(payment: any) {
    return apiFetch('/api/etf-payments', {
        method: 'POST',
        body: JSON.stringify(payment),
    });
}

/**
 * Update ETF payment
 */
export async function updateEtfPayment(payment: any) {
    return apiFetch('/api/etf-payments', {
        method: 'PUT',
        body: JSON.stringify(payment),
    });
}

/**
 * Delete ETF payment
 */
export async function deleteEtfPayment(paymentId: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('paymentId', paymentId);

    return apiFetch(`/api/etf-payments?${queryParams.toString()}`, {
        method: 'DELETE',
    });
}
