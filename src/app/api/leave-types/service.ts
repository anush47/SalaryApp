import LeaveType from "@/app/models/LeaveType";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import {
    leaveTypeCreateSchema,
    leaveTypeUpdateSchema,
} from "@/app/lib/schemas";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { NextRequest, NextResponse } from "next/server";

export class LeaveTypeService {
    static async getLeaveTypes(req: NextRequest, session: any) {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId");
        const includeInactive = searchParams.get("includeInactive") === "true";

        if (!companyId) {
            return ApiResponseUtils.sendBadRequest("companyId is required");
        }

        // Verify access to company
        const company = await Company.findById(companyId);
        if (!company) {
            return ApiResponseUtils.sendNotFound("Company not found");
        }

        // Check access (admin, employer, or employee of this company)
        if (session.user.role !== "admin") {
            if (session.user.role === "employer") {
                if (company.user.toString() !== session.user.id) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }
            } else if (session.user.role === "employee") {
                // Verify employee belongs to this company
                const employee = await Employee.findOne({
                    user: session.user.id,
                    company: companyId,
                });
                if (!employee) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }
            }
        }

        // Build query
        const query: any = { company: companyId };
        if (!includeInactive) {
            query.isActive = true;
        }

        // Get pagination params
        const { page, limit, skip } = getPaginationParams(req);

        const leaveTypes = await LeaveType.find(query)
            .sort({ code: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await getTotalCount(LeaveType, query);

        return NextResponse.json(ApiResponseUtils.paginated(leaveTypes, page, limit, total));
    }

    static async createLeaveType(req: NextRequest, session: any) {
        // Only employer or admin can create leave types
        if (session.user.role === "employee") {
            return ApiResponseUtils.sendForbidden("Forbidden");
        }

        const body = await req.json();
        const validation = leaveTypeCreateSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponseUtils.sendBadRequest(
                "Validation failed",
                validation.error.errors
            );
        }

        const data = validation.data;

        // Verify company exists and user has access
        const company = await Company.findById(data.companyId);
        if (!company) {
            return ApiResponseUtils.sendNotFound("Company not found");
        }

        if (
            session.user.role !== "admin" &&
            company.user.toString() !== session.user.id
        ) {
            return ApiResponseUtils.sendForbidden("Forbidden");
        }

        // Check for duplicate code in this company
        const existingLeaveType = await LeaveType.findOne({
            company: data.companyId,
            code: data.code.toUpperCase(),
        });

        if (existingLeaveType) {
            return ApiResponseUtils.sendBadRequest(
                "Leave type with this code already exists"
            );
        }

        // Create leave type
        const leaveType = new LeaveType({
            ...data,
            company: data.companyId,
            code: data.code.toUpperCase(),
            isActive: true,
        });

        await leaveType.save();

        // Add this leave type to all active employees in the company (if paid)
        if (leaveType.isPaid) {
            const now = new Date();

            await Employee.updateMany(
                {
                    company: data.companyId,
                    active: true,
                    "overrides.leaveTypes": false, // Only update employees without custom leave config
                },
                {
                    $push: {
                        leaveTypes: {
                            leaveType: leaveType._id,
                            maxDaysPerPeriod: leaveType.maxDaysPerPeriod,
                            balance: leaveType.maxDaysPerPeriod,
                            carryForward: leaveType.carryForward,
                            currentPeriodStart: now,
                            lastAccrualDate: now,
                            carriedForwardBalance: 0,
                        },
                    },
                }
            );
        }

        return ApiResponseUtils.sendSuccess(
            leaveType,
            "Leave type created successfully",
            undefined,
            201
        );
    }

    static async updateLeaveType(req: NextRequest, session: any) {
        if (session.user.role === "employee") {
            return ApiResponseUtils.sendForbidden("Forbidden");
        }

        const body = await req.json();
        const validation = leaveTypeUpdateSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponseUtils.sendBadRequest(
                "Validation failed",
                validation.error.errors
            );
        }

        const data = validation.data;

        // Find leave type
        const leaveType = await LeaveType.findById(data.leaveTypeId);
        if (!leaveType) {
            return ApiResponseUtils.sendNotFound("Leave type not found");
        }

        // Verify access
        const company = await Company.findById(leaveType.company);
        if (!company) {
            return ApiResponseUtils.sendNotFound("Company not found");
        }
        if (
            session.user.role !== "admin" &&
            company.user.toString() !== session.user.id
        ) {
            return ApiResponseUtils.sendForbidden("Forbidden");
        }

        // Update fields
        Object.assign(leaveType, data);

        // Validate custom period
        if (
            leaveType.accrualPeriod === "custom" &&
            (!leaveType.customPeriodDays || leaveType.customPeriodDays <= 0)
        ) {
            return ApiResponseUtils.sendBadRequest(
                "customPeriodDays is required and must be > 0 for custom accrual period"
            );
        }

        await leaveType.save();

        return ApiResponseUtils.sendSuccess(
            leaveType,
            "Leave type updated successfully"
        );
    }

    static async deleteLeaveType(req: NextRequest, session: any) {
        if (session.user.role === "employee") {
            return ApiResponseUtils.sendForbidden("Forbidden");
        }

        const { searchParams } = new URL(req.url);
        const leaveTypeId = searchParams.get("leaveTypeId");

        if (!leaveTypeId) {
            return ApiResponseUtils.sendBadRequest("leaveTypeId is required");
        }

        const leaveType = await LeaveType.findById(leaveTypeId);
        if (!leaveType) {
            return ApiResponseUtils.sendNotFound("Leave type not found");
        }

        // Verify access
        const company = await Company.findById(leaveType.company);
        if (!company) {
            return ApiResponseUtils.sendNotFound("Company not found");
        }
        if (
            session.user.role !== "admin" &&
            company.user.toString() !== session.user.id
        ) {
            return ApiResponseUtils.sendForbidden("Forbidden");
        }

        // Instead of deleting, deactivate it
        leaveType.isActive = false;
        await leaveType.save();

        return ApiResponseUtils.sendSuccess(
            null,
            "Leave type deactivated successfully"
        );
    }
}
