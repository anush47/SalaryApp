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
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return ApiResponseUtils.sendBadRequest("Invalid JSON body");
        }

        // Validate request body
        const { apiKey } = validateApiKeySchema.parse(body);

        // Validate API key and get company info
        const companyInfo = await KioskService.validateApiKey(apiKey);

        return ApiResponseUtils.sendSuccess(companyInfo, "API key validated successfully");
    } catch (error) {
        console.error("[KIOSK-API] Error in validate-key:", error);

        if (error instanceof z.ZodError) {
            return ApiResponseUtils.sendBadRequest(error.errors[0].message);
        }

        if (error instanceof Error) {
            const status = (error as any).status || 500;
            return ApiResponseUtils.sendError(
                error.message,
                (error as any).code || 'INTERNAL_ERROR',
                undefined,
                undefined,
                status
            );
        }

        return ApiResponseUtils.sendError("An unexpected error occurred");
    }
}
