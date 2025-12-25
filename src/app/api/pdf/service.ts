import { getData, getPDFOutput, setupData } from "./helpers";
import { PurchaseService } from "../purchases/service";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Salary from "@/app/models/Salary";
import { pdfGenerationSchema } from "@/app/lib/schemas";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import dbConnect from "@/app/lib/db";
import { NextResponse } from "next/server";

export class PdfService {
    static async generatePdf(body: any, context: any) {
        const { user } = context;
        const userId = user.id;

        const parsedBody = pdfGenerationSchema.parse(body);
        const { companyId, period, salaryIds, pdfType } = parsedBody;

        await dbConnect();

        if (user.role === "employee") {
            const employee = await Employee.findOne({ user: userId });
            if (!employee) {
                return ApiResponseUtils.sendNotFound("Employee not found for the current user.");
            }

            // Verify that all requested salaryIds belong to this employee
            if (salaryIds && salaryIds.length > 0) {
                const salaries = await Salary.find({
                    _id: { $in: salaryIds },
                    employee: employee._id,
                }).select("_id");

                if (salaries.length !== salaryIds.length) {
                    return ApiResponseUtils.sendForbidden("Access denied. You can only request your own documents.");
                }
            }
        }

        //check authority
        const filter: { user?: string; _id: string } = {
            user: userId,
            _id: companyId,
        };
        //if admin allow
        if (user.role === "admin") {
            delete filter.user;
        }
        //check if companyExists without fetching
        const companyCheck = await Company.findOne(filter).select("mode name");
        if (!companyCheck) {
            return ApiResponseUtils.sendNotFound("Access denied.");
        }

        //check purchased
        if (
            !(
                user.role === "admin" &&
                (companyCheck.mode === "visit" || companyCheck.mode === "aided")
            )
        ) {
            const purchasedStatus = await PurchaseService.checkPurchased(companyId, period);
            if (purchasedStatus !== "approved") {
                return ApiResponseUtils.sendBadRequest(
                    `${period} not Purchased for ${companyCheck.name}. Purchase is ${purchasedStatus}`
                );
            }
        }

        const needPayment = pdfType !== "salary" && pdfType !== "payslip";

        const { company, salaries, payment, employees } = await getData(
            companyId,
            period,
            needPayment,
            pdfType,
            salaryIds
        );

        //if no salaries found
        if (salaries.length === 0) {
            return ApiResponseUtils.sendNotFound(
                `Salary data not found for ${company.name} for ${period}`
            );
        }

        if (needPayment && (!payment || Object.keys(payment).length === 0)) {
            return ApiResponseUtils.sendNotFound(
                `Payment data not found for ${company.name} for ${period}`
            );
        }

        const { columns, data } = setupData(salaries);

        const pdfOutput = await getPDFOutput(
            company,
            period,
            columns,
            data,
            payment,
            pdfType,
            employees as any
        );

        if (!pdfOutput) {
            return ApiResponseUtils.sendBadRequest("Invalid request");
        }

        // Return the PDF as a response
        return new NextResponse(pdfOutput as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="report.pdf"',
            },
        });
    }
}
