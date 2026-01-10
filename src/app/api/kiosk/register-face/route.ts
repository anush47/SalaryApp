import { NextRequest, NextResponse } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { KioskService, registerFaceSchema } from "../service";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Company from "@/app/models/Company";

/**
 * POST /api/kiosk/register-face
 * Registers face data for an employee
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate session
        const session = await getServerSession(options);
        if (!session || !session.user) {
            return ApiResponseUtils.sendError(new Error("Unauthorized"), 401);
        }

        // Role check
        if (session.user.role !== "employer" && session.user.role !== "admin") {
            return ApiResponseUtils.sendError(new Error("Forbidden: Access restricted to employers"), 403);
        }

        // Validate request body
        const { apiKey, employeeId, faceData } = registerFaceSchema.parse(body);

        // Security Check: Enforce Ownership (if not admin)
        if (session.user.role === "employer") {
            const company = await KioskService.validateApiKey(apiKey);

            // Verify the employer owns this company
            // Re-fetch company with user field to check ownership
            const companyDoc = await Company.findById(company.companyId).select("user");

            if (!companyDoc || companyDoc.user.toString() !== session.user.id) {
                return ApiResponseUtils.sendError(new Error("Forbidden: You do not own this company"), 403);
            }
        }

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
