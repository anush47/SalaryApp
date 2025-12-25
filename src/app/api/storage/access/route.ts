import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { StorageService } from "@/app/lib/services/storageService";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Purchase from "@/app/models/Purchase";

export async function GET(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const key = req.nextUrl.searchParams.get("key");
            if (!key) {
                return ApiResponseUtils.sendBadRequest("File key is required");
            }

            const user = context.user;
            if (!user) {
                return ApiResponseUtils.sendForbidden("User context not found.");
            }

            // Key format: companies/{companyId}/{folder}/{entityId}/{filename}
            const parts = key.split('/');
            if (parts.length < 5 || parts[0] !== 'companies') {
                // Invalid or legacy path? Block for safety.
                return ApiResponseUtils.sendBadRequest("Invalid file path format.");
            }

            const companyId = parts[1];
            const folder = parts[2]; // 'employees', 'leaves', 'purchases'
            const entityId = parts[3];

            // 1. ADMIN: Access All
            if (user.role === 'admin') {
                const downloadUrl = await StorageService.getPresignedDownloadUrl(key);
                return ApiResponseUtils.sendSuccess({ downloadUrl });
            }

            // 2. EMPLOYER: Access All within their OWN Company
            if (user.role === 'employer') {
                const company = await Company.findOne({ _id: companyId, user: user.id });
                if (!company) {
                    return ApiResponseUtils.sendForbidden("You do not have access to this file.");
                }
                const downloadUrl = await StorageService.getPresignedDownloadUrl(key);
                return ApiResponseUtils.sendSuccess({ downloadUrl });
            }

            // 3. EMPLOYEE / MANAGER Access Logic
            if (user.role === 'employee') {
                const currentEmployee = await Employee.findOne({ user: user.id });
                if (!currentEmployee) {
                    return ApiResponseUtils.sendForbidden("Employee profile not found.");
                }

                // Must belong to the same company
                if (currentEmployee.company.toString() !== companyId) {
                    return ApiResponseUtils.sendForbidden("You do not have access to this company's files.");
                }

                // CASE A: Own Documents (Profile, Contracts, Leaves)
                // Path: companies/{cid}/employees/{myEmployeeId}/... OR companies/{cid}/leaves/{myEmployeeId}/...
                if ((folder === 'employees' || folder === 'leaves') && entityId === (currentEmployee._id as any).toString()) {
                    const downloadUrl = await StorageService.getPresignedDownloadUrl(key);
                    return ApiResponseUtils.sendSuccess({ downloadUrl });
                }

                // CASE B: Own Leave Requests
                // Path: companies/{cid}/leaves/{leaveRequestId}/...
                // We rely on the frontend passing the correct key, but we should verify ownership?
                // For stricter security, we'd look up the LeaveRequest by ID (entityId) and check if employee matches.
                // However, 'Manager' logic needs this too.

                if (folder === 'leaves') {
                    // We need to fetch the leave request to know who owns it
                    // This requires importing LeaveRequest model, which might be in a different file or we use mongoose directly if model is registered.
                    // Assuming we can import it or dynamically query.
                    // For now, let's assume we can query 'LeaveRequest' collection via mongoose model if available, 
                    // or implies we need to import it. Let's try to import it.
                    // (Note: We haven't seen LeaveRequest model file but we know it exists).
                    try {
                        // Dynamic import to avoid circular dependency issues if any, or just import at top if confirmed.
                        // Let's rely on standard import.
                        const LeaveRequest = (await import("@/app/models/LeaveRequest")).default;
                        const leaveReq = await LeaveRequest.findById(entityId);

                        if (!leaveReq) {
                            return ApiResponseUtils.sendNotFound("Leave request not found.");
                        }

                        // If I am the owner of the leave request -> ALLOW
                        if (leaveReq.employee.toString() === (currentEmployee._id as any).toString()) {
                            const downloadUrl = await StorageService.getPresignedDownloadUrl(key);
                            return ApiResponseUtils.sendSuccess({ downloadUrl });
                        }

                        // If I am the APPROVER/MANAGER of the employee -> ALLOW
                        // Check if currentEmployee is the manager of the leave requester
                        const requester = await Employee.findById(leaveReq.employee);

                        // If requester has a manager, and that manager is ME
                        if (requester && requester.manager && requester.manager.toString() === (currentEmployee._id as any).toString()) {
                            const downloadUrl = await StorageService.getPresignedDownloadUrl(key);
                            return ApiResponseUtils.sendSuccess({ downloadUrl });
                        }
                    } catch (e) {
                        console.error("Error verifying leave request ownership", e);
                    }
                }

                // CASE C: Manager Viewing Subordinate Personal Docs? -> DENIED (Strict rule)
                // Even if I am manager, if folder is 'employees' and entityId != me, I cannot see it.
            }

            return ApiResponseUtils.sendForbidden("Access denied. You do not have permission to view this file.");

        } catch (error: any) {
            return ApiResponseUtils.sendInternalError(error.message || "Failed to generate download URL");
        }
    });
}
