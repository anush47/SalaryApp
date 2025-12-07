import LeaveRequest from "@/app/models/LeaveRequest";
import LeaveType from "@/app/models/LeaveType";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import Department from "@/app/models/Department";
import { EmployeeService } from "../employees/service";
import { isInManagementChain } from "@/app/lib/employeeHierarchy";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";
import {
    leaveRequestCreateSchema,
    leaveRequestUpdateSchema,
} from "@/app/lib/schemas";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { NextRequest, NextResponse } from "next/server";

export class LeaveRequestService {
    static async getLeaveRequests(req: NextRequest, session: any) {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId");
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const myRequests = searchParams.get("myRequests") === "true";
        const pendingApprovals = searchParams.get("pendingApprovals") === "true";

        if (!companyId) {
            return ApiResponseUtils.sendBadRequest("companyId is required");
        }

        // Verify access to company
        const company = await Company.findById(companyId);
        if (!company) {
            return ApiResponseUtils.sendNotFound("Company not found");
        }

        // Check access
        if (session.user.role !== "admin") {
            if (session.user.role === "employer") {
                if (company.user.toString() !== session.user.id) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }
            } else if (session.user.role === "employee") {
                // Employees can only see their own requests or requests they need to approve
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
        const query: any = {
            company: companyId, // Always filter by company
        };

        // If myRequests, show employee's own requests
        if (myRequests && session.user.role === "employee") {
            const employee = await Employee.findOne({
                user: session.user.id,
                company: companyId,
            });
            if (employee) {
                query.employee = employee._id;
            }
        }

        // If pendingApprovals, show requests assigned to this employee as approver
        if (pendingApprovals && session.user.role === "employee") {
            const employee = await Employee.findOne({
                user: session.user.id,
                company: companyId,
            });
            if (employee) {
                query.approver = employee._id;
                query.status = "pending";
            }
        }

        // For employer/admin, filter by employeeId if provided
        if (
            employeeId &&
            (session.user.role === "employer" || session.user.role === "admin")
        ) {
            query.employee = employeeId;
        }

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.$or = [];
            if (startDate) {
                query.$or.push({ startDate: { $gte: new Date(startDate) } });
            }
            if (endDate) {
                query.$or.push({ endDate: { $lte: new Date(endDate) } });
            }
        }

        // Get pagination params
        const { page, limit, skip } = getPaginationParams(req);

        const leaveRequests = await LeaveRequest.find(query)
            .populate("employee", "name memberNo designation")
            .populate("leaveType", "name code color")
            .populate("approver", "name memberNo")
            .populate("approvedBy", "name memberNo")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await getTotalCount(LeaveRequest, query);

        return NextResponse.json(ApiResponseUtils.paginated(leaveRequests, page, limit, total));
    }

    static async createLeaveRequest(req: NextRequest, session: any) {
        const body = await req.json();
        const validation = leaveRequestCreateSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponseUtils.sendBadRequest(
                "Validation failed",
                validation.error.errors
            );
        }

        const data = validation.data;

        // Find employee
        const employee = await Employee.findById(data.employeeId);
        if (!employee) {
            return ApiResponseUtils.sendNotFound("Employee not found");
        }

        // Verify access (employee can only apply for themselves, employer/admin can apply for anyone)
        if (session.user.role === "employee") {
            const employeeUser = await Employee.findOne({
                user: session.user.id,
                company: employee.company,
            });
            if (!employeeUser || employeeUser._id.toString() !== data.employeeId) {
                return ApiResponseUtils.sendForbidden("Forbidden");
            }
        } else if (session.user.role === "employer") {
            const company = await Company.findById(employee.company);
            if (company.user.toString() !== session.user.id) {
                return ApiResponseUtils.sendForbidden("Forbidden");
            }
        }

        // Find leave type
        const leaveType = await LeaveType.findById(data.leaveTypeId);
        if (!leaveType) {
            return ApiResponseUtils.sendNotFound("Leave type not found");
        }

        // Check if leave type is active
        if (!leaveType.isActive) {
            return ApiResponseUtils.sendBadRequest(
                "This leave type is no longer active"
            );
        }

        // Validate dates
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start > end) {
            return ApiResponseUtils.sendBadRequest(
                "Start date must be before end date"
            );
        }

        // Calculate total days
        const diffTime = Math.abs(end.getTime() - start.getTime());
        let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
        if (data.halfDay) {
            totalDays = 0.5;
        }

        // Check if employee has sufficient leave balance (only for paid leaves)
        if (leaveType.isPaid) {
            // Find employee's leave balance for this type
            let employeeLeaveBalance = employee.leaveTypes.find(
                (lt: any) => lt.leaveType.toString() === data.leaveTypeId
            );

            // If not found, try to initialize balances (in case they are missing for this employee)
            if (!employeeLeaveBalance) {
                const { initializeLeaveBalances } = await import("@/app/lib/leaveBalance");
                await initializeLeaveBalances(employee._id);

                // Re-fetch employee to get updated leave types
                const updatedEmployee = await Employee.findById(data.employeeId);
                if (updatedEmployee) {
                    employeeLeaveBalance = updatedEmployee.leaveTypes.find(
                        (lt: any) => lt.leaveType.toString() === data.leaveTypeId
                    );

                    // Also update the local employee object reference for later balance deduction
                    const balanceIndex = updatedEmployee.leaveTypes.findIndex(
                        (lt: any) => lt.leaveType.toString() === data.leaveTypeId
                    );
                    if (balanceIndex !== -1) {
                        // We can't easily replace the whole mongoose document in-memory here for the later deduction logic (lines 282+)
                        // But the deduction logic (lines 282+) re-finds it from 'employee', so we need to ensure 'employee' has it or we re-fetch there too.
                        // Actually, standardizing: line 282 uses 'employee' which is the old const.
                        // Let's rely on the fact that we need to pass the check here first.

                        // Hack: Update the in-memory employee.leaveTypes for the subsequent check in this function
                        employee.leaveTypes = updatedEmployee.leaveTypes;
                    }
                }
            }

            if (!employeeLeaveBalance) {
                return ApiResponseUtils.sendBadRequest(
                    "Leave type not assigned to this employee"
                );
            }

            if (employeeLeaveBalance.balance < totalDays) {
                return ApiResponseUtils.sendBadRequest(
                    `Insufficient leave balance. Available: ${employeeLeaveBalance.balance} days`
                );
            }

            // Check max consecutive days
            if (
                leaveType.maxConsecutiveDays &&
                totalDays > leaveType.maxConsecutiveDays
            ) {
                return ApiResponseUtils.sendBadRequest(
                    `Maximum consecutive days for this leave type is ${leaveType.maxConsecutiveDays}`
                );
            }
        }

        // Check if document is required
        if (
            leaveType.requiresDocument &&
            (!data.documents || data.documents.length === 0)
        ) {
            return ApiResponseUtils.sendBadRequest(
                "Document is required for this leave type"
            );
        }

        // Check for overlapping leave requests
        const overlappingLeaves = await LeaveRequest.find({
            employee: data.employeeId,
            status: { $in: ["pending", "approved"] },
            $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
        });

        if (overlappingLeaves.length > 0) {
            return ApiResponseUtils.sendBadRequest(
                "You have overlapping leave requests for this period"
            );
        }

        // Determine approver (employee's manager)
        let approver = employee.manager;
        if (!approver) {
            // If no manager, check department manager
            if (employee.department) {
                const department = await Department.findById(
                    employee.department
                ).populate("manager");
                if (department && department.manager) {
                    approver = department.manager;
                }
            }
        }

        // Auto-approve only if approval is not required
        const autoApprove = !leaveType.requiresApproval;

        // Create leave request
        const leaveRequest = new LeaveRequest({
            employee: data.employeeId,
            company: employee.company,
            leaveType: data.leaveTypeId,
            startDate: start,
            endDate: end,
            totalDays,
            halfDay: data.halfDay || false,
            halfDayPeriod: data.halfDayPeriod,
            reason: data.reason || "",
            status: autoApprove ? "approved" : "pending",
            approver: approver || null,
            approvedBy: autoApprove ? data.employeeId : null,
            approvedAt: autoApprove ? new Date() : null,
            documents: data.documents || [],
        });

        await leaveRequest.save();

        // If auto-approved and paid leave, deduct balance immediately
        if (autoApprove && leaveType.isPaid) {
            const leaveBalance = employee.leaveTypes.find(
                (lt: any) => lt.leaveType.toString() === data.leaveTypeId
            );
            if (leaveBalance) {
                leaveBalance.balance -= totalDays;
                // Repair legacy data before saving
                await EmployeeService.ensureValidLeaveTypes(employee);
                await employee.save();
            }
        }

        await leaveRequest.populate([
            { path: "employee", select: "name memberNo designation" },
            { path: "leaveType", select: "name code color" },
            { path: "approver", select: "name memberNo" },
        ]);

        return ApiResponseUtils.sendSuccess(
            leaveRequest,
            autoApprove
                ? "Leave request auto-approved successfully"
                : "Leave request submitted successfully",
            undefined,
            201
        );
    }

    static async updateLeaveRequest(req: NextRequest, session: any) {
        const body = await req.json();
        const validation = leaveRequestUpdateSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponseUtils.sendBadRequest(
                "Validation failed",
                validation.error.errors
            );
        }

        const { leaveRequestId, action, remarks } = validation.data;

        // Find leave request
        const leaveRequest = await LeaveRequest.findById(leaveRequestId)
            .populate("employee")
            .populate("leaveType");

        if (!leaveRequest) {
            return ApiResponseUtils.sendNotFound("Leave request not found");
        }

        const employee = await Employee.findById(leaveRequest.employee._id);
        const leaveType = await LeaveType.findById(leaveRequest.leaveType._id);

        // Verify access based on action
        if (action === "approve" || action === "reject") {
            // Only approver, employer, or admin can approve/reject
            if (session.user.role === "employee") {
                const approverEmployee = await Employee.findOne({
                    user: session.user.id,
                });
                if (!approverEmployee) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }

                // Check if this employee is the assigned approver or in management chain
                const isApprover =
                    leaveRequest.approver &&
                    leaveRequest.approver.toString() === approverEmployee._id.toString();
                const inChain = await isInManagementChain(
                    approverEmployee._id.toString(),
                    leaveRequest.employee._id.toString()
                );

                if (!isApprover && !inChain) {
                    return ApiResponseUtils.sendForbidden(
                        "You are not authorized to approve/reject this leave request"
                    );
                }
            } else if (session.user.role === "employer") {
                const company = await Company.findById(employee.company);
                if (company.user.toString() !== session.user.id) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }
            }
        } else if (action === "cancel") {
            // Only the employee themselves or employer/admin can cancel
            if (session.user.role === "employee") {
                const requestingEmployee = await Employee.findOne({
                    user: session.user.id,
                });
                if (
                    !requestingEmployee ||
                    requestingEmployee._id.toString() !==
                    leaveRequest.employee._id.toString()
                ) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }
            } else if (session.user.role === "employer") {
                const company = await Company.findById(employee.company);
                if (company.user.toString() !== session.user.id) {
                    return ApiResponseUtils.sendForbidden("Forbidden");
                }
            }
        }

        switch (action) {
            case "approve":
                if (leaveRequest.status !== "pending") {
                    return ApiResponseUtils.sendBadRequest(
                        "Only pending requests can be approved"
                    );
                }

                leaveRequest.status = "approved";
                const approvingEmployee = await Employee.findOne({
                    user: session.user.id,
                });
                leaveRequest.approvedBy = approvingEmployee?._id;
                leaveRequest.approvedAt = new Date();
                leaveRequest.remarks = remarks || "";

                await leaveRequest.save();

                // Deduct leave balance if paid leave
                if (leaveType.isPaid) {
                    const leaveBalance = employee.leaveTypes.find(
                        (lt: any) =>
                            lt.leaveType.toString() === leaveRequest.leaveType._id.toString()
                    );
                    if (leaveBalance) {
                        leaveBalance.balance -= leaveRequest.totalDays;
                        // Repair legacy data before saving
                        await EmployeeService.ensureValidLeaveTypes(employee);
                        await employee.save();
                    }
                }

                break;

            case "reject":
                if (leaveRequest.status !== "pending") {
                    return ApiResponseUtils.sendBadRequest(
                        "Only pending requests can be rejected"
                    );
                }

                leaveRequest.status = "rejected";
                leaveRequest.approvedBy =
                    session.user.role === "employee"
                        ? (await Employee.findOne({ user: session.user.id }))?._id
                        : leaveRequest.approver;
                leaveRequest.approvedAt = new Date();
                leaveRequest.remarks = remarks || "";

                await leaveRequest.save();
                break;

            case "cancel":
                if (leaveRequest.status === "cancelled") {
                    return ApiResponseUtils.sendBadRequest(
                        "Leave request is already cancelled"
                    );
                }

                // Employee can only cancel pending requests
                if (
                    session.user.role === "employee" &&
                    leaveRequest.status !== "pending"
                ) {
                    return ApiResponseUtils.sendForbidden(
                        "You can only cancel pending leave requests."
                    );
                }

                // If approved leave is being cancelled, restore balance
                if (leaveRequest.status === "approved" && leaveType.isPaid) {
                    const leaveBalance = employee.leaveTypes.find(
                        (lt: any) =>
                            lt.leaveType.toString() === leaveRequest.leaveType._id.toString()
                    );
                    if (leaveBalance) {
                        leaveBalance.balance += leaveRequest.totalDays;
                        // Repair legacy data before saving
                        await EmployeeService.ensureValidLeaveTypes(employee);
                        await employee.save();
                    }
                }

                leaveRequest.status = "cancelled";
                leaveRequest.remarks = remarks || "";
                await leaveRequest.save();
                break;

            default:
                return ApiResponseUtils.sendBadRequest("Invalid action");
        }

        await leaveRequest.populate([
            { path: "employee", select: "name memberNo designation" },
            { path: "leaveType", select: "name code color" },
            { path: "approver", select: "name memberNo" },
            { path: "approvedBy", select: "name memberNo" },
        ]);

        return ApiResponseUtils.sendSuccess(
            leaveRequest,
            `Leave request ${action}ed successfully`
        );
    }
}
