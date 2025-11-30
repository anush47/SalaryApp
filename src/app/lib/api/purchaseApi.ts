import { apiFetch } from './commonApi';

/**
 * Check if a company has purchased a subscription for a given month
 */
export async function checkPurchased(companyId: string, month: string) {
    const data = await apiFetch(`/api/purchases/check?companyId=${companyId}&month=${month}`);
    return data.purchased === "approved";
}
