import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { EpfPaymentService } from "./service";

export async function GET(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const result = await EpfPaymentService.getPayments(req, context);
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
            const result = await EpfPaymentService.createPayment(body, context);
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
            const result = await EpfPaymentService.updatePayment(body, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}

export async function DELETE(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const paymentId = req.nextUrl.searchParams.get("paymentId");
            if (!paymentId) {
                return ApiResponseUtils.sendBadRequest("Payment ID is required");
            }
            const result = await EpfPaymentService.deletePayment(paymentId, context);
            return ApiResponseUtils.sendSuccess(result, result.message);
        } catch (error) {
            throw error;
        }
    });
}
