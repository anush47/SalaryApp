import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { LeaveTypeService } from "./service";

export async function GET(req: NextRequest, { params }: { params: any }) {
  return ApiMiddleware.execute(req, LeaveTypeService.getLeaveTypes);
}

export async function POST(req: NextRequest, { params }: { params: any }) {
  return ApiMiddleware.execute(req, LeaveTypeService.createLeaveType);
}

export async function PUT(req: NextRequest, { params }: { params: any }) {
  return ApiMiddleware.execute(req, LeaveTypeService.updateLeaveType);
}

export async function DELETE(req: NextRequest, { params }: { params: any }) {
  return ApiMiddleware.execute(req, LeaveTypeService.deleteLeaveType);
}

