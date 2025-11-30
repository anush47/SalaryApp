// Department API utilities

import { ApiResponse } from '../apiResponse';

/**
 * Generic API fetch function with consistent error handling for department operations
 */
async function departmentApiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
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
 * Fetch departments for a company
 */
export async function fetchDepartments(companyId: string) {
  const queryParams = new URLSearchParams();
  queryParams.append('companyId', companyId);
  
  const url = `/api/departments?${queryParams.toString()}`;
  const data = await departmentApiFetch(url);
  
  // Handle response structure
  if (data && Array.isArray(data)) {
    return data;
  }
  
  if (data && data.departments) {
    return Array.isArray(data.departments) ? data.departments : [data.departments];
  }
  
  if (data && data.data && data.data.departments) {
    return Array.isArray(data.data.departments) ? data.data.departments : [data.data.departments];
  }
  
  return [];
}

/**
 * Create a department
 */
export async function createDepartment(departmentData: any) {
  const response = await fetch('/api/departments', {
    method: 'POST',
    body: JSON.stringify(departmentData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Update a department
 */
export async function updateDepartment(departmentData: any) {
  const response = await fetch('/api/departments', {
    method: 'PUT',
    body: JSON.stringify(departmentData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Delete a department
 */
export async function deleteDepartment(departmentId: string) {
  const response = await fetch('/api/departments', {
    method: 'DELETE',
    body: JSON.stringify({ id: departmentId }),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}