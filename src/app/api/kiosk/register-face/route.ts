import { NextRequest, NextResponse } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { KioskService, registerFaceSchema } from "../service";
import { z } from "zod";

/**
 * POST /api/kiosk/register-face
 * Registers face data for an employee
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate request body
        const { apiKey, employeeId, faceData } = registerFaceSchema.parse(body);

        // Register face
        const result = await KioskService.registerEmployeeFace(apiKey, employeeId, faceData);

        return ApiResponseUtils.sendSuccess(result, "Face registered successfully");
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponseUtils.sendBadRequest(error.errors[0].message);
        }

        return ApiResponseUtils.sendError(error);
    }
}
