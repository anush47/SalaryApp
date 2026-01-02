import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { SalaryAdvanceService } from "./service";

export async function GET(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const result = await SalaryAdvanceService.getAdvances(req, context);
            return ApiResponseUtils.sendSuccess(result);
        } catch (error) {
            throw error;
        }
    });
}

export async function POST(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const body = await req.json();
            const result = await SalaryAdvanceService.createAdvance(body, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}

export async function PUT(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const body = await req.json();
            const result = await SalaryAdvanceService.updateAdvance(body, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}

export async function DELETE(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            let advanceIds: string[] = [];

            // Check for query param (single)
            const advanceId = req.nextUrl.searchParams.get("advanceId");
            if (advanceId) {
                advanceIds = [advanceId];
            } else {
                // Check body for bulk (optional)
                try {
                    const body = await req.json();
                    if (body.advanceIds && Array.isArray(body.advanceIds)) {
                        advanceIds = body.advanceIds;
                    }
                } catch (e) {
                    // Body might be empty
                }
            }

            if (advanceIds.length === 0) {
                return ApiResponseUtils.sendBadRequest("Advance ID(s) is required");
            }

            const result = await SalaryAdvanceService.deleteAdvances(advanceIds, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}
