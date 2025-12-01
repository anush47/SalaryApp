import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { PdfService } from "./service";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { z } from "zod";

// POST: Generate PDF
export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      return await PdfService.generatePdf(body, context);
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

