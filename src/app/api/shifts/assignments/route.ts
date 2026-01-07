import { NextRequest, NextResponse } from "next/server";
import ShiftAssignment from "@/app/models/ShiftAssignment";
import connect from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
    await connect();
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate"); // For range
    const endDate = searchParams.get("endDate");
    const companyId = searchParams.get("companyId");

    if (!employeeId && !companyId) {
        return NextResponse.json({ success: false, message: "Employee ID or Company ID is required" }, { status: 400 });
    }

    try {
        let query: any = {};
        if (employeeId) query.employee = employeeId;
        if (companyId) query.company = companyId;

        if (date) {
            query.date = date;
        } else if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        const assignments = await ShiftAssignment.find(query); // populated shiftId might be needed on frontend?

        // Populate if needed? The RosterManager might need shift names.
        // Assuming details are in 'shiftId' if it's an ID from Compnay or Employee pool.
        // But ShiftAssignment.shiftId is just a string (ID). Mongoose population requires Ref.
        // The ShiftAssignment schema might not have specific Ref if shifts are embedded in Company/Employee.
        // So we return raw IDs and frontend maps them using the known Shift Pool.

        return NextResponse.json({ success: true, data: assignments });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await connect();
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { employeeId, shiftId, date, isOffDay } = body;

        if (!employeeId || !date || (!shiftId && !isOffDay)) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const assignment = await ShiftAssignment.findOneAndUpdate(
            { employee: employeeId, date: date },
            { shiftId, isOffDay: !!isOffDay },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, data: assignment });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    await connect();
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // Assignment ID
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date");

    try {
        if (id) {
            await ShiftAssignment.findByIdAndDelete(id);
        } else if (employeeId && date) {
            await ShiftAssignment.findOneAndDelete({ employee: employeeId, date: date });
        } else {
            return NextResponse.json({ success: false, message: "Missing ID or EmployeeID+Date" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Assignment deleted" });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
