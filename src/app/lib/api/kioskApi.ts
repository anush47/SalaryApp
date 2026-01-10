/**
 * Kiosk API Client
 * Frontend service for kiosk operations
 */

const API_BASE = "/api/kiosk";

export interface CompanyInfo {
    companyId: string;
    companyName: string;
    timezone: string;
    attendanceConfig: {
        enabled: boolean;
        pwaCheckIn: boolean;
        hardwareIntegration: boolean;
        salaryIntegration: boolean;
        allowRemoteCheckIn: boolean;
        requireApproval: boolean;
        livenessDetection?: boolean;
    };
    geoFencing: any;
}

export interface Employee {
    _id: string;
    name: string;
    memberNo: number;
    hasFaceData: boolean;
}

export interface FaceData {
    descriptors: number[][];
    image?: string;
    images?: string[];
}

export interface AttendanceResult {
    success: boolean;
    matched: boolean;
    employeeId: string;
    employeeName: string;
    memberNo: number;
    type: "in" | "out";
    timestamp: string;
    verified: boolean;
    confidence: number;
    shiftName?: string;
    attendanceTypeReason?: string;
}

/**
 * Validate API key and get company information
 */
export async function validateApiKey(apiKey: string): Promise<CompanyInfo> {
    const response = await fetch(`${API_BASE}/validate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(getErrorMessage(data, "Failed to validate API key"));
    }

    return data.data;
}

/**
 * Get list of employees for registration
 */
export async function getEmployees(apiKey: string): Promise<Employee[]> {
    const response = await fetch(`${API_BASE}/employees?apiKey=${encodeURIComponent(apiKey)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(getErrorMessage(data, "Failed to fetch employees"));
    }

    return data.data.employees;
}

/**
 * Register face data for an employee
 */
export async function registerFace(
    apiKey: string,
    employeeId: string,
    faceData: FaceData
): Promise<{ success: boolean; employeeId: string; employeeName: string }> {
    const response = await fetch(`${API_BASE}/register-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            apiKey,
            employeeId,
            faceData: {
                descriptors: faceData.descriptors,
                images: faceData.images || [],
            },
        }),
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(getErrorMessage(data, "Failed to register face"));
    }

    return data.data;
}

/**
 * Mark attendance using face recognition
 */
export async function markAttendance(
    apiKey: string,
    faceData: FaceData,
    location?: { latitude: number; longitude: number; accuracy?: number },
    deviceId?: string
): Promise<AttendanceResult> {
    const response = await fetch(`${API_BASE}/mark-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            apiKey,
            faceData: {
                descriptors: faceData.descriptors,
                image: faceData.image,
            },
            location,
            deviceId: deviceId || generateDeviceId(),
            timestamp: new Date().toISOString(),
        }),
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(getErrorMessage(data, "Failed to mark attendance"));
    }

    return data.data;
}

/**
 * Generate a persistent device ID
 */
function generateDeviceId(): string {
    let deviceId = localStorage.getItem("kiosk_device_id");

    if (!deviceId) {
        deviceId = `kiosk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("kiosk_device_id", deviceId);
    }

    return deviceId;
}

/**
 * Helper to extract error message from response
 */
function getErrorMessage(data: any, defaultMsg: string): string {
    if (typeof data.error === "string") return data.error;
    if (data.error?.message) {
        if (typeof data.error.message === "string") return data.error.message;
        if (data.error.message?.name === "UnauthorizedError" || data.error?.code === "UNAUTHORIZED") {
            return "Invalid or inactive API key";
        }
        if (data.error.message?.message) return data.error.message.message;
    }
    return defaultMsg;
}
