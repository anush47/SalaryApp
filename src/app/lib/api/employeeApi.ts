// Employee API utilities

import { ApiResponse } from '../apiResponse';

/**
 * Generic API fetch function with consistent error handling for employee operations
 */
async function employeeApiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
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
 * Fetch employees with consistent response handling
 */
export async function fetchEmployees(params: { 
  employeeId?: string; 
  companyId?: string; 
  page?: number; 
  limit?: number 
} = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params.companyId) queryParams.append('companyId', params.companyId);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const url = `/api/employees?${queryParams.toString()}`;
  const data = await employeeApiFetch(url);
  
  // Handle response structure: could be { employees: [] } or { data: { employees: [] } }
  if (data && Array.isArray(data)) {
    return data;
  }
  
  if (data && data.employees) {
    return Array.isArray(data.employees) ? data.employees : [data.employees];
  }
  
  if (data && data.data && data.data.employees) {
    return Array.isArray(data.data.employees) ? data.data.employees : [data.data.employees];
  }
  
  return [];
}

/**
 * Fetch a single employee by ID
 */
export async function fetchEmployee(employeeId: string) {
  const employees = await fetchEmployees({ employeeId });
  return employees[0] || null;
}

/**
 * Create an employee
 */
export async function createEmployee(employeeData: any) {
  const response = await fetch('/api/employees', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Update an employee
 */
export async function updateEmployee(employeeData: any) {
  const response = await fetch('/api/employees', {
    method: 'PUT',
    body: JSON.stringify(employeeData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Delete an employee
 */
export async function deleteEmployee(employeeId: string) {
  const response = await fetch('/api/employees', {
    method: 'DELETE',
    body: JSON.stringify({ employeeId }),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}