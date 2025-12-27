import { NextRequest, NextResponse } from "next/server";
import Holiday from "@/app/models/Holiday";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import dbConnect from "@/app/lib/db";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const calendar = searchParams.get("calendar") || "default";

        const query: any = { calendar };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = startDate;
            if (endDate) query.date.$lte = endDate;
        }

        const holidays = await Holiday.find(query).sort({ date: 1 }).lean();

        return NextResponse.json(ApiResponseUtils.success(holidays));
    } catch (error: any) {
        console.error("Error fetching holidays:", error);
        return NextResponse.json(ApiResponseUtils.error(error.message || "Internal Server Error"));
    }
}
