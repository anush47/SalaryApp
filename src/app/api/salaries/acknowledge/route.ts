import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import dbConnect from "@/app/lib/db";
import SalaryPayment from "@/app/models/SalaryPayment";
import { NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";

export async function PATCH(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            await dbConnect();

            const body = await req.json();
            const { paymentId } = body;

            if (!paymentId) {
                return ApiResponseUtils.sendError("Payment ID is required", 400);
            }

            // Find the payment
            const payment = await SalaryPayment.findById(paymentId).populate('employee');

            if (!payment) {
                throw new NotFoundError("Payment record not found");
            }

            // Verify the payment belongs to the logged-in employee
            if (context.user?.role === "employee") {
                // @ts-ignore
                const employeeUserId = payment.employee?.user?.toString();
                if (employeeUserId !== context.user.id) {
                    throw new ForbiddenError("You can only acknowledge your own payments");
                }
            }

            // Update acknowledgment status
            payment.status = "acknowledged";
            payment.acknowledgedBy = context.user?.id;
            payment.acknowledgedAt = new Date();
            await payment.save();

            return ApiResponseUtils.sendSuccess(
                { payment },
                "Payment acknowledged successfully"
            );
        } catch (error) {
            throw error;
        }
    });
}
