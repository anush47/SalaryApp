import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { SalaryPaymentService } from "../service";

export async function POST(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const body = await req.json();
            const result = await SalaryPaymentService.acknowledgePayment(body, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}
