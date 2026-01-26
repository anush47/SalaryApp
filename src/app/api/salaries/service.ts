import mongoose from "mongoose";
import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Salary from "@/app/models/Salary";
import SalaryPayment from "@/app/models/SalaryPayment";
import Attendance from "@/app/models/Attendance";
import { PurchaseService } from "../purchases/service";
import { AttendanceService } from "../attendance/service";
import { SalaryGenerationService } from "./services/salaryGenerationService";
import { RawInOut, ProcessedInOut, generateSalaryForOneEmployee } from "./generate/salaryGeneration";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";

import {
    salaryCreateSchema,
    salaryUpdateSchema,
    salaryIdSchema,
    periodSchema,
    salaryGenerateSchema
} from "@/app/lib/schemas";
import { initialInOutProcess } from "./initialInOutProcess";
import { calculatePeriodDates, calculateExpectedWorkingDays } from "./utils/periodCalculation";
import SalaryAdvance from "@/app/models/SalaryAdvance";
import { calculateDailyRate, calculateBaseSalaryForPeriod } from "./utils/rateCalculation";
import {
    getActiveAdvances,
    rollbackAdvanceDeductions,
    applyAdvanceDeductions,
    reconcileAdvances,
    calculateTotalAdvanceDeduction,
    AdvanceDeduction
} from "./utils/advanceDeduction";
import { expandPeriodForSalaryType } from "./utils/periodExpansion";

export class SalaryService {
    static async getSalary(salaryId: string, context: RequestContext) {
        await dbConnect();

        // Fetch one salary by ID
        const salary = await Salary.findById(salaryId);
        if (!salary) {
            throw new NotFoundError("Salary not found");
        }

        // Get company from employeeId and add company id
        const employee = await Employee.findById(salary.employee);
        const companyId = employee?.company;

        const filter: {
            user?: string;
            _id: string | any;
        } = {
            user: context.user?.id,
            _id: companyId as string,
        };

        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        // Enriched salary
        const enrichedSalary = {
            ...salary._doc,
            name: employee?.name,
            memberNo: employee?.memberNo,
            nic: employee?.nic,
            companyName: company.name,
            companyEmployerNo: company.employerNo,
        };

        return enrichedSalary;
    }

    static async getSalaries(req: any, context: RequestContext) {
        await dbConnect();

        let companyId = req.nextUrl.searchParams.get("companyId");
        let period = req.nextUrl.searchParams.get("period");
        const employeeId = req.nextUrl.searchParams.get("employee");
        const search = req.nextUrl.searchParams.get("search");

        if (period) {
            period = periodSchema.parse(period);
        }

        if (!companyId && !employeeId) {
            throw new BadRequestError("Company ID or employee ID is required");
        }

        if (employeeId) {
            // Security check: Ensure the logged-in user is the employee themselves
            if (context.user?.role === "employee") {
                const employee = await Employee.findOne({ user: context.user?.id });
                if (String(employee?._id) !== employeeId) {
                    throw new ForbiddenError("Access denied. You can only view your own salaries.");
                }
            }

            const salaries = await Salary.find({
                employee: employeeId,
                ...(period ? { period } : {}),
            }).select("+inOut").lean();



            return {
                data: salaries,
                page: 1,
                limit: salaries.length,
                total: salaries.length
            };
        }

        let employees: {
            _id: string;
            name: string;
            memberNo: number;
            nic: string;
            companyName?: string;
            companyEmployerNo?: string;
            company?: string;
            basic?: number;
            divideBy?: number;
        }[] = [];

        // Build search filter
        const searchFilter = search ? {
            $or: [
                { name: new RegExp(search, "i") },
                { nic: new RegExp(search, "i") },
                ...(isNaN(Number(search)) ? [] : [{ memberNo: Number(search) }])
            ]
        } : {};

        if (companyId === "all") {
            let companies = [];
            if (context.user?.role === "admin") {
                // Fetch all employees for admin
                companies = (await Company.find({}).select("_id name employerNo").lean()).map(company => ({
                    ...company,
                    _id: (company._id as any).toString(),
                })) as any;

                const employeesQuery = {
                    ...searchFilter
                };

                employees = (await Employee.find(employeesQuery)
                    .select("_id name memberNo nic company basic divideBy")
                    .lean()).map(employee => ({
                        ...employee,
                        _id: (employee._id as any).toString(),
                    })) as any;

            } else {
                // Fetch all employees of companies associated with the user
                companies = (await Company.find({ user: context.user?.id })
                    .select("_id name employerNo")
                    .lean()).map(company => ({
                        ...company,
                        _id: (company._id as any).toString(),
                    })) as any;
                const companyIds = companies.map((company: any) => company._id);

                const employeesQuery = {
                    company: { $in: companyIds },
                    ...searchFilter
                };

                employees = (await Employee.find(employeesQuery)
                    .select("_id name memberNo nic company")
                    .lean()).map(employee => ({
                        ...employee,
                        _id: (employee._id as any).toString(),
                    })) as any;
            }

            // Enrich employees with company details
            employees = employees.map((employee) => {
                const company = companies.find(
                    (comp: any) => String(comp._id) === String(employee.company)
                );
                return {
                    ...employee,
                    companyName: company?.name,
                    companyEmployerNo: company?.employerNo,
                };
            });
        } else {
            // Fetch employees of the specified company
            const filter: { user?: string; _id: string | any } = {
                user: context.user?.id,
                _id: companyId as string,
            };

            if (context.user?.role === "admin") {
                delete filter.user;
            }

            const company = await Company.findOne(filter);
            if (!company) {
                throw new ForbiddenError("Access denied.");
            }

            const employeesQuery = {
                company: companyId,
                ...searchFilter
            };

            employees = (await Employee.find(employeesQuery)
                .select("_id name memberNo nic")
                .lean()).map(employee => ({
                    ...employee,
                    _id: (employee._id as any).toString(),
                })) as any;
        }

        // Extract the list of IDs (just the _id values)
        const employeeIdList = employees.map((emp) => emp._id);

        if (employeeIdList.length === 0) {
            return {
                data: [],
                page: 1,
                limit: 10,
                total: 0
            };
        }

        // Get pagination params
        const { page, limit, skip } = getPaginationParams(req);

        // Build filter for salary query
        const salaryFilter = {
            employee: { $in: employeeIdList },
            ...(period ? { period } : {})
        };

        // Fetch salaries of employees with those IDs and remove inOut, with pagination
        const salaries = await Salary.find(salaryFilter, { inOut: 0 })
            .skip(skip)
            .limit(limit)
            .lean();



        // Get total count for pagination
        const total = await getTotalCount(Salary, salaryFilter);

        // Enrich the salary records with employee details
        const enrichedSalaries = salaries.map((salary) => {
            const employee = employees.find(
                (emp) => String(emp._id) === String(salary.employee)
            );
            return {
                ...salary,
                name: employee?.name,
                memberNo: employee?.memberNo,
                nic: employee?.nic,
                companyName: employee?.companyName,
                companyEmployerNo: employee?.companyEmployerNo,
                companyId: employee?.company,
                divideBy: employee?.divideBy,
            };
        });

        // Fetch active advances for these employees to calculate total debt
        const employeeIds = enrichedSalaries.map(s => (s as any).employee);
        const activeAdvances = await SalaryAdvance.find({
            employee: { $in: employeeIds },
            status: "active",
            remainingBalance: { $gt: 0 }
        }).select("employee remainingBalance").lean();

        // Create a map of employee -> total debt
        const debtMap = new Map<string, number>();
        activeAdvances.forEach((adv: any) => {
            const empId = String(adv.employee);
            const current = debtMap.get(empId) || 0;
            debtMap.set(empId, current + (Number(adv.remainingBalance) || 0));
        });

        // Add totalAdvanceDebt to salaries
        const finalSalaries = enrichedSalaries.map(s => ({
            ...s,
            totalAdvanceDebt: debtMap.get(String((s as any).employee)) || 0
        }));

        // Calculate Financial Summary (Totals for ALL matching records, not just page)
        // Aggregation requires ObjectId casting for $match
        const employeeObjectIds = employeeIdList.map(id => new mongoose.Types.ObjectId(String(id)));

        const aggregationMatch = {
            ...salaryFilter,
            employee: { $in: employeeObjectIds }
        };

        const totalOutstandingStats = await Salary.aggregate([
            { $match: aggregationMatch },
            { $group: { _id: null, total: { $sum: "$outstandingBalance" } } }
        ]);
        const totalOutstanding = totalOutstandingStats[0]?.total || 0;

        const totalAdvanceDebtStats = await SalaryAdvance.aggregate([
            { $match: { employee: { $in: employeeObjectIds }, status: "active", remainingBalance: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: "$remainingBalance" } } }
        ]);
        const totalAdvanceDebt = totalAdvanceDebtStats[0]?.total || 0;

        return {
            data: finalSalaries,
            page,
            limit,
            total,
            summary: {
                totalOutstanding,
                totalAdvanceDebt,
                netPosition: totalOutstanding - totalAdvanceDebt
            }
        };
    }

    static async createSalaries(body: any, context: RequestContext) {
        await dbConnect();

        if (!Array.isArray(body.salaries)) {
            throw new BadRequestError("Salaries must be an array");
        }

        // Initialize an array to hold valid salary objects
        const salaryDocs = [];

        for (const salary of body.salaries) {

            // Cleanup payload for saving
            if (typeof salary.employee === 'object' && salary.employee?._id) {
                salary.employee = salary.employee._id.toString();
            }
            if ('preview' in salary) delete salary.preview;
            if ('_id' in salary) delete salary._id; // Remove generated preview ID to allow fresh insertion

            salary.basic = Number(salary.basic);
            salary.advanceAmount = Number(salary.advanceAmount);
            salary.finalSalary = Number(salary.finalSalary);
            salary.noPay.amount = Number(salary.noPay.amount);
            salary.ot.amount = Number(salary.ot.amount);
            salary.holidayPay = Number(salary.holidayPay);

            // Convert amounts in payment structure
            salary.paymentStructure.additions.forEach((addition: any) => {
                addition.amount = Number(addition.amount);
            });
            salary.paymentStructure.deductions.forEach((deduction: any) => {
                deduction.amount = Number(deduction.amount);
            });

            // Parse and validate each salary object against the schema
            const parsedSalary = salaryCreateSchema.parse(salary);

            // Fetch employee for validation
            const employee = await Employee.findById(parsedSalary.employee);
            if (!employee) {
                throw new NotFoundError(`Employee not found for salary ${parsedSalary.employee}`);
            }

            // Check if salary already exists for this period and employee
            const existingSalary = await Salary.findOne({
                employee: parsedSalary.employee,
                period: parsedSalary.period,
            });
            if (existingSalary) {
                throw new BadRequestError(`Salary already exists for employee ${employee.name} in period ${parsedSalary.period}`);
            }

            // Check for company access and purchased status
            const filter: { user?: string; _id: string | any } = {
                user: context.user?.id,
                _id: employee.company,
            };
            if (context.user?.role === "admin") {
                delete filter.user;
            }
            const company = await Company.findOne(filter);
            if (!company) {
                throw new ForbiddenError("Access denied.");
            }

            if (
                !(
                    context.user?.role === "admin" &&
                    (company.mode === "visit" || company.mode === "aided")
                )
            ) {
                const purchasedStatus = await PurchaseService.checkPurchased(
                    employee.company.toString(),
                    parsedSalary.period
                );
                if (purchasedStatus !== "approved") {
                    throw new BadRequestError(`${parsedSalary.period} not Purchased for ${company.name}. Purchase is ${purchasedStatus}`);
                }
            }

            // Calculate total additions and deductions
            const totalAdditions = parsedSalary.paymentStructure.additions.reduce(
                (total: number, addition: { amount: number }) =>
                    total + addition.amount,
                0
            );
            const totalDeductions = parsedSalary.paymentStructure.deductions.reduce(
                (total: number, deduction: { amount: number }) =>
                    total + deduction.amount,
                0
            );

            // Calculate final salary
            const finalSalary =
                parsedSalary.basic +
                (parsedSalary.holidayPay ?? 0) +
                totalAdditions +
                (parsedSalary.ot.amount || 0) -
                totalDeductions -
                (parsedSalary.noPay.amount || 0);
            parsedSalary.finalSalary = finalSalary;

            // RECONCILE: Advance Amount vs Active Advances Detail
            let baseAdvances = parsedSalary.activeAdvances || [];
            if (baseAdvances.length === 0 && Number(parsedSalary.advanceAmount) > 0) {
                try {
                    baseAdvances = await getActiveAdvances(parsedSalary.employee, parsedSalary.period);
                } catch (e) {
                    console.error("[SalaryService] Failed to fetch active advances during creation", e);
                }
            }

            if (baseAdvances && baseAdvances.length > 0) {
                const targetAmount = Number(parsedSalary.advanceAmount) || 0;
                // Use centralized reconciliation logic
                const reconciled = reconcileAdvances(
                    baseAdvances.map((a: any) => ({
                        ...a,
                        deductionAmount: Number(a.deductedAmount || a.deductionAmount || 0)
                    })),
                    targetAmount
                );
                parsedSalary.activeAdvances = reconciled.map(a => ({
                    advanceId: a.advanceId,
                    deductedAmount: a.deductionAmount
                }));
            }

            // Set initial outstanding balance (Final Salary - Advances)
            // finalSalary is Net Earnings (before Advance).
            parsedSalary.outstandingBalance = finalSalary - (parsedSalary.advanceAmount || 0);

            // Auto Acknowledge Check

            // Add the parsed salary to the array
            salaryDocs.push(parsedSalary);
        }

        // Use insertMany to save all salary documents efficiently
        let savedSalaries: any[] = [];
        if (salaryDocs.length > 0) {
            savedSalaries = await Salary.insertMany(salaryDocs);

            // Apply advance deductions for each saved salary
            for (const salary of savedSalaries) {
                if (salary.activeAdvances && salary.activeAdvances.length > 0) {
                    const advancesForDeduction = salary.activeAdvances.map((a: any) => ({
                        advanceId: a.advanceId,
                        deductionAmount: a.deductedAmount
                    }));
                    await applyAdvanceDeductions(salary._id.toString(), advancesForDeduction);
                }
            }
        }

        return {
            message: `${savedSalaries.length} Salary records created successfully`,
        };
    }

    static async updateSalary(body: any, context: RequestContext) {
        await dbConnect();



        //convert to numbers
        body.basic = Number(body.basic);
        body.holidayPay = Number(body.holidayPay);
        body.advanceAmount = Number(body.advanceAmount);
        body.finalSalary = Number(body.finalSalary);
        body.noPay.amount = Number(body.noPay.amount);
        body.ot.amount = Number(body.ot.amount);
        body.paymentStructure.additions.forEach((addition: any) => {
            addition.amount = Number(addition.amount);
        });
        body.paymentStructure.deductions.forEach((deduction: any) => {
            deduction.amount = Number(deduction.amount);
        });

        let parsedBody;
        try {
            parsedBody = salaryUpdateSchema.parse(body);
        } catch (error: any) {
            if (error.name === "ZodError") {
                console.error("[SalaryUpdate] Zod Validation Error:", JSON.stringify(error.errors, null, 2));
                // Log the first few daily records to see what's being sent
                if (body.dailyRecords && body.dailyRecords.length > 0) {
                    console.error("[SalaryUpdate] Sample DailyRecord (0):", JSON.stringify(body.dailyRecords[0], null, 2));
                }
            }
            throw error;
        }

        // Calculate total additions
        const totalAdditions = parsedBody.paymentStructure.additions.reduce(
            (total: number, addition: { amount: number }) => total + addition.amount,
            0
        );

        // Calculate total deductions
        const totalDeductions = parsedBody.paymentStructure.deductions.reduce(
            (total: number, deduction: { amount: number }) =>
                total + deduction.amount,
            0
        );

        // Calculate final salary
        const finalSalary =
            parsedBody.basic +
            (parsedBody.holidayPay ?? 0) +
            totalAdditions +
            (parsedBody.ot.amount || 0) -
            totalDeductions -
            (parsedBody.noPay.amount || 0);
        // Update the parsedBody with the calculated final salary
        parsedBody.finalSalary = finalSalary;

        // Ensure IDs are strings if objects were passed
        const employeeId = (parsedBody.employee?._id || parsedBody.employee || "").toString();

        //get employee.company from employee
        const employee = await Employee.findById(employeeId).select(
            "company"
        );
        if (!employee) {
            throw new NotFoundError("Employee not found");
        }

        let filter: { user?: string; _id: string | any } = {
            user: context.user?.id,
            _id: employee.company.toString(),
        };

        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            throw new ForbiddenError("Access denied.");
        }

        // Check if mode is visit or aided and user is not admin
        if (
            context.user?.role !== "admin" &&
            (company.mode === "visit" || company.mode === "aided")
        ) {
            throw new ForbiddenError("Access denied.");
        }

        const existingSalary: any = await Salary.findById(parsedBody.id).lean();
        if (!existingSalary) {
            throw new NotFoundError("Salary not found");
        }

        // Recalculate outstanding balance based on new Final Salary and existing Total Paid AND Advances
        const totalPaid = existingSalary.totalPaid || 0;
        const advanceDed = parsedBody.advanceAmount || 0;
        parsedBody.outstandingBalance = finalSalary - totalPaid - advanceDed;

        // Rollback previous advance deductions before updating
        if (existingSalary.activeAdvances && existingSalary.activeAdvances.length > 0) {
            const advancesForRollback = existingSalary.activeAdvances.map((a: any) => ({
                advanceId: a.advanceId,
                deductionAmount: a.deductedAmount
            }));
            await rollbackAdvanceDeductions(existingSalary._id.toString(), advancesForRollback);
        }

        // Check if we need to fetch NEW advances (if none currently linked but amount > 0)
        let baseAdvances = existingSalary.activeAdvances || [];
        if (baseAdvances.length === 0 && Number(parsedBody.advanceAmount) > 0) {

            try {
                // Ensure correct types
                const potentialAdvances = await getActiveAdvances(parsedBody.employee, parsedBody.period);
                baseAdvances = potentialAdvances.map(p => ({
                    advanceId: p.advanceId,
                    deductedAmount: p.deductionAmount,
                    _id: p._id
                }));
            } catch (e) {
                console.error("[SalaryService] Failed to fetch active advances", e);
            }
        }

        // RECONCILE: Check if the total 'advanceAmount' in body matches the sum of existing 'activeAdvances'
        // If user edited 'advanceAmount' on frontend, we need to adjust the detailed 'activeAdvances'.
        if (baseAdvances && baseAdvances.length > 0) {
            const targetAdvanceAmount = Number(parsedBody.advanceAmount) || 0;

            // Use centralized reconciliation logic (map to interface)
            const mappedBase = baseAdvances.map((a: any) => ({
                advanceId: a.advanceId,
                // Handle diverse naming: deductedAmount (Salary Schema) vs deductionAmount (Utils)
                deductionAmount: Number(a.deductedAmount || a.deductionAmount || 0),
                _id: a._id
            }));

            const reconciled = reconcileAdvances(mappedBase, targetAdvanceAmount);

            // Map back to Salary Schema structure
            parsedBody.activeAdvances = reconciled.map(r => ({
                advanceId: r.advanceId,
                deductedAmount: r.deductionAmount,
                _id: r._id
            }));

        }

        // Sanitize dailyRecords if they exist
        if (parsedBody.dailyRecords) {
            parsedBody.dailyRecords = parsedBody.dailyRecords.map((record: any) => ({
                ...record,
                attendanceRecords: record.attendanceRecords?.map((r: any) => (r._id || r).toString()),
                appliedLeaves: record.appliedLeaves?.map((l: any) => (l._id || l).toString()),
                // Keep shift as is (could be ID or object as per schema)
                shift: record.shift?._id || record.shift
            }));
        }

        const updatedSalary = await Salary.findByIdAndUpdate(
            parsedBody.id,
            parsedBody,
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!updatedSalary) {
            throw new Error("Failed to update salary");
        }

        // Apply new advance deductions
        const salaryForDeduction = updatedSalary as any;
        if (salaryForDeduction.activeAdvances && salaryForDeduction.activeAdvances.length > 0) {
            const advancesForDeduction = salaryForDeduction.activeAdvances.map((a: any) => ({
                advanceId: a.advanceId,
                deductionAmount: a.deductedAmount
            }));
            await applyAdvanceDeductions(salaryForDeduction._id.toString(), advancesForDeduction);
        }

        return {
            message: "Salary updated successfully",
            salaries: updatedSalary,
        };
    }

    static async deleteSalaries(body: any, context: RequestContext) {
        await dbConnect();

        const { salaryIds } = body;
        if (!Array.isArray(salaryIds) || salaryIds.length === 0) {
            throw new BadRequestError("Array of salary IDs is required");
        }

        // Local cache for companies and employees
        const companyCache = new Map();

        // Fetch all employees related to the salaries
        const salaries = await Salary.find({ _id: { $in: salaryIds } }).select(
            "employee"
        );
        if (salaries.length === 0) {
            throw new NotFoundError("No salaries found for the provided IDs");
        }

        const employeeIds = salaries.map((salary) => salary.employee);
        const employees = await Employee.find({ _id: { $in: employeeIds } }).select(
            "company"
        );

        // Check if user is authorized to delete these salaries
        const companyIds = employees.map((employee) => employee.company);
        const uniqueCompanyIds = companyIds.filter(
            (value, index, self) => self.indexOf(value) === index
        );

        // Fetch companies and cache them
        const companies = await Promise.all(
            uniqueCompanyIds.map(async (companyId) => {
                if (companyCache.has(companyId)) {
                    return companyCache.get(companyId);
                }
                const filter: { user?: string; _id: string | any } = {
                    user: context.user?.id,
                    _id: companyId,
                };
                if (context.user?.role === "admin") {
                    delete filter.user;
                }
                const company = await Company.findOne(filter);
                if (company) {
                    companyCache.set(companyId, company);
                }
                return company;
            })
        );

        if (companies.some((company) => !company)) {
            throw new ForbiddenError("Access denied.");
        }

        //if admin
        if (context.user?.role === "admin") {
            // Fetch salaries to be deleted to rollback advances
            const salariesToDelete = await Salary.find({ _id: { $in: salaryIds } });

            // Rollback advance deductions
            for (const salary of salariesToDelete) {
                if (salary.activeAdvances && salary.activeAdvances.length > 0) {
                    const advancesForRollback = salary.activeAdvances.map((a: any) => ({
                        advanceId: a.advanceId,
                        deductionAmount: a.deductedAmount
                    }));
                    await rollbackAdvanceDeductions(salary._id.toString(), advancesForRollback);
                }
            }

            // Delete all salaries in one operation
            const deleteResult = await Salary.deleteMany({ _id: { $in: salaryIds } });

            // Delete related payments
            await SalaryPayment.deleteMany({ salary: { $in: salaryIds } });

            if (deleteResult.deletedCount === 0) {
                throw new NotFoundError("No salaries were deleted");
            }

            return { message: "Salaries deleted successfully" };
        } else {
            // dont delete salaries with company mode visit or aided
            const companiesAidedOrVisit = companies.filter(
                (company) => company.mode === "visit" || company.mode === "aided"
            );
            const employeesAidedOrVisit = employees.filter((employee) =>
                companiesAidedOrVisit.some(
                    (company) => String(company._id) === String(employee.company)
                )
            );

            // Delete strictly


            // First fetching to rollback advances
            const salariesToDelete = await Salary.find({
                _id: { $in: salaryIds },
                employee: {
                    $nin: employeesAidedOrVisit.map((employee) => employee._id),
                },
            });

            // Rollback advance deductions
            for (const salary of salariesToDelete) {
                if (salary.activeAdvances && salary.activeAdvances.length > 0) {
                    const advancesForRollback = salary.activeAdvances.map((a: any) => ({
                        advanceId: a.advanceId,
                        deductionAmount: a.deductedAmount
                    }));
                    await rollbackAdvanceDeductions(salary._id.toString(), advancesForRollback);
                }
            }

            await Salary.deleteMany({
                _id: { $in: salaryIds },
                employee: {
                    $nin: employeesAidedOrVisit.map((employee) => employee._id),
                },
            });

            // Delete related payments (only for those permitted)
            // But we need to know exactly which IDs were deleted?
            // Actually salaryIds filtered by permitted employees.
            // Let's use the same filter for payments payment.salary IN salaryIds AND salary.employee NOT IN protected.
            // Simplest: use the same salaryIds but filtering happens via the salary deletion?
            // If we delete salaries first, we can just delete payments where salary IN salaryIds?
            // But some salaryIds might NOT have been deleted due to protection.
            // We should use salariesToDelete IDs.
            const deletedSalaryIds = salariesToDelete.map(s => s._id);
            if (deletedSalaryIds.length > 0) {
                await SalaryPayment.deleteMany({ salary: { $in: deletedSalaryIds } });
            }

            if (employeesAidedOrVisit.length > 0) {
                throw new ForbiddenError(`You are not allowed to delete Salaries for employees in ${companiesAidedOrVisit
                    .map((company) => company.name)
                    .join(", ")}.`);
            } else {
                return { message: "Salaries deleted successfully" };
            }
        }
    }

    static async generateSalaries(body: any, context: RequestContext) {
        await dbConnect();

        const parsedBody = salaryGenerateSchema.parse(body);
        let { employees: employeeIds, companyId, period, inOut, update, existingSalaries, save, useLiveAttendance } = parsedBody;

        // Default save to true if not specified to maintain backward compatibility (or user preference?)
        // User requested: "saved only when i save" -> default to false for new requests if we want strict adherence
        // But schema says optional. Let's assume frontend will send save=true/false.
        // If save is undefined, we can default to false as per user request "saved only when i save"
        // However, existing calls might expect saving. Let's make it explicit from frontend for save=true.
        // For now, let's treat undefined as true to avoid breaking existing flows, but frontend will send false for preview.
        // Actually, user said "saved only when i save", so default logic should probably be: if save is explicit true.
        // But to be safe with existing calls, let's stick to Schema parsing.
        // Let's use `save ?? true` for existing behavior or `save || false` for new.
        // Given the request, I will respect the flag. existing calls are not many.

        // Actually, let's default to true for backward compatibility unless specified.
        const shouldSave = save !== false;

        let filter: { user?: string; _id?: string } = {
            user: context.user?.id,
            _id: companyId,
        };

        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = (await Company.findOne(filter).lean()) as any;

        if (!company) {
            throw new NotFoundError("Company not found");
        }

        if (
            !(
                context.user?.role === "admin" &&
                (company.mode === "visit" || company.mode === "aided")
            )
        ) {
            const purchasedStatus = await PurchaseService.checkPurchased(companyId, period);
            if (purchasedStatus !== "approved") {
                throw new BadRequestError(`Month not Purchased for ${period}. Purchase is ${purchasedStatus}`);
            }
        }

        // Find all active employees of the company if employees are not given
        let employees;
        if (!employeeIds) {
            employees = await Employee.find({
                company: companyId.toString(),
                active: true,
            }).lean();
        } else {
            employees = await Employee.find({
                _id: { $in: employeeIds },
                company: companyId.toString(),
            }).lean();
        }

        // If no employees
        if (!employees || employees.length === 0) {
            throw new NotFoundError("No active employees found for the company");
        }

        if (useLiveAttendance) {

            employees.forEach((emp: any) => {
                emp.calculationMethod = "attendance";
            });
        }

        // Retrieve company timezone
        const companyTimezone = company.timezone || "Asia/Colombo";

        // Validation Loop - only for non-attendance employees
        for (const employee of employees) {
            // Check for deprecated random OT method
            if ((employee.otMethod as any) === "random") {
                throw new BadRequestError(
                    `Employee ${employee.name} uses 'random' OT which is deprecated. Update to 'calc'.`
                );
            }
        }

        // === FLEXIBLE PERIOD EXPANSION ===
        // Expand periods based on each employee's salary period type
        const salaryGenerationTasks: Array<{
            employee: any;
            period: string;
            index: number;
        }> = [];

        for (let index = 0; index < employees.length; index++) {
            const employee = employees[index];
            const salaryPeriod = employee.salaryPeriod || company.salaryPeriodDefaults?.salaryPeriod || "monthly";

            // Expand the input period based on this employee's salary type
            const expandedPeriods = expandPeriodForSalaryType(
                period,
                salaryPeriod as 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'custom'
            );



            // Create a generation task for each expanded period
            for (const expandedPeriod of expandedPeriods) {
                salaryGenerationTasks.push({
                    employee,
                    period: expandedPeriod,
                    index
                });
            }
        }



        // Fetch existing salaries for all expanded periods
        const allExpandedPeriods = [...new Set(salaryGenerationTasks.map(t => t.period))];
        const empIds = employees.map((e: { _id: any }) => e._id);
        const existingSalariesFromDB = await Salary.find({
            employee: { $in: empIds },
            period: { $in: allExpandedPeriods },
        });
        // Create composite key map: employeeId_period -> salary
        const existingSalariesMap = new Map(
            existingSalariesFromDB.map((s: any) => [
                `${s.employee.toString()}_${s.period}`,
                s,
            ])
        );



        // Group tasks by employee ID for sequential processing
        const tasksByEmployee = new Map<string, typeof salaryGenerationTasks>();
        for (const task of salaryGenerationTasks) {
            const empId = task.employee._id.toString();
            if (!tasksByEmployee.has(empId)) {
                tasksByEmployee.set(empId, []);
            }
            tasksByEmployee.get(empId)!.push(task);
        }



        // Pre-processing: Sort tasks and fetch initial advance states in parallel
        const advanceStateMap = new Map<string, any[]>();
        const advanceFetchPromises: Promise<void>[] = [];

        for (const [empId, tasks] of tasksByEmployee) {
            // Sort tasks by period (ascending) to ensure correct deduction order
            tasks.sort((a, b) => a.period.localeCompare(b.period));

            // Queue up advance fetch for the first period of the sequence
            // We use the first period to check for active advances valid at start of batch
            advanceFetchPromises.push(
                getActiveAdvances(empId, tasks[0].period)
                    .then(advances => {
                        // Deep copy to separate from source state
                        advanceStateMap.set(empId, advances.map((a: any) => ({ ...a })));
                    })
                    .catch(error => {
                        console.error(`[SalaryService] Failed to fetch advances for ${empId}`, error);
                        advanceStateMap.set(empId, []); // Fallback to empty if failed, or could throw
                    })
            );
        }


        await Promise.all(advanceFetchPromises);


        // Process each employee's tasks in parallel
        const processEmployeeTasks = async (empId: string, tasks: typeof salaryGenerationTasks, initialAdvances: any[]) => {
            const employeeResults: { salary: any; exists: any; period: string }[] = [];

            // Advances are already pre-fetched and sorted
            // Use the injected initial state
            // Deep copy again if we want to be paranoid, but the map already has fresh copies for this employee logic
            // Since this function runs once per employee, utilizing the array from map (which is specific to this emp) is safe 
            // AS LONG AS we map it to a new array for mutation within this function instance
            // Ensure initialAdvances is an array
            if (!Array.isArray(initialAdvances)) {
                console.error(`[SalaryService] initialAdvances for ${empId} is not an array:`, initialAdvances);
                initialAdvances = [];
            }
            let currentAdvanceState = initialAdvances.map(a => ({ ...a }));



            for (const task of tasks) {
                const { employee, period: taskPeriod, index } = task;


                employee.index = index;

                // Set individual properties if no overrides, otherwise use overrides
                if (!employee.overrides?.shifts) {
                    employee.shiftSettings = company.shiftSettings;
                }
                if (!employee.overrides?.probabilities) {
                    employee.probabilities = company.probabilities;
                }
                if (!employee.overrides?.workingDays) {
                    employee.workingDays = company.workingDays;
                }
                if (!employee.overrides?.paymentStructure) {
                    employee.paymentStructure = company.paymentStructure;
                }
                if (!employee.overrides?.calendar) {
                    employee.calendar = company.calendar;
                }

                // Add company data to employee object for use in getWorkingDayStatus
                employee.company = company;

                // Check for existing salary using composite key (employeeId_period)
                const existingSalaryKey = `${employee._id.toString()}_${taskPeriod}`;
                const existingSalary = existingSalariesMap.get(existingSalaryKey);

                let salaryResult;

                if (existingSalary && !update) {
                    salaryResult = { exists: employee._id, salary: null, period: taskPeriod };
                } else {
                    // For attendance employees, employeeInOut is not needed (handled by SalaryGenerationService)
                    const employeeInOut = undefined;

                    const generatedSalary = await this.generateEnhancedSalary(
                        employee,
                        taskPeriod,
                        employeeInOut,
                        company,
                        existingSalary,
                        shouldSave,
                        currentAdvanceState
                    );
                    salaryResult = { salary: generatedSalary, exists: null, period: taskPeriod };
                }

                employeeResults.push(salaryResult);

                // Update currentAdvanceState based on deductions made in this salary
                // This ensures subsequent periods for the same employee see the depleted balance
                if (salaryResult.salary && salaryResult.salary.activeAdvances) {
                    for (const deduction of salaryResult.salary.activeAdvances) {
                        const advanceState = currentAdvanceState.find((a: any) => a.advanceId.toString() === deduction.advanceId.toString());
                        if (advanceState) {
                            // Subtract the deducted amount from the running balance
                            const deducted = Number(deduction.deductedAmount) || 0;
                            // Ensure valid number, avoid NaNs
                            const currentBalance = Number(advanceState.remainingBalance);
                            advanceState.remainingBalance = currentBalance - deducted;

                            // If balance drops to 0 or less, effective remaining is 0
                            if (advanceState.remainingBalance < 0) advanceState.remainingBalance = 0;
                        }
                    }
                }
            }
            return employeeResults;
        };

        // Execute parallel processing across employees
        const allEmployeeResultArrays = await Promise.all(
            Array.from(tasksByEmployee.entries()).map(([empId, tasks]) => {
                const initialAdvances = advanceStateMap.get(empId) || [];
                return processEmployeeTasks(empId, tasks, initialAdvances);
            })
        );

        // Flatten results
        const results = allEmployeeResultArrays.flat();

        const salaries = results.filter((r) => r && r.salary).map((r) => r.salary);
        const exists = results.filter((r) => r && r.exists).map((r) => r.exists);

        return { salaries, exists };
    }

    /**
     * Generate salary with enhanced features:
     * - Flexible salary periods (daily/weekly/monthly/custom)
     * - Advance deductions
     * - Payment tracking initialization
     */
    private static async generateEnhancedSalary(
        employee: any,
        period: string,
        employeeInOut: RawInOut | ProcessedInOut | undefined, // Optional now - not used for attendance employees
        company: any,
        existingSalary?: any,
        shouldSave: boolean = true,
        providedAdvances?: any[] // Optional: Passed cumulative state for sequential generation
    ) {
        // Calculate period dates based on employee's salary period configuration
        const { startDate, endDate, periodDays } = calculatePeriodDates(employee, period, company);

        // Get active advances for deduction
        // If providedAdvances is present, filter active from that state instead of DB
        let activeAdvances: AdvanceDeduction[];
        if (providedAdvances) {
            // Map raw advance state to AdvanceDeduction structure
            activeAdvances = providedAdvances
                .filter(a => (Number(a.remainingBalance) || 0) > 0)
                .map(a => ({
                    advanceId: (a.advanceId || a._id || a).toString(),
                    deductionAmount: Math.min(Number(a.monthlyDeduction) || 0, Number(a.remainingBalance) || 0),
                }));
        } else {
            activeAdvances = await getActiveAdvances(employee._id.toString(), period);
        }

        const totalAdvanceDeduction = calculateTotalAdvanceDeduction(activeAdvances);

        // Generate salary - always use new dailyRecords structure for attendance-based employees
        let generatedSalary;

        console.log(`[SalaryGen] Employee ${employee._id} calculationMethod: ${employee.calculationMethod || 'NOT SET (will use default)'}, name: ${employee.name}`);

        if (employee.calculationMethod === "attendance") {
            // Use new dailyRecords structure
            const newStructureSalary = await SalaryGenerationService.generateWithDailyRecords(
                employee._id.toString(),
                period,
                company._id.toString(),
                company.timezone || "Asia/Colombo"
            );

            // Add advance deductions and other fields
            generatedSalary = {
                ...newStructureSalary,
                advanceAmount: totalAdvanceDeduction,
                activeAdvances,
            };
        } else {
            // Use legacy structure for non-attendance employees
            // For these employees, employeeInOut should be properly typed
            if (existingSalary) {
                generatedSalary = await generateSalaryForOneEmployee(
                    employee,
                    period,
                    employeeInOut,
                    existingSalary,
                    company.timezone
                );
            } else {
                generatedSalary = await generateSalaryForOneEmployee(
                    employee,
                    period,
                    employeeInOut,
                    undefined,
                    company.timezone
                );
            }
        }

        if (generatedSalary && "message" in generatedSalary) {
            throw new BadRequestError(
                `Failed to generate salary for ${employee.name}: ${generatedSalary.message}`
            );
        }

        // Calculate work days (for display purposes)
        let workDays = periodDays;
        const salaryWithRecords = generatedSalary as any; // Type assertion for flexibility

        if (employee.calculationMethod === "attendance" && salaryWithRecords.dailyRecords) {
            // Count actual work days from dailyRecords
            workDays = salaryWithRecords.dailyRecords.filter((dr: any) => dr.workingHours > 0).length;
        } else if (employee.calculationMethod === "attendance" && salaryWithRecords.inOut) {
            // Count actual work days from inOut records (legacy)
            workDays = salaryWithRecords.inOut.filter((io: any) => io.workingHours > 0).length;
        } else if (employee.calculationMethod === "fixed_days") {
            // Calculate expected working days from shift settings
            workDays = calculateExpectedWorkingDays(employee, startDate, endDate);
        }

        // Calculate daily rate for the employee
        const dailyRate = calculateDailyRate(employee);

        // Calculate final salary (Net Earnings BEFORE advances)
        const finalSalary = generatedSalary.finalSalary || 0;

        console.log(`[Salary Service] Employee OT data:`, generatedSalary.ot);
        // Prepare enhanced salary data
        const enhancedSalaryData = {
            ...generatedSalary,
            // Flexible period support - use employee values or fallback to company defaults
            salaryPeriod: employee.salaryPeriod || company.salaryPeriodDefaults?.salaryPeriod || "monthly",
            periodStartDate: startDate,
            periodEndDate: endDate,
            periodDays,
            workDays,
            ratePerDay: dailyRate,
            rateDivisor: employee.rateDivisor || company.salaryPeriodDefaults?.rateDivisor || 30,
            calculationMethod: employee.calculationMethod || company.salaryPeriodDefaults?.calculationMethod || "fixed_days",

            // Salary totals
            advanceAmount: totalAdvanceDeduction,
            finalSalary, // Now stores "Before Advances" for consistency

            // Payment tracking initialization
            totalPaid: 0,
            outstandingBalance: finalSalary - totalAdvanceDeduction,
            activeAdvances: activeAdvances.map(adv => ({
                advanceId: adv.advanceId,
                deductedAmount: adv.deductionAmount
            })),
            paymentStatus: "unpaid" as const,
        };

        if (!shouldSave) {
            // Return preview data without saving
            // Add a temporary ID for frontend key purposes
            return {
                ...enhancedSalaryData,
                _id: existingSalary?._id || new mongoose.Types.ObjectId().toString(),
                preview: true // Flag to indicate this is a preview
            };
        }

        // Save or update salary
        let savedSalary;
        if (existingSalary) {
            // ROLLBACK previous advance deductions before updating
            if (existingSalary.activeAdvances && existingSalary.activeAdvances.length > 0) {
                const advancesForRollback = existingSalary.activeAdvances.map((a: any) => ({
                    advanceId: a.advanceId,
                    deductionAmount: a.deductedAmount
                }));
                await rollbackAdvanceDeductions(existingSalary._id.toString(), advancesForRollback);
            }

            savedSalary = await Salary.findByIdAndUpdate(
                existingSalary._id,
                enhancedSalaryData,
                { new: true }
            );
        } else {
            savedSalary = await Salary.create(enhancedSalaryData);
        }

        // Apply advance deductions to advance records
        if (activeAdvances.length > 0 && savedSalary) {
            await applyAdvanceDeductions(savedSalary._id.toString(), activeAdvances);
        }

        return savedSalary;
    }
}
