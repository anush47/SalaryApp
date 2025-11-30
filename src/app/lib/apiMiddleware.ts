import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/app/lib/constants';
import { logger } from '@/app/lib/logger';
import { authenticateRequest } from '@/app/lib/authMiddleware';
import { checkRoleAccess, checkCompanyAccess, isAdmin, isEmployer, isEmployee } from '@/app/lib/rbacMiddleware';
import { errorHandler } from '@/app/lib/errorHandler';
import { ApiResponse, RequestContext } from '@/app/lib/apiResponse';
import { ApiResponseUtils } from '@/app/lib/apiResponseUtils';

/**
 * Main API Middleware Wrapper
 * Combines authentication, RBAC, and error handling
 */
export class ApiMiddleware {
  /**
   * Execute the full middleware chain: auth -> RBAC -> error handling -> handler
   */
  static async execute(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>,
    options: {
      requiredRoles?: string[];
      requireCompanyAccess?: boolean;
      requireAuth?: boolean;
    } = {}
  ): Promise<NextResponse> {
    const startTime = Date.now();
    let context: RequestContext | undefined;

    try {
      // Default to requiring authentication
      const requireAuth = options.requireAuth !== false; // Default to true if not specified
      
      if (requireAuth) {
        // Authentication step
        const authResult = await authenticateRequest(req);
        
        if (!authResult.authenticated) {
          return authResult.response!;
        }
        
        context = authResult.context!;
        
        // Add timing information
        context.startTime = startTime;
      } else {
        // Create minimal context when authentication is not required
        context = {
          requestId: this.generateRequestId(),
          startTime,
        };
      }

      // Role-based access control step (if authentication is required)
      if (requireAuth && options.requiredRoles && options.requiredRoles.length > 0) {
        const roleCheck = checkRoleAccess(context, options.requiredRoles);
        
        if (!roleCheck.authorized) {
          return roleCheck.response!;
        }
      }

      // Company access check (if authentication is required)
      if (requireAuth && options.requireCompanyAccess) {
        const companyId = req.nextUrl.searchParams.get('companyId');
        
        if (companyId) {
          const companyAccessCheck = await checkCompanyAccess(context, companyId);
          
          if (!companyAccessCheck.authorized) {
            return companyAccessCheck.response!;
          }
        }
      }

      // Execute the actual handler
      const result = await handler(req, context);
      
      // Add execution time to the response if it's a JSON response
      if (result.headers.get('content-type')?.includes('application/json')) {
        const body = await result.json().catch(() => ({}));
        const updatedBody = {
          ...body,
          meta: {
            ...body.meta,
            executionTime: Date.now() - startTime,
          }
        };
        
        return NextResponse.json(updatedBody, {
          status: result.status,
          headers: result.headers,
        });
      }
      
      return result;
    } catch (error) {
      // Use centralized error handler
      logger.error('API middleware error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: req.url,
        method: req.method,
        requestId: context?.requestId,
        userId: context?.user?.id,
      }, error as Error);
      
      if (context) {
        return errorHandler.handle(error as Error, context);
      } else {
        // Create a minimal context for error handling
        const minimalContext: RequestContext = {
          requestId: this.generateRequestId(),
          startTime,
        };
        return errorHandler.handle(error as Error, minimalContext);
      }
    }
  }

  /**
   * Helper method for authenticated-only endpoints
   */
  static async authenticated(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.execute(req, handler, { requireAuth: true });
  }

  /**
   * Helper method for admin-only endpoints
   */
  static async adminOnly(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.execute(req, handler, {
      requiredRoles: ['admin'],
      requireAuth: true,
    });
  }

  /**
   * Helper method for employer-only endpoints
   */
  static async employerOnly(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.execute(req, handler, {
      requiredRoles: ['employer'],
      requireAuth: true,
    });
  }

  /**
   * Helper method for employee-only endpoints
   */
  static async employeeOnly(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.execute(req, handler, {
      requiredRoles: ['employee'],
      requireAuth: true,
    });
  }

  /**
   * Helper method for endpoints that require specific roles
   */
  static async withRoles(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>,
    roles: string[]
  ): Promise<NextResponse> {
    return this.execute(req, handler, {
      requiredRoles: roles,
      requireAuth: true,
    });
  }

  /**
   * Helper method for endpoints that require company access
   */
  static async withCompanyAccess(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.execute(req, handler, {
      requireCompanyAccess: true,
      requireAuth: true,
    });
  }

  /**
   * Helper method for endpoints that need both role and company access
   */
  static async withRoleAndCompanyAccess(
    req: NextRequest,
    handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>,
    roles: string[]
  ): Promise<NextResponse> {
    return this.execute(req, handler, {
      requiredRoles: roles,
      requireCompanyAccess: true,
      requireAuth: true,
    });
  }

  /**
   * Generate a unique request ID
   */
  private static generateRequestId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export helper functions for easier use
export const { 
  authenticated,
  adminOnly,
  employerOnly,
  employeeOnly,
  withRoles,
  withCompanyAccess,
  withRoleAndCompanyAccess
} = ApiMiddleware;