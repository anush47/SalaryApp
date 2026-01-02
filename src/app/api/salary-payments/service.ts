import dbConnect from "@/app/lib/db";
import SalaryPayment from "@/app/models/SalaryPayment";
import Salary from "@/app/models/Salary";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { z } from "zod";

// Validation schemas
export const salaryPaymentCreateSchema = z.object({
    salaryId: z.string().min(1, "Salary ID is required"),
    amount: z.number().positive("Amount must be positive"),
    paymentDate: z.string().or(z.date()),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque"]),
    referenceNo: z.string().optional(),
    adminNote: z.string().optional(),
});

export const salaryPaymentUpdateSchema = z.object({
    id: z.string().min(1, "Payment ID is required"),
    amount: z.number().positive().optional(),
    paymentDate: z.string().or(z.date()).optional(),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque"]).optional(),
    referenceNo: z.string().optional(),
    adminNote: z.string().optional(),
});

export const paymentAcknowledgeSchema = z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
    signature: z.string().min(1, "Signature is required"),
    employeeNote: z.string().optional(),
});

export class SalaryPaymentService {
    static async createPayment(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = salaryPaymentCreateSchema.parse(body);

        // Fetch salary
        const salary = await Salary.findById(parsedBody.salaryId);
        if (!salary) {
            throw new NotFoundError("Salary not found");
        }

        // Fetch employee and verify access
        const employee = await Employee.findById(salary.employee);
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

        // Validate payment amount doesn't exceed outstanding balance (unless intentional overpayment)
        if (parsedBody.amount > salary.outstandingBalance + 1000) {
            // Allow small buffer for overpayment
            throw new BadRequestError(
                `Payment amount (${parsedBody.amount}) exceeds outstanding balance (${salary.outstandingBalance})`
            );
        }

        // Create payment record
        const payment = await SalaryPayment.create({
            salary: salary._id,
            employee: salary.employee,
            company: employee.company,
            period: salary.period,
            salaryPeriod: salary.salaryPeriod,
            paymentDate: new Date(parsedBody.paymentDate),
            amount: parsedBody.amount,
            paymentMethod: parsedBody.paymentMethod,
            referenceNo: parsedBody.referenceNo,
            madeBy: context.user?.id,
            adminNote: parsedBody.adminNote,
            status: "pending",
        });

        // Update salary totals
        await this.updateSalaryTotals(salary._id.toString());

        return {
            message: "Payment recorded successfully",
            payment,
        };
    }

    static async updatePayment(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = salaryPaymentUpdateSchema.parse(body);

        // Fetch payment
        const payment = await SalaryPayment.findById(parsedBody.id);
        if (!payment) {
            throw new NotFoundError("Payment not found");
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

        // Update payment
        if (parsedBody.amount !== undefined) payment.amount = parsedBody.amount;
        if (parsedBody.paymentDate !== undefined)
            payment.paymentDate = new Date(parsedBody.paymentDate);
        if (parsedBody.paymentMethod !== undefined)
            payment.paymentMethod = parsedBody.paymentMethod;
        if (parsedBody.referenceNo !== undefined) payment.referenceNo = parsedBody.referenceNo;
        if (parsedBody.adminNote !== undefined) payment.adminNote = parsedBody.adminNote;

        await payment.save();

        // Update salary totals
        if (payment.salary) {
            await this.updateSalaryTotals(payment.salary.toString());
        }

        return {
            message: "Payment updated successfully",
            payment,
        };
    }

    static async deletePayments(paymentIds: string[], context: RequestContext) {
        await dbConnect();

        if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
            throw new BadRequestError("Payment IDs array is required");
        }

        const payments = await SalaryPayment.find({ _id: { $in: paymentIds } });
        if (payments.length === 0) {
            throw new NotFoundError("No payments found");
        }

        // Verify company access
        const companyIds = [...new Set(payments.map(p => p.company.toString()))];
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

        // Get salary IDs to update totals later
        const salaryIds = [...new Set(payments.filter(p => p.salary).map(p => p.salary.toString()))];

        await SalaryPayment.deleteMany({ _id: { $in: paymentIds } });

        // Update salary totals for all affected salaries
        await Promise.all(salaryIds.map(id => this.updateSalaryTotals(id)));

        return { message: `${payments.length} Payment(s) deleted successfully` };
    }

    static async deletePayment(paymentId: string, context: RequestContext) {
        return this.deletePayments([paymentId], context);
    }

    static async acknowledgePayment(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = paymentAcknowledgeSchema.parse(body);

        const payment = await SalaryPayment.findById(parsedBody.paymentId);
        if (!payment) {
            throw new NotFoundError("Payment not found");
        }

        // Verify employee access - only the employee themselves can acknowledge
        if (context.user?.role === "employee") {
            const employee = await Employee.findOne({ user: context.user?.id });
            if (!employee || String(employee._id) !== String(payment.employee)) {
                throw new ForbiddenError("You can only acknowledge your own payments");
            }
        } else {
            throw new ForbiddenError("Only employees can acknowledge payments");
        }

        // Update acknowledgment
        payment.acknowledgedBy = payment.employee;
        payment.acknowledgedAt = new Date();
        payment.signature = parsedBody.signature;
        payment.employeeNote = parsedBody.employeeNote;
        payment.status = "acknowledged";

        await payment.save();

        return {
            message: "Payment acknowledged successfully",
            payment,
        };
    }

    static async getPayments(req: any, context: RequestContext) {
        await dbConnect();

        const salaryId = req.nextUrl.searchParams.get("salaryId");
        const employeeId = req.nextUrl.searchParams.get("employeeId");
        const companyId = req.nextUrl.searchParams.get("companyId");
        const period = req.nextUrl.searchParams.get("period");
        const status = req.nextUrl.searchParams.get("status");

        const query: any = {};

        if (salaryId) query.salary = salaryId;
        if (employeeId) query.employee = employeeId;
        if (period) query.period = period;
        if (status) query.status = status;

        // For employees, only show their own payments
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

        const payments = await SalaryPayment.find(query)
            .populate("employee", "name memberNo nic")
            .populate("madeBy", "name email")
            .sort({ paymentDate: -1 })
            .lean();

        return { payments };
    }

    // Helper method to update salary totals
    private static async updateSalaryTotals(salaryId: string) {
        const payments = await SalaryPayment.find({
            salary: salaryId,
            status: { $in: ["acknowledged", "pending"] },
        });

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        const salary = await Salary.findById(salaryId);
        if (salary) {
            salary.totalPaid = totalPaid;

            // Calculate outstanding balance
            // finalSalary is Pre-Advance. So we subtract Advances and Paid.
            const advancesDeducted = salary.activeAdvances?.reduce(
                (sum, adv) => sum + adv.deductedAmount,
                0
            ) || 0;

            salary.outstandingBalance = salary.finalSalary - totalPaid - advancesDeducted;

            // Update payment status
            if (salary.outstandingBalance <= 0) {
                salary.paymentStatus = salary.outstandingBalance < 0 ? "overpaid" : "fully_paid";
            } else if (totalPaid > 0) {
                salary.paymentStatus = "partially_paid";
            } else {
                salary.paymentStatus = "unpaid";
            }

            await salary.save();
        }
    }
}
