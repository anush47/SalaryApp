import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { DepartmentService } from "../service";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return ApiMiddleware.execute(req, DepartmentService.getHierarchy, { requireAuth: true });
}
