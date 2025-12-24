import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { RequestContext } from "@/app/lib/apiResponse";
import { EmployeeService } from "./service";
import { employeeCreateSchema, employeeUpdateSchema, employeeIdSchema } from "@/app/lib/schemas";
import { z } from "zod";
import { getPaginationParams, createPaginatedResponse, getTotalCount } from "@/app/lib/pagination";

export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      // Get the employeeId from URL
      const employeeId = req.nextUrl.searchParams.get("employeeId");
      // Get the companyId from URL
      const companyId = req.nextUrl.searchParams.get("companyId");
      // Get the user parameter (for employee portal to find their own record)
      const userParam = req.nextUrl.searchParams.get("user");

      //if none are present
      if (!employeeId && !companyId && !userParam) {
        return ApiResponseUtils.sendBadRequest("Employee ID, Company ID, or User ID is required");
      }

      if (userParam) {
        // Fetch employee by user ID (for employee portal)
        const employees = await EmployeeService.getEmployeeByUser(userParam, context);
        return ApiResponseUtils.sendSuccess({ employees }, "Employee retrieved successfully");
      } else if (employeeId) {
        // Fetch employee from the database
        const employee = await EmployeeService.getEmployee(employeeId, context);
        return ApiResponseUtils.sendSuccess({ employees: [employee] }, "Employee retrieved successfully");
      } else if (companyId) {
        // Fetch employees from the database
        const search = req.nextUrl.searchParams.get("search") || undefined;
        const { page, limit, total, employees } = await EmployeeService.getEmployeesByCompany(companyId, req, context, search);
        const response = createPaginatedResponse(employees, page, limit, total);
        return NextResponse.json({
          success: true,
          message: "Employees retrieved successfully",
          ...response,
          employees: response.data,
          meta: {
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - context.startTime,
            requestId: context.requestId,
          },
        });
      }

      return ApiResponseUtils.sendBadRequest("Invalid parameters");
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      // Parse and validate the request body
      const body = await req.json();

      const result = await EmployeeService.createEmployee(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function PUT(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      // Parse and validate the request body
      const body = await req.json();

      const result = await EmployeeService.updateEmployee(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      console.log(error);
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function DELETE(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      // Parse request body
      const body = await req.json();
      const employeeId = body.employeeId;

      const result = await EmployeeService.deleteEmployee(employeeId, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}