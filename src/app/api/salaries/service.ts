import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Salary from "@/app/models/Salary";
import { checkPurchased } from "../purchases/check/checkPurchased";
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
import {
    generateSalaryForOneEmployee,
    RawInOut,
    ProcessedInOut,
} from "./generate/salaryGeneration";
import { initialInOutProcess } from "./initialInOutProcess";

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
            _id: string;
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

            return { salaries };
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

        if (companyId === "all") {
            let companies = [];
            if (context.user?.role === "admin") {
                // Fetch all employees for admin
                employees = (await Employee.find({})
                    .select("_id name memberNo nic company basic divideBy")
                    .lean()).map(employee => ({
                        ...employee,
                        _id: (employee._id as any).toString(),
                    })) as any;
                companies = (await Company.find({}).select("_id name employerNo").lean()).map(company => ({
                    ...company,
                    _id: (company._id as any).toString(),
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
                employees = (await Employee.find({ company: { $in: companyIds } })
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
            const filter: { user?: string; _id: string } = {
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

            employees = (await Employee.find({ company: companyId })
                .select("_id name memberNo nic")
                .lean()).map(employee => ({
                    ...employee,
                    _id: (employee._id as any).toString(),
                })) as any;
        }

        // Extract the list of IDs (just the _id values)
        const employeeIdList = employees.map((emp) => emp._id);

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

        return {
            data: enrichedSalaries,
            page,
            limit,
            total
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
            const filter: { user?: string; _id: string } = {
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
                const purchasedStatus = await checkPurchased(
                    employee.company,
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

            // Add the parsed salary to the array
            salaryDocs.push(parsedSalary);
        }

        // Use insertMany to save all salary documents efficiently
        if (salaryDocs.length > 0) {
            await Salary.insertMany(salaryDocs);
        }

        return {
            message: `${salaryDocs.length} Salary records created successfully`,
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

        const parsedBody = salaryUpdateSchema.parse(body);

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

        //get employee.company from employee
        const employee = await Employee.findById(parsedBody.employee).select(
            "company"
        );

        let filter: { user?: string; _id: string } = {
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

        // Check if mode is visit or aided and user is not admin
        if (
            context.user?.role !== "admin" &&
            (company.mode === "visit" || company.mode === "aided")
        ) {
            throw new ForbiddenError("Access denied.");
        }

        const existingSalary = await Salary.findById(parsedBody.id);
        if (!existingSalary) {
            throw new NotFoundError("Salary not found");
        }

        const updatedSalaries = await Salary.findByIdAndUpdate(
            parsedBody.id,
            parsedBody,
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!updatedSalaries) {
            throw new Error("Failed to update salary");
        }

        return {
            message: "Salary updated successfully",
            salaries: updatedSalaries,
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
                const filter: { user?: string; _id: string } = {
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
            // Delete all salaries in one operation
            const deleteResult = await Salary.deleteMany({ _id: { $in: salaryIds } });

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
            await Salary.deleteMany({
                _id: { $in: salaryIds },
                employee: {
                    $nin: employeesAidedOrVisit.map((employee) => employee._id),
                },
            });
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
        let { employees: employeeIds, companyId, period, inOut, update, existingSalaries } = parsedBody;

        let filter: { user?: string; _id?: string } = {
            user: context.user?.id,
            _id: companyId,
        };

        if (context.user?.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);

        if (!company) {
            throw new NotFoundError("Company not found");
        }

        if (
            !(
                context.user?.role === "admin" &&
                (company.mode === "visit" || company.mode === "aided")
            )
        ) {
            const purchasedStatus = await checkPurchased(companyId, period);
            if (purchasedStatus !== "approved") {
                throw new BadRequestError(`Month not Purchased for ${period}. Purchase is ${purchasedStatus}`);
            }
        }

        // Find all active employees of the company if employees are not given
        let employees;
        if (!employeeIds) {
            employees = await Employee.find({
                company: companyId,
                active: true,
            });
        } else {
            employees = await Employee.find({
                _id: { $in: employeeIds },
                company: companyId,
            });
        }

        // If no employees
        if (!employees || employees.length === 0) {
            throw new NotFoundError("No active employees found for the company");
        }

        // Generate salary for all employees
        const inOutInitial = initialInOutProcess(inOut, employees);

        const openHours = company.openHours;

        // Pre-check for employees with calculated OT but no InOut data
        for (const employee of employees) {
            const employeeInOut = update
                ? (inOutInitial as ProcessedInOut)
                : (inOutInitial as { [employeeId: string]: RawInOut })[employee._id];

            if (employee.otMethod === "calc" && !employeeInOut) {
                throw new BadRequestError(`InOut required for calculated OT: ${employee.name}`);
            }
        }

        const empIds = employees.map((e: { _id: any }) => e._id);
        const existingSalariesFromDB = await Salary.find({
            employee: { $in: empIds },
            period: period,
        });
        const existingSalariesMap = new Map(
            existingSalariesFromDB.map((s: { employee: { toString: () => any } }) => [
                s.employee.toString(),
                s,
            ])
        );

        const salaryPromises = employees.map(
            async (
                employee: any,
                index: any
            ) => {
                employee.index = index;
                if (openHours) {
                    employee.openHours = openHours;
                }

                // Set individual properties if no overrides, otherwise use overrides
                if (!employee.overrides?.shifts) {
                    employee.shifts = company.shifts;
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

                const existingSalary = existingSalariesMap.get(employee._id.toString());

                if (existingSalary && !update) {
                    return { exists: employee._id, salary: null };
                }

                const employeeInOut = update
                    ? (inOutInitial as ProcessedInOut)
                    : (inOutInitial as { [employeeId: string]: RawInOut })[employee._id];

                if (!update) {
                    const generatedSalary = await generateSalaryForOneEmployee(
                        employee,
                        period,
                        employeeInOut as RawInOut
                    );
                    return { salary: generatedSalary, exists: null };
                } else {
                    const existingSalaryForUpdate = existingSalaries?.find(
                        (s: { employee: any }) =>
                            s.employee.toString() === employee._id.toString()
                    );
                    const generatedSalary = await generateSalaryForOneEmployee(
                        employee,
                        period,
                        employeeInOut as ProcessedInOut,
                        existingSalaryForUpdate
                    );
                    return { salary: generatedSalary, exists: null };
                }
            }
        );

        const results = await Promise.all(salaryPromises);

        const salaries = results.filter((r) => r && r.salary).map((r) => r.salary);
        const exists = results.filter((r) => r && r.exists).map((r) => r.exists);

        return { salaries, exists };
    }
}
