import { apiFetch } from './commonApi';

/**
 * Generate payments
 */
export async function generatePayments(companyId: string, period: string) {
    return apiFetch('/api/payments/generate', {
        method: 'POST',
        body: JSON.stringify({ companyId, period }),
    });
}

/**
 * Save payment
 */
export async function savePayment(payment: any) {
    return apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ payment }),
    });
}

/**
 * Generate PDF
 */
export async function generatePdf(data: {
    companyId: string;
    period: string;
    pdfType: string;
    salaryIds?: string[];
}) {
    const response = await fetch('/api/pdf/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const result = await response.json();
        const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
    }

    return response.blob();
}
