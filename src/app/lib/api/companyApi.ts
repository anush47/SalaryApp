// Company API utilities

import { ApiResponse } from '../apiResponse';

/**
 * Generic API fetch function with consistent error handling for company operations
 */
async function companyApiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const result: ApiResponse<T> = await response.json();

  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return result.data || result as T;
}

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
  const data = await companyApiFetch(url);
  
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
  const response = await fetch('/api/companies', {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Update a company
 */
export async function updateCompany(companyData: any) {
  const response = await fetch('/api/companies', {
    method: 'PUT',
    body: JSON.stringify(companyData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Delete a company
 */
export async function deleteCompany(companyId: string) {
  const response = await fetch('/api/companies', {
    method: 'DELETE',
    body: JSON.stringify({ id: companyId }),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}