// Common API utilities

import { ApiResponse } from '../apiResponse';

/**
 * Generic API fetch function with consistent error handling
 * This can be used for any API call that follows the standard response format
 */
export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
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
 * Get paginated data with consistent response handling
 */
export async function fetchPaginatedData<T = any>(url: string, page: number = 1, limit: number = 20): Promise<{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> {
  const fullUrl = `${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=${limit}`;
  const data = await apiFetch(fullUrl);
  
  // Handle different response structures
  if (data && data.data && data.pagination) {
    return {
      data: data.data,
      pagination: data.pagination
    };
  }
  
  // Check for other common structures
  if (data && Array.isArray(data)) {
    return {
      data,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit),
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
  
  // If there's a different structure, return default
  return {
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false
    }
  };
}

/**
 * Upload file with progress tracking
 */
export async function uploadFile(file: File, url: string, onProgress?: (progress: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText);
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error?.message || result.message || 'Upload failed'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during upload'));
    };

    xhr.open('POST', url);
    xhr.send(formData);
  });
}


/**
 * Validate response structure
 * This can be used to ensure the API response matches expected format
 */
export function validateApiResponse<T = any>(response: any, expectedKeys: string[] = []): response is ApiResponse<T> {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check for required keys
  if (!('success' in response)) {
    return false;
  }

  // Check if all expected keys are present
  if (expectedKeys.length > 0) {
    const missingKeys = expectedKeys.filter(key => !(key in response));
    if (missingKeys.length > 0) {
      return false;
    }
  }

  return true;
}