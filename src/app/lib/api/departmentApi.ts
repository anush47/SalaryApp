import { apiFetch } from './commonApi';

/**
 * Fetch departments for a company
 */
export async function fetchDepartments(companyId: string) {
  const queryParams = new URLSearchParams();
  queryParams.append('companyId', companyId);

  const url = `/api/departments?${queryParams.toString()}`;
  const data = await apiFetch(url);

  // Handle response structure
  if (data && Array.isArray(data)) {
    return data;
  }

  // Handle paginated response structure: { data: { data: [], pagination: {} } }
  // apiFetch returns result.data, so 'data' here is { data: [], pagination: {} }
  if (data && data.data && Array.isArray(data.data)) {
    return data.data;
  }

  if (data && data.departments) {
    return Array.isArray(data.departments) ? data.departments : [data.departments];
  }

  return [];
}

/**
 * Fetch a single department by ID
 */
export async function fetchDepartmentById(departmentId: string) {
  const url = `/api/departments/${departmentId}`;
  const data = await apiFetch(url);
  return data.department;
}

/**
 * Create a department
 */
export async function createDepartment(departmentData: any) {
  return apiFetch('/api/departments', {
    method: 'POST',
    body: JSON.stringify(departmentData),
  });
}

/**
 * Update a department
 */
export async function updateDepartment(departmentData: any) {
  return apiFetch('/api/departments', {
    method: 'PUT',
    body: JSON.stringify(departmentData),
  });
}

/**
 * Delete a department
 */
export async function deleteDepartment(departmentId: string) {
  return apiFetch(`/api/departments?departmentId=${departmentId}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch department hierarchy
 */
export async function fetchDepartmentHierarchy(companyId: string) {
  const url = `/api/departments/hierarchy?companyId=${companyId}`;
  const data = await apiFetch(url);
  return data.hierarchy;
}