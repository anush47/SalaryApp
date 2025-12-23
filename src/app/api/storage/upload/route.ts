import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { StorageService } from "@/app/lib/services/storageService";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { z } from "zod";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";

// Validation schema for upload request
const uploadSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    folder: z.string().min(1), // e.g., "employees", "purchases", "leaves"
    entityId: z.string().min(1), // e.g., employeeId, purchaseId, leaveRequestId
    companyId: z.string().min(1),
});

export async function POST(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const body = await req.json();
            const { filename, contentType, folder, entityId, companyId } = uploadSchema.parse(body);
            const user = context.user;
            if (!user) {
                return ApiResponseUtils.sendForbidden("User context not found.");
            }

            // 1. Authorization: Validate if user is allowed to upload to this path
            if (user.role === 'employer') {
                // Employer can only upload to their own company's folders
                const company = await Company.findOne({ _id: companyId, user: user.id });
                if (!company) {
                    return ApiResponseUtils.sendForbidden("You do not have access to this company.");
                }
            } else if (user.role === 'employee') {
                // Employee can only upload to their own profile or leave requests
                // TODO: Strict check if 'entityId' really belongs to them.
                // For now, we rely on the fact that they are authenticated and we construct the path carefully.

                // Find the employee record linked to this user
                const employeeRecord = await Employee.findOne({ user: user.id });
                if (!employeeRecord) {
                    return ApiResponseUtils.sendForbidden("Employee profile not found.");
                }

                // Integrity check: Employee can't upload to another company
                if (employeeRecord.company.toString() !== companyId) {
                    return ApiResponseUtils.sendForbidden("You cannot upload to this company.");
                }

                // Strict folder check for employees
                if (!['employees', 'leaves'].includes(folder)) {
                    return ApiResponseUtils.sendForbidden("Employees can only upload to 'employees' or 'leaves' folders.");
                }

                // If uploading to 'employees' folder (profile docs), entityId MUST match their own employeeId
                if (folder === 'employees' && entityId !== employeeRecord._id.toString()) {
                    return ApiResponseUtils.sendForbidden("You can only upload documents to your own profile.");
                }
            } else if (user.role !== 'admin') {
                return ApiResponseUtils.sendForbidden("Access denied.");
            }

            // 2. Construct Secure Key
            // Pattern: companies/{companyId}/{folder}/{entityId}/{timestamp}-{filename}
            // This structure ensures isolation by company and entity.
            const timestamp = Date.now();
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `companies/${companyId}/${folder}/${entityId}/${timestamp}-${sanitizedFilename}`;

            // 3. Generate Presigned URL
            const uploadUrl = await StorageService.getPresignedUploadUrl(key, contentType);

            return ApiResponseUtils.sendSuccess({
                uploadUrl,
                key,
                message: "Upload URL generated successfully"
            });

        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return ApiResponseUtils.sendBadRequest(error.errors[0].message);
            }
            return ApiResponseUtils.sendInternalError(error.message || "Failed to generate upload URL");
        }
    });
}
