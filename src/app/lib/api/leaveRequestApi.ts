import { apiFetch, fetchPaginatedData } from "./commonApi";

export interface LeaveRequest {
    _id: string;
    employee: {
        _id: string;
        name: string;
        memberNo: number;
        designation: string;
    };
    leaveType: {
        _id: string;
        name: string;
        code: string;
        color: string;
        isShortLeave?: boolean;
    };
    startDate: string;
    endDate: string;
    totalDays: number;
    totalMinutes?: number;
    halfDay: boolean;
    halfDayPeriod?: "first_half" | "final_half";
    reason: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    approver?: {
        _id: string;
        name: string;
        memberNo: number;
    };
    approvedBy?: {
        _id: string;
        name: string;
        memberNo: number;
    };
    approvedAt?: string;
    remarks?: string;
    documents?: string[];
    rejectionReason?: string;
    cancelReason?: string;
    createdAt: string;
}

export async function fetchLeaveRequests(
    companyId: string,
    filters: {
        status?: string;
        employeeId?: string;
        startDate?: string;
        endDate?: string;
        myRequests?: boolean;
        pendingApprovals?: boolean;
        page?: number;
        limit?: number;
        search?: string;
    } = {}
): Promise<{ data: LeaveRequest[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    queryParams.append("companyId", companyId);

    if (filters.status) queryParams.append("status", filters.status);
    if (filters.employeeId) queryParams.append("employeeId", filters.employeeId);
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.myRequests) queryParams.append("myRequests", "true");
    if (filters.pendingApprovals) queryParams.append("pendingApprovals", "true");
    if (filters.search) queryParams.append("search", filters.search);

    const url = `/api/leave-requests?${queryParams.toString()}`;
    return fetchPaginatedData<LeaveRequest>(url, filters.page || 1, filters.limit || 20);
}

export async function createLeaveRequest(data: any): Promise<LeaveRequest> {
    return apiFetch<LeaveRequest>("/api/leave-requests", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateLeaveRequest(data: {
    leaveRequestId: string;
    action: "approve" | "reject" | "cancel";
    remarks?: string;
    documents?: string[];
}): Promise<LeaveRequest> {
    return apiFetch<LeaveRequest>("/api/leave-requests", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function fetchLeaveRequestById(id: string): Promise<LeaveRequest> {
    return apiFetch<LeaveRequest>(`/api/leave-requests/${id}`);
}
