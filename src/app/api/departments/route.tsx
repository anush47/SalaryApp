import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { DepartmentService } from "./service";

export async function GET(req: NextRequest) {
  return ApiMiddleware.execute(req, DepartmentService.getDepartments, { requireAuth: true });
}

export async function POST(req: NextRequest) {
  return ApiMiddleware.execute(req, DepartmentService.createDepartment, { requireAuth: true });
}

export async function PUT(req: NextRequest) {
  return ApiMiddleware.execute(req, DepartmentService.updateDepartment, { requireAuth: true });
}

export async function DELETE(req: NextRequest) {
  return ApiMiddleware.execute(req, DepartmentService.deleteDepartment, { requireAuth: true });
}

