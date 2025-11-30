// Leave API utilities

import { ApiResponse } from '../apiResponse';

/**
 * Generic API fetch function with consistent error handling for leave operations
 */
async function leaveApiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
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
 * Fetch leave types
 */
export async function fetchLeaveTypes(companyId: string) {
  const queryParams = new URLSearchParams();
  queryParams.append('companyId', companyId);
  
  const url = `/api/leave-types?${queryParams.toString()}`;
  const data = await leaveApiFetch(url);
  
  // Handle response structure
  if (data && Array.isArray(data)) {
    return data;
  }
  
  if (data && data.leaveTypes) {
    return Array.isArray(data.leaveTypes) ? data.leaveTypes : [data.leaveTypes];
  }
  
  if (data && data.data && data.data.leaveTypes) {
    return Array.isArray(data.data.leaveTypes) ? data.data.leaveTypes : [data.data.leaveTypes];
  }
  
  return [];
}

/**
 * Fetch leave requests with filtering options
 */
export async function fetchLeaveRequests(params: { 
  companyId: string; 
  employeeId?: string; 
  status?: string; 
  startDate?: string; 
  endDate?: string;
  myRequests?: boolean;
  pendingApprovals?: boolean;
} = {} as any) {
  const queryParams = new URLSearchParams();
  
  queryParams.append('companyId', params.companyId);
  if (params.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params.status) queryParams.append('status', params.status);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.myRequests) queryParams.append('myRequests', 'true');
  if (params.pendingApprovals) queryParams.append('pendingApprovals', 'true');

  const url = `/api/leave-requests?${queryParams.toString()}`;
  const data = await leaveApiFetch(url);
  
  // Handle response structure
  if (data && Array.isArray(data)) {
    return data;
  }
  
  if (data && data.leaveRequests) {
    return Array.isArray(data.leaveRequests) ? data.leaveRequests : [data.leaveRequests];
  }
  
  if (data && data.data && data.data.leaveRequests) {
    return Array.isArray(data.data.leaveRequests) ? data.data.leaveRequests : [data.data.leaveRequests];
  }
  
  return [];
}

/**
 * Create a leave request
 */
export async function createLeaveRequest(leaveRequestData: any) {
  const response = await fetch('/api/leave-requests', {
    method: 'POST',
    body: JSON.stringify(leaveRequestData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Update a leave request (approve, reject, cancel)
 */
export async function updateLeaveRequest(leaveRequestData: any) {
  const response = await fetch('/api/leave-requests', {
    method: 'PUT',
    body: JSON.stringify(leaveRequestData),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!response.ok || !result.success) {
    const errorMessage = result.error?.message || result.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return result;
}