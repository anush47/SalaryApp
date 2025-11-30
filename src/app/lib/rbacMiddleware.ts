import { NextResponse } from 'next/server';
import { HTTP_STATUS, API_RESPONSE, ROLES } from '@/app/lib/constants';
import { logger } from '@/app/lib/logger';
import { ApiResponse, RequestContext } from '@/app/lib/apiResponse';

/**
 * Role-based access control middleware
 */
export function checkRoleAccess(context: RequestContext, requiredRoles: string[]): { authorized: boolean; response?: NextResponse } {
  if (!context.user || !context.user.role) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MISSING_USER_ROLE',
        message: 'User role is missing in context',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      },
    };

    return {
      authorized: false,
      response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
    };
  }

  // Check if user has one of the required roles
  const hasRequiredRole = requiredRoles.some(role => context.user?.role === role);
  
  if (!hasRequiredRole) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${context.user.role}`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      },
    };

    logger.warn('Access denied due to insufficient permissions', {
      userId: context.user.id,
      userRole: context.user.role,
      requiredRoles,
      requestId: context.requestId,
    });

    return {
      authorized: false,
      response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
    };
  }

  return { authorized: true };
}

/**
 * Check if user can access a specific company
 */
export async function checkCompanyAccess(context: RequestContext, companyId: string): Promise<{ authorized: boolean; response?: NextResponse }> {
  if (!context.user || !context.user.id) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MISSING_USER_CONTEXT',
        message: 'User context is missing',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      },
    };

    return {
      authorized: false,
      response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
    };
  }

  // Admin can access any company
  if (context.user.role === ROLES.ADMIN) {
    return { authorized: true };
  }

  // Employers can access their own companies
  if (context.user.role === ROLES.EMPLOYER) {
    try {
      // Import model dynamically to prevent circular dependencies
      const { default: Company } = await import('@/app/models/Company');
      const company = await Company.findOne({ _id: companyId, user: context.user.id });

      if (!company) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'COMPANY_ACCESS_DENIED',
            message: 'Access denied. You cannot access this company.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
          },
        };

        logger.warn('Company access denied', {
          userId: context.user.id,
          companyId,
          requestId: context.requestId,
        });

        return {
          authorized: false,
          response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
        };
      }

      return { authorized: true };
    } catch (error) {
      logger.error('Error checking company access', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.user.id,
        companyId,
        requestId: context.requestId,
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'COMPANY_ACCESS_ERROR',
          message: 'Error checking company access',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        },
      };

      return {
        authorized: false,
        response: NextResponse.json(response, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }),
      };
    }
  }

  // Employees can access their own company
  if (context.user.role === ROLES.EMPLOYEE) {
    try {
      // Import model dynamically to prevent circular dependencies
      const { default: Employee } = await import('@/app/models/Employee');
      const employee = await Employee.findOne({
        user: context.user.id,
        company: companyId,
      });

      if (!employee) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'EMPLOYEE_COMPANY_ACCESS_DENIED',
            message: 'Access denied. You cannot access this company.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
          },
        };

        logger.warn('Employee company access denied', {
          userId: context.user.id,
          companyId,
          requestId: context.requestId,
        });

        return {
          authorized: false,
          response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
        };
      }

      return { authorized: true };
    } catch (error) {
      logger.error('Error checking employee company access', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.user.id,
        companyId,
        requestId: context.requestId,
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'COMPANY_ACCESS_ERROR',
          message: 'Error checking company access',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        },
      };

      return {
        authorized: false,
        response: NextResponse.json(response, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }),
      };
    }
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'UNKNOWN_USER_ROLE',
      message: 'Unknown user role',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
  };

  return {
    authorized: false,
    response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
  };
}

/**
 * Check if user is an admin
 */
export function isAdmin(context: RequestContext): boolean {
  return context.user?.role === ROLES.ADMIN;
}

/**
 * Check if user is an employer
 */
export function isEmployer(context: RequestContext): boolean {
  return context.user?.role === ROLES.EMPLOYER;
}

/**
 * Check if user is an employee
 */
export function isEmployee(context: RequestContext): boolean {
  return context.user?.role === ROLES.EMPLOYEE;
}