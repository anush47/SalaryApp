import { NextResponse } from 'next/server';
import { HTTP_STATUS, API_RESPONSE } from '@/app/lib/constants';
import { logger } from '@/app/lib/logger';
import { ApiResponse, RequestContext } from '@/app/lib/apiResponse';

// Define custom error types
export class BaseError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string = API_RESPONSE.DEFAULT_BAD_REQUEST_MESSAGE, details?: any) {
    super(message, 'BAD_REQUEST', HTTP_STATUS.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = API_RESPONSE.DEFAULT_UNAUTHORIZED_MESSAGE, details?: any) {
    super(message, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = API_RESPONSE.DEFAULT_FORBIDDEN_MESSAGE, details?: any) {
    super(message, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = API_RESPONSE.DEFAULT_NOT_FOUND_MESSAGE, details?: any) {
    super(message, 'NOT_FOUND', HTTP_STATUS.NOT_FOUND, details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = 'Validation error', details?: any) {
    super(message, 'VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Database error', details?: any) {
    super(message, 'DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, details);
  }
}

export class InternalError extends BaseError {
  constructor(message: string = API_RESPONSE.DEFAULT_ERROR_MESSAGE, details?: any) {
    super(message, 'INTERNAL_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, details);
  }
}

// Error handler interface
export interface ErrorHandler {
  handle(error: Error, context?: RequestContext): NextResponse;
}

// Centralized error handler
export class ApiErrorHandler implements ErrorHandler {
  public handle(error: Error, context?: RequestContext): NextResponse {
    // Log the error first
    logger.error('API Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context?.requestId,
      userId: context?.user?.id,
    }, error);

    let response: ApiResponse;

    // Check for custom error types
    if (error instanceof BaseError) {
      response = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context?.requestId || this.generateRequestId(),
          executionTime: context ? Date.now() - context.startTime : undefined,
        },
      };

      return NextResponse.json(response, { status: error.status });
    }

    // Handle specific error types that might not extend BaseError
    if (error instanceof TypeError) {
      response = {
        success: false,
        error: {
          code: 'TYPE_ERROR',
          message: 'Type error occurred',
          details: error.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context?.requestId || this.generateRequestId(),
          executionTime: context ? Date.now() - context.startTime : undefined,
        },
      };

      return NextResponse.json(response, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Handle Zod validation errors
    // This won't be available here, but we'll return a generic error
    if (error.message.includes('Zod')) {
      response = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context?.requestId || this.generateRequestId(),
          executionTime: context ? Date.now() - context.startTime : undefined,
        },
      };

      return NextResponse.json(response, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Return a generic error response for unknown errors
    response = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: API_RESPONSE.DEFAULT_ERROR_MESSAGE,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: context?.requestId || this.generateRequestId(),
        executionTime: context ? Date.now() - context.startTime : undefined,
      },
    };

    return NextResponse.json(response, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }

  private generateRequestId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export a singleton error handler instance
export const errorHandler = new ApiErrorHandler();