import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { PaymentService } from "./service";
import { z } from "zod";

// GET: Fetch Payments
export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const result = await PaymentService.getPayments(req, context);

      if ('pagination' in result) {
        return NextResponse.json({
          success: true,
          message: "Payments retrieved successfully",
          ...result,
          meta: {
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - context.startTime,
            requestId: context.requestId,
          }
        });
      }

      return ApiResponseUtils.sendSuccess(result, "Payments retrieved successfully");
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error) {
        if (error.message === "Access denied") return ApiResponseUtils.sendForbidden("Access denied");
        if (error.message === "Payment not found") return ApiResponseUtils.sendNotFound("Payment not found");
        if (error.message === "Company ID or payment ID is required") return ApiResponseUtils.sendBadRequest(error.message);
      }
      throw error;
    }
  });
}

// POST: Create Payment
export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await PaymentService.createPayment(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error) {
        if (error.message === "Access denied") return ApiResponseUtils.sendForbidden("Access denied");
        if (error.message === "Payment already exists") return ApiResponseUtils.sendBadRequest(error.message);
        if (error.message.includes("not Purchased")) return ApiResponseUtils.sendBadRequest(error.message);
      }
      throw error;
    }
  });
}

// PUT: Update Payment
export async function PUT(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await PaymentService.updatePayment(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error) {
        if (error.message === "Access denied") return ApiResponseUtils.sendForbidden("Access denied");
        if (error.message === "Payment not found") return ApiResponseUtils.sendNotFound("Payment not found");
      }
      throw error;
    }
  });
}

// DELETE: Delete Payments
export async function DELETE(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const result = await PaymentService.deletePayments(req, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      if (error instanceof Error) {
        if (error.message === "Access denied") return ApiResponseUtils.sendForbidden("Access denied");
        if (error.message.includes("not allowed to delete")) return ApiResponseUtils.sendForbidden(error.message);
      }
      throw error;
    }
  });
}
