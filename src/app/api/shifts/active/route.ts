import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/app/lib/services/shiftService";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import connect from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const checkInTime = searchParams.get("time"); // HH:mm for auto-select

    if (!employeeId) {
        return NextResponse.json({ success: false, message: "Employee ID is required" }, { status: 400 });
    }

    await connect();

    try {
        const employee = await Employee.findById(employeeId).populate('shiftSettings.shifts');
        if (!employee) return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });

        const company = await Company.findById(employee.company).populate('shiftSettings.shifts');
        if (!company) return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });

        const resolved = await ShiftService.resolveActiveShift(
            employee,
            company,
            date || new Date().toISOString().split('T')[0],
            checkInTime || undefined
        );

        const settings = ShiftService.getEffectiveSettings(employee, company);

        return NextResponse.json({
            success: true,
            data: {
                ...resolved,
                mode: settings?.mode,
                availableShifts: settings?.shifts || []
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
