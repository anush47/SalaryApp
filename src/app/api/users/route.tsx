import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { UserService } from "./service";
import { z } from "zod";

// GET: Fetch Users
export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const result = await UserService.getUsers(req, context);

      // If result is paginated response
      if ('pagination' in result) {
        return NextResponse.json({
          success: true,
          message: "Users retrieved successfully",
          ...result,
          meta: {
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - context.startTime,
            requestId: context.requestId,
          }
        });
      }

      return ApiResponseUtils.sendSuccess(result, "Users retrieved successfully");
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error && error.message === "Unauthorized") {
        return ApiResponseUtils.sendUnauthorized("Unauthorized");
      }
      if (error instanceof Error && error.message === "User not found") {
        return ApiResponseUtils.sendNotFound("User not found");
      }
      throw error;
    }
  });
}

// POST: Create User
export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await UserService.createUser(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error && error.message === "Unauthorized") {
        return ApiResponseUtils.sendUnauthorized("Unauthorized");
      }
      throw error;
    }
  });
}

// PUT: Update User
export async function PUT(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await UserService.updateUser(body, context);
      return ApiResponseUtils.sendSuccess(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error && error.message === "Unauthorized") {
        return ApiResponseUtils.sendUnauthorized("Unauthorized");
      }
      if (error instanceof Error && error.message === "User not found") {
        return ApiResponseUtils.sendNotFound("User not found");
      }
      throw error;
    }
  });
}

// DELETE: Delete User
export async function DELETE(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const result = await UserService.deleteUser(req, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error && error.message === "Unauthorized") {
        return ApiResponseUtils.sendUnauthorized("Unauthorized");
      }
      if (error instanceof Error && (error.message === "User has companies associated with them" || error.message === "Cannot delete an admin user")) {
        return ApiResponseUtils.sendBadRequest(error.message);
      }
      throw error;
    }
  });
}
