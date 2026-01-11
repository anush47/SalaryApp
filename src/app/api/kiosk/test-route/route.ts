import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    return NextResponse.json({ success: true, message: "Test route working" });
}

export async function GET(req: NextRequest) {
    return NextResponse.json({ success: true, message: "Test route GET working" });
}
