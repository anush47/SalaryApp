import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Enhanced Middleware with Role-Based Access Control (RBAC)
 *
 * Security Features:
 * - Authentication check (user must be logged in)
 * - Role-based route protection (admin, employer, employee)
 * - Active status validation (isActive must be true)
 * - Employee permission check (canLogin must be true)
 * - Automatic redirection for unauthorized access
 */
export async function proxy(req: NextRequest) {
  // Get the token (includes user data: id, email, role, isActive, etc.)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  const { pathname } = req.nextUrl;

  // If no token, redirect to sign in
  if (!token) {
    const signInUrl = new URL('/auth/signIn', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ===== CRITICAL: Check if user account is active =====
  if (token.isActive === false) {
    const signInUrl = new URL('/auth/signIn', req.url);
    signInUrl.searchParams.set('error', 'AccountDisabled');
    return NextResponse.redirect(signInUrl);
  }

  // ===== CRITICAL: Check employee canLogin permission =====
  if (token.role === 'employee' && token.canLogin === false) {
    const signInUrl = new URL('/auth/signIn', req.url);
    signInUrl.searchParams.set('error', 'NoLoginPermission');
    return NextResponse.redirect(signInUrl);
  }

  // ===== ADMIN ROUTES: Only admin role allowed =====
  if (pathname.startsWith('/admin')) {
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
    return NextResponse.next();
  }

  // ===== USER ROUTES: Role-based access control =====
  if (pathname.startsWith('/user')) {

    // Define employer-only routes
    const employerOnlyRoutes = [
      '/user/mycompanies',
      '/user/employees',
      '/user/organization',
      '/user/salaries',
      '/user/payments',
      '/user/purchases', // Only if role is not admin
    ];

    // Employee role restrictions
    if (token.role === 'employee') {
      // Check if employee is trying to access employer-only routes
      const isEmployerRoute = employerOnlyRoutes.some(route =>
        pathname.startsWith(route)
      );

      if (isEmployerRoute) {
        // Redirect to employee dashboard
        return NextResponse.redirect(
          new URL('/user?userPageSelect=dashboard', req.url)
        );
      }

      // Employee-specific routes that ARE allowed
      const allowedEmployeeRoutes = [
        '/user',              // Main user page (will show employee dashboard)
        '/user/profile',      // Employee profile
        '/user/settings',     // Employee settings
      ];

      // Check if accessing allowed route or employee dashboard
      const isAllowedRoute = allowedEmployeeRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
      );

      if (!isAllowedRoute) {
        // If trying to access other routes, redirect to dashboard
        return NextResponse.redirect(
          new URL('/user?userPageSelect=dashboard', req.url)
        );
      }
    }

    // Employer role restrictions
    if (token.role === 'employer') {
      // Employers cannot access purchases (admin only)
      if (pathname.startsWith('/user/purchases')) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Admin has access to everything, no restrictions
    return NextResponse.next();
  }

  // Default: allow access
  return NextResponse.next();
}

// Applies middleware only to these routes
// Ref: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    "/user/:path*",
    "/admin/:path*"
  ]
};
