// Employee API utilities

import { apiFetch, apiFetchRaw } from './commonApi';
import { ApiResponse } from '../apiResponse';

/**
 * Fetch employees with consistent response handling
 */
export async function fetchEmployees(params: {
  employeeId?: string;
  companyId?: string;
  user?: string;
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  const queryParams = new URLSearchParams();

  if (params.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params.companyId) queryParams.append('companyId', params.companyId);
  if (params.user) queryParams.append('user', params.user);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);

  const url = `/api/employees?${queryParams.toString()}`;
  const response = await apiFetchRaw(url);
  const data: any = response;

  // Handle response structure: could be { employees: [] } or { data: { employees: [] } }
  if (data && data.pagination) {
    return {
      employees: data.data || data.employees,
      pagination: data.pagination
    };
  }

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
  return apiFetch('/api/employees', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  });
}

/**
 * Update an employee
 */
export async function updateEmployee(employeeData: any) {
  return apiFetch('/api/employees', {
    method: 'PUT',
    body: JSON.stringify(employeeData),
  });
}

/**
 * Delete an employee
 */
export async function deleteEmployee(employeeId: string) {
  return apiFetch('/api/employees', {
    method: 'DELETE',
    body: JSON.stringify({ employeeId }),
  });
}

/**
 * Fetch leave balance for an employee
 */
export async function fetchLeaveBalance(employeeId: string) {
  return apiFetch(`/api/employees/leave-balance?employeeId=${employeeId}`);
}

/**
 * Fetch manager dashboard data
 */
export async function fetchManagerDashboard(employeeId: string) {
  return apiFetch(`/api/dashboard/manager?employeeId=${employeeId}`);
}