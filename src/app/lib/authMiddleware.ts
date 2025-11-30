import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import { HTTP_STATUS, API_RESPONSE } from '@/app/lib/constants';
import { logger } from '@/app/lib/logger';
import { ApiResponse, RequestContext } from '@/app/lib/apiResponse';

/**
 * Authentication middleware to verify user sessions
 */
export async function authenticateRequest(req: NextRequest): Promise<{ authenticated: boolean; context?: RequestContext; response?: NextResponse }> {
  try {
    const session = await getServerSession(options);
    
    if (!session || !session.user || !session.user.id) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: API_RESPONSE.DEFAULT_UNAUTHORIZED_MESSAGE,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      };

      return {
        authenticated: false,
        response: NextResponse.json(response, { status: HTTP_STATUS.UNAUTHORIZED }),
      };
    }

    // Check if user account is active
    if (session.user.isActive === false) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Account is disabled',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      };

      return {
        authenticated: false,
        response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
      };
    }

    // For employees, check canLogin permission
    if (session.user.role === 'employee' && session.user.canLogin === false) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_LOGIN_PERMISSION',
          message: 'No login permission',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      };

      return {
        authenticated: false,
        response: NextResponse.json(response, { status: HTTP_STATUS.FORBIDDEN }),
      };
    }

    // Create request context with user info
    const requestId = generateRequestId();
    const context: RequestContext = {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        isActive: session.user.isActive,
        canLogin: session.user.canLogin,
      },
      requestId,
      startTime: Date.now(),
    };

    // Extract company ID from query parameters if present
    const companyId = req.nextUrl.searchParams.get('companyId');
    if (companyId) {
      context.companyId = companyId;
    }

    return { authenticated: true, context };
  } catch (error) {
    logger.error('Authentication error', { error: error instanceof Error ? error.message : String(error) }, error as Error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication service unavailable',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    };

    return {
      authenticated: false,
      response: NextResponse.json(response, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }),
    };
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}