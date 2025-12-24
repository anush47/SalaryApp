import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { LeaveRequestService } from "./service";

export async function GET(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveRequestService.getLeaveRequests);
}

export async function POST(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveRequestService.createLeaveRequest);
}

export async function PUT(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveRequestService.updateLeaveRequest);
}
