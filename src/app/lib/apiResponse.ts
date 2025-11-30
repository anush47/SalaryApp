import { HTTP_STATUS } from './constants';

// Define the API response structure interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    executionTime?: number;
  };
}

// Define the API response utility interface
export interface ApiResponseUtils {
  success<T = any>(data?: T, message?: string, meta?: ApiResponse['meta']): ApiResponse<T>;
  error(message: string, code?: string, details?: any, meta?: ApiResponse['meta']): ApiResponse;
  badRequest(message?: string, details?: any): ApiResponse;
  unauthorized(message?: string, details?: any): ApiResponse;
  forbidden(message?: string, details?: any): ApiResponse;
  notFound(message?: string, details?: any): ApiResponse;
  internalError(message?: string, details?: any): ApiResponse;
}

// Define the request context interface for middleware
export interface RequestContext {
  user?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    canLogin?: boolean;
    [key: string]: any;
  };
  companyId?: string;
  requestId: string;
  startTime: number;
  [key: string]: any;
}