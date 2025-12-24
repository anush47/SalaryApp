import { apiFetch } from './commonApi';

/**
 * Fetch payments with consistent response handling
 */
export async function fetchPayments(params: {
    paymentId?: string;
    companyId?: string;
    period?: string;
    page?: number;
    limit?: number;
    search?: string;
} = {}) {
    const queryParams = new URLSearchParams();

    if (params.paymentId) queryParams.append('paymentId', params.paymentId);
    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.period) queryParams.append('period', params.period);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/payments?${queryParams.toString()}`;
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
 * Fetch a single payment by ID
 */
export async function fetchPayment(paymentId: string) {
    const payments = await fetchPayments({ paymentId });
    return payments[0] || null;
}

/**
 * Generate payments
 */
export async function generatePayments(companyId: string, period: string, regenerate: boolean = false) {
    return apiFetch('/api/payments/generate', {
        method: 'POST',
        body: JSON.stringify({ companyId, period, regenerate }),
    });
}

/**
 * Create payment
 */
export async function createPayment(payment: any) {
    return apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ payment }),
    });
}

/**
 * Save payment (Alias for createPayment, kept for backward compatibility if needed)
 */
export async function savePayment(payment: any) {
    return createPayment(payment);
}

/**
 * Update payment
 */
export async function updatePayment(payment: any) {
    return apiFetch('/api/payments', {
        method: 'PUT',
        body: JSON.stringify({ payment }),
    });
}

/**
 * Delete payments
 */
export async function deletePayments(paymentIds: string[]) {
    return apiFetch('/api/payments', {
        method: 'DELETE',
        body: JSON.stringify({ paymentIds }),
    });
}


