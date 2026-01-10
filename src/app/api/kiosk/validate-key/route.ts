import { NextRequest, NextResponse } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { KioskService, validateApiKeySchema } from "../service";
import { z } from "zod";

/**
 * POST /api/kiosk/validate-key
 * Validates the API key and returns company information
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate request body
        const { apiKey } = validateApiKeySchema.parse(body);

        // Validate API key and get company info
        const companyInfo = await KioskService.validateApiKey(apiKey);

        return ApiResponseUtils.sendSuccess(companyInfo, "API key validated successfully");
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponseUtils.sendBadRequest(error.errors[0].message);
        }

        // Let error handler middleware handle other errors
        return ApiResponseUtils.sendError((error as any).message || String(error));
    }
}
