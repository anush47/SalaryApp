import dbConnect from "@/app/lib/db";
import EpfPayment from "@/app/models/EpfPayment";
import Company from "@/app/models/Company";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { z } from "zod";

// Validation schemas
export const epfPaymentCreateSchema = z.object({
    companyId: z.string().min(1, "Company ID is required"),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format"),
    employerContribution: z.number().nonnegative("Employer contribution must be non-negative"),
    employeeContribution: z.number().nonnegative("Employee contribution must be non-negative"),
    totalAmount: z.number().positive("Total amount must be positive"),
    referenceNo: z.string().optional(),
    paymentDate: z.string().or(z.date()).optional(),
    paymentMethod: z.string().optional(),
    surcharges: z.number().nonnegative().optional(),
    receiptFile: z.string().optional(),
    receiptFilename: z.string().optional(),
    remark: z.string().optional(),
});

export const epfPaymentUpdateSchema = z.object({
    id: z.string().min(1, "Payment ID is required"),
    employerContribution: z.number().nonnegative().optional(),
    employeeContribution: z.number().nonnegative().optional(),
    totalAmount: z.number().positive().optional(),
    referenceNo: z.string().optional(),
    paymentDate: z.string().or(z.date()).optional(),
    paymentMethod: z.string().optional(),
    surcharges: z.number().nonnegative().optional(),
    receiptFile: z.string().optional(),
    receiptFilename: z.string().optional(),
    remark: z.string().optional(),
});

export class EpfPaymentService {
    static async createPayment(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = epfPaymentCreateSchema.parse(body);

        // Verify company access
        const filter: { user?: string; _id: any } = {
            user: context.user?.id,
            _id: parsedBody.companyId,
        };
        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        // Check if payment already exists for this period
        const existing = await EpfPayment.findOne({
            company: parsedBody.companyId,
            period: parsedBody.period,
        });

        if (existing) {
            throw new BadRequestError(
                `EPF payment already exists for period ${parsedBody.period}`
            );
        }

        // Create payment
        const payment = await EpfPayment.create({
            company: parsedBody.companyId,
            period: parsedBody.period,
            employerContribution: parsedBody.employerContribution,
            employeeContribution: parsedBody.employeeContribution,
            totalAmount: parsedBody.totalAmount,
            referenceNo: parsedBody.referenceNo,
            paymentDate: parsedBody.paymentDate ? new Date(parsedBody.paymentDate) : undefined,
            paymentMethod: parsedBody.paymentMethod,
            surcharges: parsedBody.surcharges || 0,
            receiptFile: parsedBody.receiptFile,
            receiptFilename: parsedBody.receiptFilename,
            createdBy: context.user?.id,
            remark: parsedBody.remark,
        });

        return {
            message: "EPF payment created successfully",
            payment,
        };
    }

    static async updatePayment(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = epfPaymentUpdateSchema.parse(body);

        const payment = await EpfPayment.findById(parsedBody.id);
        if (!payment) {
            throw new NotFoundError("EPF payment not found");
        }

        // Verify company access
        const filter: { user?: string; _id: any } = {
            user: context.user?.id,
            _id: payment.company,
        };
        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        // Update fields
        if (parsedBody.employerContribution !== undefined)
            payment.employerContribution = parsedBody.employerContribution;
        if (parsedBody.employeeContribution !== undefined)
            payment.employeeContribution = parsedBody.employeeContribution;
        if (parsedBody.totalAmount !== undefined) payment.totalAmount = parsedBody.totalAmount;
        if (parsedBody.referenceNo !== undefined) payment.referenceNo = parsedBody.referenceNo;
        if (parsedBody.paymentDate !== undefined)
            payment.paymentDate = new Date(parsedBody.paymentDate);
        if (parsedBody.paymentMethod !== undefined)
            payment.paymentMethod = parsedBody.paymentMethod;
        if (parsedBody.surcharges !== undefined) payment.surcharges = parsedBody.surcharges;
        if (parsedBody.receiptFile !== undefined) payment.receiptFile = parsedBody.receiptFile;
        if (parsedBody.receiptFilename !== undefined)
            payment.receiptFilename = parsedBody.receiptFilename;
        if (parsedBody.remark !== undefined) payment.remark = parsedBody.remark;

        await payment.save();

        return {
            message: "EPF payment updated successfully",
            payment,
        };
    }

    static async deletePayment(paymentId: string, context: RequestContext) {
        await dbConnect();

        const payment = await EpfPayment.findById(paymentId);
        if (!payment) {
            throw new NotFoundError("EPF payment not found");
        }

        // Verify company access
        const filter: { user?: string; _id: any } = {
            user: context.user?.id,
            _id: payment.company,
        };
        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        await EpfPayment.findByIdAndDelete(paymentId);

        return { message: "EPF payment deleted successfully" };
    }

    static async getPayments(req: any, context: RequestContext) {
        await dbConnect();

        const companyId = req.nextUrl.searchParams.get("companyId");
        const period = req.nextUrl.searchParams.get("period");

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        // Verify company access
        const filter: { user?: string; _id: any } = {
            user: context.user?.id,
            _id: companyId,
        };
        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        const query: any = { company: companyId };
        if (period) query.period = period;

        const payments = await EpfPayment.find(query)
            .populate("createdBy", "name email")
            .sort({ period: -1 })
            .lean();

        return { payments };
    }
}
