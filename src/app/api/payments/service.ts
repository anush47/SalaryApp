import dbConnect from "@/app/lib/db";
import Payment from "@/app/models/Payment";
import Company, { ICompany } from "@/app/models/Company";
import { NextRequest } from "next/server";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";
import { paymentSaveSchema, paymentUpdateSchema, periodSchema, PaymentCalculationResult } from "@/app/lib/schemas";
import { PurchaseService } from "../purchases/service";
import { FlattenMaps } from "mongoose";
import { ISalary } from "@/app/models/Salary";
import Employee from "@/app/models/Employee";
import Salary from "@/app/models/Salary";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/app/lib/errorHandler";

export class PaymentService {
    static async getPayments(req: NextRequest, context: any) {
        const { user: currentUser } = context;
        const userId = currentUser?.id;

        await dbConnect();

        const paymentId = req.nextUrl.searchParams.get("paymentId");
        let companyId = req.nextUrl.searchParams.get("companyId");
        let period = req.nextUrl.searchParams.get("period");
        const search = req.nextUrl.searchParams.get("search");

        if (period) {
            if (!/^\d{4}-\d{2}$/.test(period)) {
                throw new BadRequestError("Period must be in the format yyyy-mm");
            }
        }

        if (!companyId && !paymentId) {
            throw new BadRequestError("Company ID or payment ID is required");
        }

        if (paymentId) {
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new NotFoundError("Payment not found");
            }

            companyId = payment.company.toString();
            const filter: any = { _id: companyId };

            if (currentUser.role !== "admin") {
                filter.user = userId;
            }

            const company = await Company.findOne(filter);
            if (!company) {
                throw new ForbiddenError("Access denied");
            }

            const enrichedPayment = {
                ...payment.toObject(),
                companyPaymentMethod: company.paymentMethod,
                companyName: company.name,
                companyEmployerNo: company.employerNo,
            };
            return { payments: [enrichedPayment] };
        }

        const { page, limit, skip } = getPaginationParams(req);
        let payments;
        let paymentFilter: any = {};
        let total = 0;

        // Search logic
        const searchRegex = search ? new RegExp(search, "i") : null;
        const searchFilter = searchRegex ? {
            $or: [
                { name: searchRegex },
                { employerNo: searchRegex },
                { period: searchRegex }
            ]
        } : {};

        if (companyId === "all") {
            let companies: any[] = [];
            const companyQuery = {
                ...(currentUser.role !== "admin" ? { user: userId } : {}),
                ...searchFilter
            };
            // Remove period from company search filter as it belongs to payment
            delete (companyQuery as any).period;

            companies = (await Company.find(companyQuery)
                .select("_id name employerNo paymentMethod")
                .lean<ICompany[]>()).map((c) => ({
                    ...c,
                    _id: (c._id as any).toString()
                }));

            const companyIds = companies.map((c) => c._id);
            paymentFilter = { company: { $in: companyIds } };

            // Apply period filter if searched or provided
            if (period) {
                paymentFilter.period = period;
            } else if (searchRegex) {
                // Trying to search period in payments if passing something looking like a date?
                // or just always apply regex?
                // Payment period is string "YYYY-MM"
                // If search matches period format, we could add it to OR?
                // But we have separated company filter and payment filter.
                // Let's add simple period regex check to paymentFilter.$or if needed,
                // but easier: if companyIds are found, find payments for them.
                // If search text also matches period, we should include payments that match period!
                // Complexity: $or between company-based match AND period-based match?
                // Current logic: Find Companies matching Search -> Find Payments for those Companies.
                // This omits case: Search "2024-01" -> should find payments for 2024-01 even if company name doesn't match?
                // Yes.
            }
            // Simplified: Filter by Company Name/No OR Period
            // If search is provided:
            if (search) {
                // We need to fetch ALL companies (scoped to user) to check period matches on payments,
                // OR we do a complex aggregation.
                // For now, let's just stick to Company Search as primary,
                // plus strict Period search if the search string looks like a period?
                // Or just let the existing logic stand: Filter companies by search, get their payments.
                // If the user searches "2023", companies won't match, so 0 results.
                // Fix:
                // We want to find payments where (Company matches search OR Payment.period matches search).
                // This requires joining.
                // Efficient approach for now:
                // 1. Find companies matching search -> companyIds1
                // 2. Find ALL companies (for user) -> allCompanyIds
                // 3. Query Payment: { $and: [ { company: { $in: allCompanyIds } }, { $or: [ { company: { $in: companyIds1 } }, { period: searchRegex } ] } ] }
                //
                // Let's implement this robust search.

                // 1. Companies matching search
                const companyQuerySearch = {
                    ...(currentUser.role !== "admin" ? { user: userId } : {}),
                    ...{
                        $or: [
                            { name: new RegExp(search, "i") },
                            { employerNo: new RegExp(search, "i") }
                        ]
                    }
                };
                const companiesMatchingName = await Company.find(companyQuerySearch).select("_id").lean();
                const companyIdsMatchingName = companiesMatchingName.map(c => c._id);

                // 2. Base scope companies
                let allUserCompanies = [];
                if (currentUser.role === "admin") {
                    // Admin sees all, no need to filter by user
                    // We can query payments directly with company IDs?
                    // If admin, we don't strictly need to fetch all companies first if we trust DB refs,
                    // but we need to verify admin access? Admin has all access.
                } else {
                    const BaseCompanyQuery = { user: userId };
                    allUserCompanies = await Company.find(BaseCompanyQuery).select("_id").lean();
                }
                const allUserCompanyIds = allUserCompanies.map(c => c._id);

                // 3. Payment Query
                paymentFilter = {};
                if (currentUser.role !== "admin") {
                    paymentFilter.company = { $in: allUserCompanyIds };
                }

                const searchRegex = new RegExp(search, "i");
                paymentFilter.$or = [
                    { company: { $in: companyIdsMatchingName } },
                    { period: searchRegex },
                    { epfChequeNo: searchRegex },
                    { etfChequeNo: searchRegex }
                ];

                // If filtering by specific companies via name mismatch, we still need to populate details later.
                // We need the Full Company Map for population.
                // Let's fetch all relevant companies for population after paging payments?
                // Or just fetch companies for the result set.
            } else {
                // No Search - existing logic
                let companies = [];
                if (currentUser.role === "admin") {
                    companies = await Company.find({}).select("_id").lean();
                } else {
                    companies = await Company.find({ user: userId }).select("_id").lean();
                }
                const companyIds = companies.map((c) => c._id);
                paymentFilter = { company: { $in: companyIds } };
                if (period) paymentFilter.period = period;
            }
        } else {
            // Specific company
            const filter: any = { _id: companyId };
            if (currentUser.role !== "admin") {
                filter.user = userId;
            }

            const company = await Company.findOne(filter);
            if (!company) {
                throw new ForbiddenError("Access denied");
            }

            paymentFilter = { company: companyId };
            if (period) {
                paymentFilter.period = period;
            }
            if (search) {
                const searchRegex = new RegExp(search, "i");
                paymentFilter.$or = [
                    { period: searchRegex },
                    { epfChequeNo: searchRegex },
                    { etfChequeNo: searchRegex }
                ];
            }
        }

        payments = await Payment.find(paymentFilter)
            .skip(skip)
            .limit(limit)
            .lean();

        total = await getTotalCount(Payment, paymentFilter);

        // Populate company details
        // Fetch unique companies for the result set to populate
        const resultCompanyIds = payments.map(p => p.company);
        const uniqueCompanyIds = Array.from(new Set(resultCompanyIds));

        const companiesForPopulate = await Company.find({ _id: { $in: uniqueCompanyIds } })
            .select("_id name employerNo paymentMethod")
            .lean<ICompany[]>();

        payments = payments.map((payment) => {
            const company = companiesForPopulate.find(
                (comp) => String(comp._id) === String(payment.company)
            );
            return {
                ...payment,
                companyName: company?.name,
                companyEmployerNo: company?.employerNo,
                companyPaymentMethod: company?.paymentMethod,
            };
        });

        return createPaginatedResponse(payments, page, limit, total);
    }

    static async createPayment(body: any, context: any) {
        const { user: currentUser } = context;
        const userId = currentUser?.id;

        const paymentData = body.payment;
        if (!paymentData) {
            throw new BadRequestError("Payment data is required");
        }

        // Convert to numbers
        paymentData.epfAmount = Number(paymentData.epfAmount);
        paymentData.etfAmount = Number(paymentData.etfAmount);
        paymentData.epfSurcharges = Number(paymentData.epfSurcharges) || 0;
        paymentData.etfSurcharges = Number(paymentData.etfSurcharges) || 0;

        const payment = paymentSaveSchema.parse(paymentData);
        delete payment._id;

        await dbConnect();

        const existingPayment = await Payment.findOne({
            company: payment.company,
            period: payment.period,
        });
        if (existingPayment) {
            throw new BadRequestError("Payment already exists");
        }

        const filter: any = { _id: payment.company };
        if (currentUser.role !== "admin") {
            filter.user = userId;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied");
        }

        if (
            !(
                currentUser.role === "admin" &&
                (company.mode === "visit" || company.mode === "aided")
            )
        ) {
            const purchasedStatus = await PurchaseService.checkPurchased(
                payment.company as string,
                payment.period
            );
            if (purchasedStatus !== "approved") {
                throw new BadRequestError(`${payment.period} not Purchased for ${company.name}. Purchase is ${purchasedStatus}`);
            }
        }

        const newPayment = new Payment(payment);
        await newPayment.save();

        return {
            message: "Payment created successfully",
            payment: newPayment,
        };
    }

    static async updatePayment(body: any, context: any) {
        const { user: currentUser } = context;
        const userId = currentUser?.id;

        const paymentData = body.payment;
        if (!paymentData) {
            throw new BadRequestError("Payment data is required");
        }

        paymentData.epfAmount = Number(paymentData.epfAmount);
        paymentData.etfAmount = Number(paymentData.etfAmount);
        paymentData.epfSurcharges = Number(paymentData.epfSurcharges);
        paymentData.etfSurcharges = Number(paymentData.etfSurcharges);

        const parsedBody = paymentUpdateSchema.parse(paymentData);

        await dbConnect();

        const filter: any = { _id: parsedBody.company };
        if (currentUser.role !== "admin") {
            filter.user = userId;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied");
        }

        if (
            currentUser.role !== "admin" &&
            (company.mode === "aided" || company.mode === "visit")
        ) {
            throw new ForbiddenError("Access denied");
        }

        const existingPayment = await Payment.findById(parsedBody._id);
        if (!existingPayment) {
            throw new NotFoundError("Payment not found");
        }

        const updatedPayment = await Payment.findByIdAndUpdate(
            parsedBody._id,
            parsedBody,
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!updatedPayment) {
            throw new Error("Failed to update payment");
        }

        return {
            message: "Payment updated successfully",
            payment: updatedPayment,
        };
    }

    static async deletePayments(req: NextRequest, context: any) {
        const { user: currentUser } = context;
        const userId = currentUser?.id;

        const { paymentIds } = await req.json();
        if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
            throw new BadRequestError("Array of payment IDs is required");
        }

        await dbConnect();

        const payments = await Payment.find({ _id: { $in: paymentIds } }).lean();
        const companyIds = payments.map((payment) => payment.company);

        const filter: any = { _id: { $in: companyIds } };
        if (currentUser.role !== "admin") {
            filter.user = userId;
        }

        const companies = await Company.find(filter).select("_id name mode").lean();

        if (companies.length === 0 || companies.length !== companyIds.length) {
            throw new ForbiddenError("Access denied");
        }

        if (currentUser.role === "admin") {
            await Payment.deleteMany({ _id: { $in: paymentIds } });
            return { message: "Payments deleted successfully" };
        } else {
            const visitAidedCompanies = companies.filter(
                (company) => company.mode === "visit" || company.mode === "aided"
            );

            await Payment.deleteMany({
                _id: { $in: paymentIds },
                company: { $nin: visitAidedCompanies.map((company) => company._id) },
            });

            if (visitAidedCompanies.length > 0) {
                throw new ForbiddenError(`You are not allowed to delete Payments for ${visitAidedCompanies
                    .map((company) => company.name)
                    .join(", ")}.`);
            } else {
                return { message: "Payments deleted successfully" };
            }
        }
    }

    static calculateTotalEarnings(salary: ISalary) {
        let totalEarnings = 0;
        try {
            totalEarnings += salary.basic;
            totalEarnings += salary.holidayPay ?? 0;
            totalEarnings -= salary.noPay?.amount ?? 0;
            //payment structure affect
            if (salary.paymentStructure?.additions) {
                for (let addition of salary.paymentStructure.additions) {
                    if (addition.affectTotalEarnings) {
                        totalEarnings += addition.amount;
                    }
                }
            }
            if (salary.paymentStructure?.deductions) {
                for (let deduction of salary.paymentStructure.deductions) {
                    if (deduction.affectTotalEarnings) {
                        totalEarnings -= deduction.amount;
                    }
                }
            }
        } catch {
            console.log("Error in salary", salary);
        }
        return totalEarnings;
    }

    static generatePaymentCalculation(company: ICompany, salaries: ISalary[]): PaymentCalculationResult {
        try {
            let sumTotalEarnings = 0;
            for (let salary of salaries) {
                sumTotalEarnings += PaymentService.calculateTotalEarnings(salary);
            }

            const payment: PaymentCalculationResult = {
                epfAmount: sumTotalEarnings * 0.2,
                etfAmount: sumTotalEarnings * 0.03,
            };

            return payment;
        } catch (error) {
            console.error("Error generating payments:", error);
            throw new Error(
                error instanceof Error ? error.message : "An unexpected error occurred"
            );
        }
    }

    static async generatePayment(body: any, context: any) {
        const { user: currentUser } = context;
        const userId = currentUser?.id;

        let { salaryIds, companyId, period, regenerate } = body;

        if (!companyId) {
            throw new BadRequestError("Company ID must be provided");
        }

        if (period && !/^\d{4}-\d{2}$/.test(period)) {
            throw new BadRequestError("Period must be in the format YYYY-MM");
        }

        await dbConnect();

        let filter: { user?: string; _id?: string } = {
            user: userId,
            _id: companyId,
        };

        if (currentUser?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);

        if (!company) {
            throw new BadRequestError("Company not found");
        }

        //if payment already exists, return error
        if (regenerate !== true) {
            const existingPayment = await Payment.findOne({
                company: companyId,
                period: period,
            });

            if (existingPayment) {
                throw new BadRequestError("Payment already exists for:" + period);
            }
        }

        if (
            !(
                currentUser?.role === "admin" &&
                (company.mode === "visit" || company.mode === "aided")
            )
        ) {
            const purchasedStatus = await PurchaseService.checkPurchased(companyId, period);
            if (purchasedStatus !== "approved") {
                throw new BadRequestError(`Month not Purchased for ${period}. Purchase is ${purchasedStatus}`);
            }
        }

        // find employees ids of company
        const employeeIds = await Employee.find({ company: companyId }).select(
            "_id"
        );

        // Find all salaries
        let salaries = [];
        if (salaryIds) {
            salaries = await Salary.find({
                _id: { $in: salaryIds },
            });
        } else {
            salaries = await Salary.find({
                employee: { $in: employeeIds },
                period: period,
            });
        }

        // If no salaries
        if (!salaries || salaries.length === 0) {
            throw new BadRequestError(`No salaries found for ${period} in ${company.name}`);
        }

        const generatedPayment = PaymentService.generatePaymentCalculation(company, salaries);

        return { payment: generatedPayment };
    }
}
