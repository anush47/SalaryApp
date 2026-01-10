import { NextRequest, NextResponse } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { KioskService, getEmployeesSchema } from "../service";
import { z } from "zod";

/**
 * GET /api/kiosk/employees?apiKey=xxx
 * Returns list of active employees for face registration
 */
export async function GET(req: NextRequest) {
    try {
        const apiKey = req.nextUrl.searchParams.get("apiKey");

        // Validate query params
        const validated = getEmployeesSchema.parse({ apiKey });

        // Get employees
        const employees = await KioskService.getEmployeesForKiosk(validated.apiKey);

        return ApiResponseUtils.sendSuccess({ employees }, "Employees retrieved successfully");
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponseUtils.sendBadRequest(error.errors[0].message);
        }

        return ApiResponseUtils.sendError((error as any).message || String(error));
    }
}
