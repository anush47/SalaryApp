import { NextResponse } from 'next/server';
import { HTTP_STATUS, API_RESPONSE } from '@/app/lib/constants';
import { ApiResponse } from '@/app/lib/apiResponse';

/**
 * API Response Utility Functions
 */
export class ApiResponseUtils {
  /**
   * Create a success response
   */
  static success<T = any>(data?: T, message?: string, meta?: ApiResponse['meta']): ApiResponse<T> {
    return {
      success: true,
      data,
      message: message || API_RESPONSE.DEFAULT_SUCCESS_MESSAGE,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Create an error response
   */
  static error(message: string, code?: string, details?: any, meta?: ApiResponse['meta']): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Create a bad request response
   */
  static badRequest(message?: string, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: message || API_RESPONSE.DEFAULT_BAD_REQUEST_MESSAGE,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(message?: string, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: message || API_RESPONSE.DEFAULT_UNAUTHORIZED_MESSAGE,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create a forbidden response
   */
  static forbidden(message?: string, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: message || API_RESPONSE.DEFAULT_FORBIDDEN_MESSAGE,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create a not found response
   */
  static notFound(message?: string, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: message || API_RESPONSE.DEFAULT_NOT_FOUND_MESSAGE,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create an internal server error response
   */
  static internalError(message?: string, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: message || API_RESPONSE.DEFAULT_ERROR_MESSAGE,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T = any>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): ApiResponse<{ data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data: {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      message: message || API_RESPONSE.DEFAULT_SUCCESS_MESSAGE,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Send success response with NextResponse
   */
  static sendSuccess<T = any>(
    data?: T,
    message?: string,
    meta?: ApiResponse['meta'],
    status: number = HTTP_STATUS.SUCCESS
  ): NextResponse {
    const response = this.success(data, message, meta);
    return NextResponse.json(response, { status });
  }

  /**
   * Send error response with NextResponse
   */
  static sendError(
    message: string,
    code?: string,
    details?: any,
    meta?: ApiResponse['meta'],
    status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
  ): NextResponse {
    const response = this.error(message, code, details, meta);
    return NextResponse.json(response, { status });
  }

  /**
   * Send bad request response
   */
  static sendBadRequest(message?: string, details?: any): NextResponse {
    const response = this.badRequest(message, details);
    return NextResponse.json(response, { status: HTTP_STATUS.BAD_REQUEST });
  }

  /**
   * Send unauthorized response
   */
  static sendUnauthorized(message?: string, details?: any): NextResponse {
    const response = this.unauthorized(message, details);
    return NextResponse.json(response, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  /**
   * Send forbidden response
   */
  static sendForbidden(message?: string, details?: any): NextResponse {
    const response = this.forbidden(message, details);
    return NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN });
  }

  /**
   * Send not found response
   */
  static sendNotFound(message?: string, details?: any): NextResponse {
    const response = this.notFound(message, details);
    return NextResponse.json(response, { status: HTTP_STATUS.NOT_FOUND });
  }

  /**
   * Send internal error response
   */
  static sendInternalError(message?: string, details?: any): NextResponse {
    const response = this.internalError(message, details);
    return NextResponse.json(response, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}

// Export individual utility functions for easier use
export const { 
  success, 
  error, 
  badRequest, 
  unauthorized, 
  forbidden, 
  notFound, 
  internalError,
  paginated,
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendInternalError
} = ApiResponseUtils;