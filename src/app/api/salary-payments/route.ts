import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { SalaryPaymentService } from "./service";

export async function GET(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const result = await SalaryPaymentService.getPayments(req, context);
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
            const result = await SalaryPaymentService.createPayment(body, context);
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
            const result = await SalaryPaymentService.updatePayment(body, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}

export async function DELETE(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            let paymentIds: string[] = [];

            // Check for query param (single)
            const paymentId = req.nextUrl.searchParams.get("paymentId");
            if (paymentId) {
                paymentIds = [paymentId];
            } else {
                // Check body for bulk (optional)
                try {
                    const body = await req.json();
                    if (body.paymentIds && Array.isArray(body.paymentIds)) {
                        paymentIds = body.paymentIds;
                    }
                } catch (e) {
                    // Body might be empty if just query param expected, ignore error
                }
            }

            if (paymentIds.length === 0) {
                return ApiResponseUtils.sendBadRequest("Payment ID(s) is required");
            }

            const result = await SalaryPaymentService.deletePayments(paymentIds, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}
