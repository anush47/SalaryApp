import dbConnect from "@/app/lib/db";
import SalaryAdvance from "@/app/models/SalaryAdvance";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import Salary from "@/app/models/Salary";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { z } from "zod";

// Validation schemas
export const salaryAdvanceCreateSchema = z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    amount: z.number().positive("Amount must be positive"),
    advanceDate: z.string().or(z.date()),
    reason: z.string().optional(),
    deductionStartPeriod: z.string().min(1, "Deduction start period is required"),
    deductionMonths: z.number().int().positive("Deduction months must be positive"),
    note: z.string().optional(),
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

    static async deleteAdvance(advanceId: string, context: RequestContext) {
        await dbConnect();

        const advance = await SalaryAdvance.findById(advanceId);
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

        // Check if advance has been partially deducted
        if (advance.totalDeducted > 0) {
            throw new BadRequestError(
                "Cannot delete advance that has already been partially deducted. Consider marking it as written off instead."
            );
        }

        await SalaryAdvance.findByIdAndDelete(advanceId);

        return { message: "Advance deleted successfully" };
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
