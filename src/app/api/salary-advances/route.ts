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
            const advanceId = req.nextUrl.searchParams.get("advanceId");
            if (!advanceId) {
                return ApiResponseUtils.sendBadRequest("Advance ID is required");
            }
            const result = await SalaryAdvanceService.deleteAdvance(advanceId, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}
