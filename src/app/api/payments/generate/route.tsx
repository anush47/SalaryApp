import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { PaymentService } from "../service";
import { z } from "zod";

// POST request handler
export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await PaymentService.generatePayment(body, context);
      return ApiResponseUtils.sendSuccess(result, "Payment generated successfully");
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}
