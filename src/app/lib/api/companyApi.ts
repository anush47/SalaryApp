// Company API utilities

import { apiFetch } from './commonApi';
import { ApiResponse } from '../apiResponse';

/**
 * Fetch companies with consistent response handling
 */
export async function fetchCompanies(params: {
  companyId?: string;
  page?: number;
  limit?: number;
  needUsers?: boolean;
} = {}) {
  const queryParams = new URLSearchParams();

  if (params.companyId) queryParams.append('companyId', params.companyId);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.needUsers) queryParams.append('needUsers', 'true');

  const url = `/api/companies?${queryParams.toString()}`;
  const data = await apiFetch(url);

  // Handle response structure: could be { companies: [] } or { data: { companies: [] } }
  if (data && Array.isArray(data)) {
    return data;
  }

  if (data && data.companies) {
    return Array.isArray(data.companies) ? data.companies : [data.companies];
  }

  if (data && data.data && data.data.companies) {
    return Array.isArray(data.data.companies) ? data.data.companies : [data.data.companies];
  }

  return [];
}

/**
 * Fetch a single company by ID
 */
export async function fetchCompany(companyId: string) {
  const companies = await fetchCompanies({ companyId });
  return companies[0] || null;
}

/**
 * Create a company
 */
export async function createCompany(companyData: any) {
  return apiFetch('/api/companies', {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
}

/**
 * Update a company
 */
export async function updateCompany(companyData: any) {
  return apiFetch('/api/companies', {
    method: 'PUT',
    body: JSON.stringify(companyData),
  });
}

/**
 * Delete a company
 */
export async function deleteCompany(companyId: string) {
  return apiFetch('/api/companies', {
    method: 'DELETE',
    body: JSON.stringify({ id: companyId }),
  });
}

/**
 * Get Reference Number and Name
 */
export async function getReferenceNoName(employerNo: string, period: string) {
  return apiFetch('/api/companies/getReferenceNoName', {
    method: 'POST',
    body: JSON.stringify({ employerNo, period }),
  });
}