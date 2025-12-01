import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { DepartmentService } from "../service";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Pass params to the service via context or modify middleware to pass params
  // ApiMiddleware passes 'context' which is RequestContext.
  // I need to make sure 'params' are available.
  // The current ApiMiddleware implementation doesn't seem to automatically pass route params to the handler context.
  // However, I can pass a wrapper handler.

  return ApiMiddleware.execute(req, async (req, context) => {
    // Inject params into context or pass directly
    return DepartmentService.getDepartmentById(req, { ...context, params });
  }, { requireAuth: true });
}
