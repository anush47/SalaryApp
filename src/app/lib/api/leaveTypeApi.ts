import { apiFetch, fetchPaginatedData } from "./commonApi";

export interface LeaveType {
    _id: string;
    name: string;
    code: string;
    company: string;
    accrualPeriod: "yearly" | "monthly" | "weekly" | "quarterly" | "half-yearly" | "custom";
    maxDaysPerPeriod: number;
    customPeriodDays?: number;
    accrualMethod: "upfront" | "monthly-accrual" | "pro-rata";
    resetDay?: number;
    carryForward: boolean;
    maxCarryForwardDays?: number;
    maxConsecutiveDays?: number;
    requiresApproval: boolean;
    requiresDocument: boolean;
    isPaid: boolean;
    applicableFor: ("permanent" | "contract" | "intern" | "temporary")[];
    gender: "male" | "female" | "all";
    color: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export async function fetchLeaveTypes(companyId: string, includeInactive: boolean = false): Promise<LeaveType[]> {
    const url = `/api/leave-types?companyId=${companyId}&includeInactive=${includeInactive}`;
    const result = await fetchPaginatedData<LeaveType>(url, 1, 100); // Fetch all (up to 100) for now as UI doesn't support server-side pagination yet
    return result.data;
}

export async function createLeaveType(data: any): Promise<LeaveType> {
    return apiFetch<LeaveType>("/api/leave-types", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateLeaveType(data: any): Promise<LeaveType> {
    return apiFetch<LeaveType>("/api/leave-types", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteLeaveType(leaveTypeId: string): Promise<void> {
    return apiFetch<void>(`/api/leave-types?leaveTypeId=${leaveTypeId}`, {
        method: "DELETE",
    });
}
