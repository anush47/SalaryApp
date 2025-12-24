import { apiFetch } from './commonApi';

/**
 * Check if a company has purchased a subscription for a given month
 */
export async function checkPurchased(companyId: string, month: string) {
    const data = await apiFetch(`/api/purchases/check?companyId=${companyId}&month=${month}`);
    return data.purchased === "approved";
}

/**
 * Fetch purchases with optional filtering
 */
export async function fetchPurchases(params: { companyId?: string; purchaseId?: string; page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.purchaseId) queryParams.append('purchaseId', params.purchaseId);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/purchases?${queryParams.toString()}`;
    return apiFetch(url);
}

/**
 * Fetch a single purchase by ID
 */
export async function fetchPurchase(purchaseId: string) {
    const data = await fetchPurchases({ purchaseId });
    return data.purchase;
}

/**
 * Create a new purchase
 */
export async function createPurchase(purchaseData: any) {
    return apiFetch('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(purchaseData),
    });
}

/**
 * Update an existing purchase
 */
export async function updatePurchase(purchaseData: any) {
    return apiFetch('/api/purchases', {
        method: 'PUT',
        body: JSON.stringify(purchaseData),
    });
}

/**
 * Delete a purchase
 */
export async function deletePurchase(purchaseId: string) {
    return apiFetch(`/api/purchases?purchaseId=${purchaseId}`, {
        method: 'DELETE',
    });
}

/**
 * Fetch price for a given company and months
 */
export async function fetchPrice(companyId: string, months: string[]) {
    const monthsStr = months.join(" ");
    return apiFetch(`/api/purchases/price?companyId=${companyId}&months=${monthsStr}`);
}
