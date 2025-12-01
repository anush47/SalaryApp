import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { PurchaseService } from "../service";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import Company from "@/app/models/Company";
import { z } from "zod";

// GET: Check if purchased
export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const { user } = context;
      if (!user) {
        return ApiResponseUtils.sendUnauthorized("User not found");
      }
      const companyId = req.nextUrl.searchParams.get("companyId");
      const month = req.nextUrl.searchParams.get("month");

      if (!companyId) {
        return ApiResponseUtils.sendBadRequest("Company ID is required");
      }

      if (!month) {
        return ApiResponseUtils.sendBadRequest("Month is required");
      }

      // Create company filter based on user role
      const companyFilter = { user: user.id, _id: companyId };
      if (user.role === "admin") {
        if (companyFilter.user) {
          delete (companyFilter as { user?: string }).user;
        }
      }

      // Fetch the company
      const company = await Company.findOne(companyFilter);
      if (!company) {
        return ApiResponseUtils.sendNotFound("Company not found");
      }

      if (user.role === "admin" && company.mode === "visit") {
        return ApiResponseUtils.sendSuccess({ purchased: "approved" });
      }

      const purchased = await PurchaseService.checkPurchased(companyId, month);

      return ApiResponseUtils.sendSuccess({ purchased });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      return ApiResponseUtils.sendInternalError(
        error.message || "An unexpected error occurred"
      );
    }
  });
}
