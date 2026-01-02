import dbConnect from "@/app/lib/db";
import SalaryAdvance from "@/app/models/SalaryAdvance";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import Salary from "@/app/models/Salary";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { z } from "zod";
import SalaryPayment from "@/app/models/SalaryPayment";

// Validation schemas
export const salaryAdvanceCreateSchema = z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    amount: z.number().positive("Amount must be positive"),
    advanceDate: z.string().or(z.date()),
    reason: z.string().optional(),
    deductionStartPeriod: z.string().min(1, "Deduction start period is required"),
    deductionMonths: z.number().int().positive("Deduction months must be positive"),
    note: z.string().optional(),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque"]).default("cash"),
    referenceNo: z.string().optional(),
});

export const salaryAdvanceUpdateSchema = z.object({
    id: z.string().min(1, "Advance ID is required"),
    amount: z.number().positive().optional(),
    advanceDate: z.string().or(z.date()).optional(),
    reason: z.string().optional(),
    deductionStartPeriod: z.string().optional(),
    deductionMonths: z.number().int().positive().optional(),
    note: z.string().optional(),
    status: z.enum(["active", "fully_deducted", "written_off"]).optional(),
});

export class SalaryAdvanceService {
    static async createAdvance(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = salaryAdvanceCreateSchema.parse(body);

        // Fetch employee
        const employee = await Employee.findById(parsedBody.employeeId);
        if (!employee) {
            throw new NotFoundError("Employee not found");
        }

        // Verify company access
        const filter: { user?: string; _id: any } = {
            user: context.user?.id,
            _id: employee.company,
        };
        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        // Calculate monthly deduction
        const monthlyDeduction = parsedBody.amount / parsedBody.deductionMonths;

        // Create advance record
        const advance = await SalaryAdvance.create({
            employee: parsedBody.employeeId,
            company: employee.company,
            amount: parsedBody.amount,
            advanceDate: new Date(parsedBody.advanceDate),
            reason: parsedBody.reason,
            paymentMethod: parsedBody.paymentMethod,
            referenceNo: parsedBody.referenceNo,
            deductionStartPeriod: parsedBody.deductionStartPeriod,
            deductionMonths: parsedBody.deductionMonths,
            monthlyDeduction,
            totalDeducted: 0,
            remainingBalance: parsedBody.amount,
            status: "active",
            relatedPayments: [],
            createdBy: context.user?.id,
            note: parsedBody.note,
        });

        // Create a corresponding Payment record
        await SalaryPayment.create({
            employee: parsedBody.employeeId,
            company: employee.company,
            period: parsedBody.deductionStartPeriod, // Or advanceDate month? User wants to see it as payment. Use advanceDate month usually.
            // But salaryPayment requires period string. Let's use deductionStartPeriod or format advanceDate.
            // Best to use deductionStartPeriod to show when it starts affecting? 
            // OR the month of payment. Usually advanceDate.
            // Let's use format YYYY-MM from advanceDate
            salaryPeriod: "monthly", // Default
            paymentDate: new Date(parsedBody.advanceDate),
            amount: parsedBody.amount,
            paymentMethod: parsedBody.paymentMethod,
            referenceNo: parsedBody.referenceNo,
            madeBy: context.user?.id,
            status: "acknowledged", // Advances are paid immediately?
            type: "advance",
            advance: advance._id,
        });

        return {
            message: "Advance created successfully",
            advance,
        };
    }

    static async updateAdvance(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = salaryAdvanceUpdateSchema.parse(body);

        const advance = await SalaryAdvance.findById(parsedBody.id);
        if (!advance) {
            throw new NotFoundError("Advance not found");
        }

        // Verify company access
        const filter: { user?: string; _id: any } = {
            user: context.user?.id,
            _id: advance.company,
        };
        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        // Update fields
        if (parsedBody.amount !== undefined) {
            advance.amount = parsedBody.amount;
            // Recalculate monthly deduction
            const deductionMonths = parsedBody.deductionMonths || advance.deductionMonths;
            advance.monthlyDeduction = parsedBody.amount / deductionMonths;
            advance.remainingBalance = parsedBody.amount - advance.totalDeducted;
        }
        if (parsedBody.advanceDate !== undefined)
            advance.advanceDate = new Date(parsedBody.advanceDate);
        if (parsedBody.reason !== undefined) advance.reason = parsedBody.reason;
        if (parsedBody.deductionStartPeriod !== undefined)
            advance.deductionStartPeriod = parsedBody.deductionStartPeriod;
        if (parsedBody.deductionMonths !== undefined) {
            advance.deductionMonths = parsedBody.deductionMonths;
            advance.monthlyDeduction = advance.amount / parsedBody.deductionMonths;
        }
        if (parsedBody.note !== undefined) advance.note = parsedBody.note;
        if (parsedBody.status !== undefined) advance.status = parsedBody.status;

        await advance.save();

        return {
            message: "Advance updated successfully",
            advance,
        };
    }

    static async deleteAdvances(advanceIds: string[], context: RequestContext) {
        await dbConnect();

        if (!Array.isArray(advanceIds) || advanceIds.length === 0) {
            throw new BadRequestError("Advance IDs array is required");
        }

        const advances = await SalaryAdvance.find({ _id: { $in: advanceIds } });
        if (advances.length === 0) {
            throw new NotFoundError("No advances found");
        }

        // Verify company access
        const companyIds = [...new Set(advances.map(a => a.company.toString()))];

        for (const companyId of companyIds) {
            const filter: { user?: string; _id: any } = {
                user: context.user?.id,
                _id: companyId,
            };
            if (context.user?.role === "admin") {
                delete filter.user;
            }

            const company = await Company.findOne(filter);
            if (!company) {
                throw new ForbiddenError(`Access denied to company ${companyId}`);
            }
        }

        // Check if any advance has been partially deducted
        const usedAdvances = advances.filter(a => a.totalDeducted > 0);
        if (usedAdvances.length > 0) {
            throw new BadRequestError(
                `Cannot delete ${usedAdvances.length} advance(s) that have already been partially deducted. Consider marking them as written off.`
            );
        }

        await SalaryAdvance.deleteMany({ _id: { $in: advanceIds } });

        // Also delete related payments
        await SalaryPayment.deleteMany({ advance: { $in: advanceIds }, type: "advance" });

        return { message: `${advances.length} Advance(s) deleted successfully` };
    }

    static async deleteAdvance(advanceId: string, context: RequestContext) {
        return this.deleteAdvances([advanceId], context);
    }

    static async getAdvances(req: any, context: RequestContext) {
        await dbConnect();

        const employeeId = req.nextUrl.searchParams.get("employeeId");
        const companyId = req.nextUrl.searchParams.get("companyId");
        const status = req.nextUrl.searchParams.get("status");

        const query: any = {};

        if (employeeId) query.employee = employeeId;
        if (status) query.status = status;

        // For employees, only show their own advances
        if (context.user?.role === "employee") {
            const employee = await Employee.findOne({ user: context.user?.id });
            if (!employee) {
                throw new ForbiddenError("Employee record not found");
            }
            query.employee = employee._id;
        } else if (companyId) {
            // Verify company access for employers
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
            query.company = companyId;
        }

        const advances = await SalaryAdvance.find(query)
            .populate("employee", "name memberNo nic")
            .populate("createdBy", "name email")
            .sort({ advanceDate: -1 })
            .lean();

        return { advances };
    }

    static async getActiveAdvances(employeeId: string, context: RequestContext) {
        await dbConnect();

        // Verify access
        if (context.user?.role === "employee") {
            const employee = await Employee.findOne({ user: context.user?.id });
            if (!employee || String(employee._id) !== employeeId) {
                throw new ForbiddenError("Access denied");
            }
        }

        const advances = await SalaryAdvance.find({
            employee: employeeId,
            status: "active",
            remainingBalance: { $gt: 0 },
        }).lean();

        return { advances };
    }

    static async deductFromSalary(
        salaryId: string,
        advanceId: string,
        amount: number,
        context: RequestContext
    ) {
        await dbConnect();

        const advance = await SalaryAdvance.findById(advanceId);
        if (!advance) {
            throw new NotFoundError("Advance not found");
        }

        if (amount > advance.remainingBalance) {
            throw new BadRequestError("Deduction amount exceeds remaining balance");
        }

        // Update advance
        advance.totalDeducted += amount;
        advance.remainingBalance -= amount;
        advance.relatedPayments.push(salaryId as any);

        if (advance.remainingBalance <= 0) {
            advance.status = "fully_deducted";
        }

        await advance.save();

        return advance;
    }
}
