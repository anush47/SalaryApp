import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { PurchaseService } from "./service";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { z } from "zod";

// GET: Fetch a purchase by ID or all purchases of the company
export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      return await PurchaseService.getPurchases(req, context);
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

// POST: Create a new purchase
export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      return await PurchaseService.createPurchase(body, context);
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

// PUT: Update an existing purchase
export async function PUT(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      return await PurchaseService.updatePurchase(body, context);
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

// DELETE: Delete an existing purchase
export async function DELETE(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      return await PurchaseService.deletePurchase(req, context);
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
