import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { CompanyService } from "../service";
import { employerNoSchema, periodFormatSchema } from "@/app/lib/schemas";
import { z } from "zod";

export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const employerNo = employerNoSchema.parse(body.employerNo);
      let period = body.period;

      if (!period) {
        const date = new Date();
        date.setMonth(date.getMonth() - 2);
        period = date.toISOString().slice(0, 7);
      }

      period = periodFormatSchema.parse(period);

      const result = await CompanyService.getReferenceNoName(employerNo, period);
      return ApiResponseUtils.sendSuccess(result, "Reference number fetched successfully");
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error;
    }
  });
}
