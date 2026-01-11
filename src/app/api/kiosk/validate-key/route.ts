import { NextRequest, NextResponse } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { KioskService, validateApiKeySchema } from "../service";
import { z } from "zod";

/**
 * GET /api/kiosk/validate-key
 * Debug method to check if route is active
 */
export async function GET() {
    return ApiResponseUtils.sendSuccess(null, "Kiosk API is active. Use POST to validate keys.");
}

/**
 * POST /api/kiosk/validate-key
 * Validates the API key and returns company information
 */
export async function POST(req: NextRequest) {
    console.log(`[KIOSK-API] POST request received at ${req.nextUrl.pathname}`);
    console.log(`[KIOSK-API] Method: ${req.method}`);

    try {
        let body;
        try {
            const rawBody = await req.text();
            console.log(`[KIOSK-API] Raw body length: ${rawBody.length}`);
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error("[KIOSK-API] JSON Parse Error:", e);
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
