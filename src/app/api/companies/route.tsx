import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { RequestContext } from "@/app/lib/apiResponse";
import { CompanyService } from "./service";
import { companyCreateSchema, companyUpdateSchema, companyIdSchema } from "@/app/lib/schemas";
import { z } from "zod";

export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      //get the companyId from url
      const companyId = req.nextUrl.searchParams.get("companyId");

      if (companyId) {
        const companies = await CompanyService.getCompany(companyId, context);
        return ApiResponseUtils.sendSuccess({ companies }, "Company retrieved successfully");
      } else {
        const { page, limit, total, companies } = await CompanyService.getCompanies(req, context);
        const response = { page, limit, total, data: companies };
        return NextResponse.json({
          success: true,
          message: "Companies retrieved successfully",
          ...response,
          companies: response.data,
          meta: {
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - context.startTime,
            requestId: context.requestId,
          },
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
        return ApiResponseUtils.sendBadRequest(errorDetails);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await CompanyService.createCompany(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
        return ApiResponseUtils.sendBadRequest(errorDetails);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function PUT(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await CompanyService.updateCompany(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
        return ApiResponseUtils.sendBadRequest(errorDetails);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function DELETE(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await CompanyService.deleteCompany(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}