import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { LeaveTypeService } from "./service";

export async function GET(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveTypeService.getLeaveTypes);
}

export async function POST(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveTypeService.createLeaveType);
}

export async function PUT(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveTypeService.updateLeaveType);
}

export async function DELETE(req: NextRequest) {
  return ApiMiddleware.execute(req, LeaveTypeService.deleteLeaveType);
}

