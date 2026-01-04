import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { LeaveRequestService } from "../service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return ApiMiddleware.execute(req, (req, session) => LeaveRequestService.getLeaveRequestById(req, session, id));
}
