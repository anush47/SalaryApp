import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { PurchaseService } from "../service";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import Company from "@/app/models/Company";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET: Fetch price based on months and company ID
export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const { user } = context;
      if (!user) {
        return ApiResponseUtils.sendUnauthorized("User not found");
      }
      const companyId = req.nextUrl.searchParams.get("companyId");
      const months = req.nextUrl.searchParams.get("months");

      if (!companyId) {
        return ApiResponseUtils.sendBadRequest("Company ID is required");
      }

      //Extract months into an array
      const monthsArray = months ? months.split(" ") : [];

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

      // Calculate the price
      const { totalPrice, finalTotalPrice } = PurchaseService.calculateTotalPrice(
        company,
        monthsArray
      );

      return ApiResponseUtils.sendSuccess({ totalPrice, finalTotalPrice });
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
