import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import { options } from "../auth/[...nextauth]/options";
import Employee from "@/app/models/Employee";
import Salary from "@/app/models/Salary";
import { checkPurchased } from "../purchases/check/checkPurchased";

const noPaySchema = z.object({
  amount: z.number().min(0, "No Pay amount must be a positive number"),
  reason: z.string().optional(),
});

const otSchema = z.object({
  amount: z.number().min(0, "Overtime amount must be a positive number"),
  reason: z.string().optional(),
});

const paymentStructureSchema = z.object({
  additions: z.array(
    z.object({
      name: z.string().min(1, "Addition name is required"),
      amount: z.number().min(0, "Addition amount must be a positive number"),
      affectTotalEarnings: z.boolean().optional(),
    })
  ),
  deductions: z.array(
    z.object({
      name: z.string().min(1, "Deduction name is required"),
      amount: z.number().min(0, "Deduction amount must be a positive number"),
      affectTotalEarnings: z.boolean().optional(),
    })
  ),
});

const salarySchema = z.object({
  id: z.string().optional(),
  employee: z.string().min(1, "Employee ID is required"),
  period: z.string().min(1, "Period is required"),
  basic: z.number().min(1, "Basic salary is required"),
  holidayPay: z.number().optional(),
  noPay: noPaySchema,
  ot: otSchema,
  paymentStructure: paymentStructureSchema,
  inOut: z
    .array(
      z.object({
        in: z.string().datetime().optional(),
        out: z.string().datetime().optional(),
        workingHours: z
          .number()
          .min(0, "Working hours must be a positive number")
          .optional(),
        otHours: z
          .number()
          .min(0, "OT hours must be a positive number")
          .optional(),
        ot: z.number().min(0, "OT amount must be a positive number").optional(),
        noPay: z
          .number()
          .min(0, "No Pay amount must be a positive number")
          .optional(),
        holiday: z.string().optional(),
        description: z.string().optional(),
        remark: z.string().optional(),
        day_status: z.string().optional(),
      })
    )
    .optional(),
  advanceAmount: z.number().optional(), // Optional field
  finalSalary: z.number().min(0, "Final salary must be a positive number"),
  remark: z.string().optional(),
});

//period schema
const periodSchema = z.string();

// GET: Fetch a Salary
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }
    await dbConnect();

    const salaryId = req.nextUrl.searchParams.get("salaryId");
    let companyId = req.nextUrl.searchParams.get("companyId");
    let period = req.nextUrl.searchParams.get("period");
    const employeeId = req.nextUrl.searchParams.get("employee");

    if (period) {
      period = periodSchema.parse(period);
    }

    if (!companyId && !salaryId && !employeeId) {
      return NextResponse.json(
        { message: "Company ID, salary ID, or employee ID is required" },
        { status: 400 }
      );
    }

    if (employeeId) {
      // Security check: Ensure the logged-in user is the employee themselves
      if (user?.role === "employee") {
        const employee = await Employee.findOne({ user: userId });
        if (String(employee?._id) !== employeeId) {
          return NextResponse.json(
            { message: "Access denied. You can only view your own salaries." },
            { status: 403 }
          );
        }
      }

      const salaries = await Salary.find({
        employee: employeeId,
        ...(period ? { period } : {}),
      }).select("+inOut").lean();

      return NextResponse.json({ salaries });
    }

    if (salaryId) {
      // Fetch one salary by ID
      const salary = await Salary.findById(salaryId);
      if (!salary) {
        return NextResponse.json(
          { message: "Salary not found" },
          { status: 404 }
        );
      }
      // Get company from employeeId and add company id
      const employee = await Employee.findById(salary.employee);
      companyId = employee?.company;
      const filter: {
        user?: string;
        _id: string;
      } = {
        user: userId,
        _id: companyId as string,
      };
      if (user?.role === "admin") {
        delete filter.user;
      }
      const company = await Company.findOne(filter);
      if (!company) {
        return NextResponse.json(
          { message: "Access denied." },
          { status: 403 }
        );
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
      return NextResponse.json({ salary: enrichedSalary });
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
      if (user?.role === "admin") {
        // Fetch all employees for admin
        employees = await Employee.find({})
          .select("_id name memberNo nic company basic divideBy")
          .lean();
        companies = await Company.find({}).select("_id name employerNo").lean();
      } else {
        // Fetch all employees of companies associated with the user
        companies = await Company.find({ user: userId })
          .select("_id name employerNo")
          .lean();
        const companyIds = companies.map((company) => company._id);
        employees = await Employee.find({ company: { $in: companyIds } })
          .select("_id name memberNo nic company")
          .lean();
      }

      // Enrich employees with company details
      employees = employees.map((employee) => {
        const company = companies.find(
          (comp) => String(comp._id) === String(employee.company)
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
        user: userId,
        _id: companyId as string,
      };

      if (user?.role === "admin") {
        delete filter.user;
      }

      const company = await Company.findOne(filter);
      if (!company) {
        return NextResponse.json(
          { message: "Access denied." },
          { status: 403 }
        );
      }

      employees = await Employee.find({ company: companyId })
        .select("_id name memberNo nic")
        .lean();
    }

    // Extract the list of IDs (just the _id values)
    const employeeIdList = employees.map((emp) => emp._id);

    // Fetch salaries of employees with those IDs and remove inOut
    const salaries = await Salary.find(
      { employee: { $in: employeeIdList }, ...(period ? { period } : {}) },
      { inOut: 0 }
    );

    // Enrich the salary records with employee details
    const enrichedSalaries = salaries.map((salary) => {
      const employee = employees.find(
        (emp) => String(emp._id) === String(salary.employee)
      );
      return {
        ...salary._doc,
        name: employee?.name,
        memberNo: employee?.memberNo,
        nic: employee?.nic,
        companyName: employee?.companyName,
        companyEmployerNo: employee?.companyEmployerNo,
        companyId: employee?.company,
        divideBy: employee?.divideBy,
      };
    });

    // Send salaries
    return NextResponse.json({ salaries: enrichedSalaries });
  } catch (error: any) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.errors[0].message
            : "An unexpected error occurred",
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// POST: Create new Salaries
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await req.json();

    if (!Array.isArray(body.salaries)) {
      return NextResponse.json(
        { message: "Salaries must be an array" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Initialize an array to hold valid salary objects
    const salaryDocs = [];
    //console.log(body.salaries);

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
      const parsedSalary = salarySchema.parse(salary);

      // Fetch employee for validation
      const employee = await Employee.findById(parsedSalary.employee);
      if (!employee) {
        return NextResponse.json(
          { message: `Employee not found for salary ${parsedSalary.employee}` },
          { status: 404 }
        );
      }

      // Check if salary already exists for this period and employee
      const existingSalary = await Salary.findOne({
        employee: parsedSalary.employee,
        period: parsedSalary.period,
      });
      if (existingSalary) {
        return NextResponse.json(
          {
            message: `Salary already exists for employee ${employee.name} in period ${parsedSalary.period}`,
          },
          { status: 400 }
        );
      }

      // Check for company access and purchased status
      const filter: { user?: string; _id: string } = {
        user: userId,
        _id: employee.company,
      };
      if (user?.role === "admin") {
        delete filter.user;
      }
      const company = await Company.findOne(filter);
      if (!company) {
        return NextResponse.json(
          { message: "Access denied." },
          { status: 403 }
        );
      }

      if (
        !(
          user?.role === "admin" &&
          (company.mode === "visit" || company.mode === "aided")
        )
      ) {
        const purchasedStatus = await checkPurchased(
          employee.company,
          parsedSalary.period
        );
        if (purchasedStatus !== "approved") {
          return NextResponse.json(
            {
              message: `${parsedSalary.period} not Purchased for ${company.name}. Purchase is ${purchasedStatus}`,
            },
            { status: 400 }
          );
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

    return NextResponse.json({
      message: `${salaryDocs.length} Salary records created successfully`,
    });
  } catch (error: any) {
    console.log(error);
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.errors[0].message
            : "An unexpected error occurred",
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// PUT: Update an existing salary
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // parse the request body
    const body = await req.json();
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
    const parsedBody = salarySchema.parse(body);

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

    await dbConnect();

    //get employee.company from employee
    const employee = await Employee.findById(parsedBody.employee).select(
      "company"
    );

    let filter: { user?: string; _id: string } = {
      user: userId,
      _id: employee.company,
    };

    if (user.role === "admin") {
      delete filter.user;
    }

    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    // Check if mode is visit or aided and user is not admin
    if (
      user.role !== "admin" &&
      (company.mode === "visit" || company.mode === "aided")
    ) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const existingSalary = await Salary.findById(parsedBody.id);
    if (!existingSalary) {
      return NextResponse.json(
        { message: "Salary not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { message: "Failed to update salary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Salary updated successfully",
      salaries: updatedSalaries,
    });
  } catch (error: any) {
    //console.log(error);
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.errors[0].message
            : "An unexpected error occurred",
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// DELETE: Delete existing salaries
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const { salaryIds } = await req.json();
    if (!Array.isArray(salaryIds) || salaryIds.length === 0) {
      return NextResponse.json(
        { message: "Array of salary IDs is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Local cache for companies and employees
    const companyCache = new Map();

    // Fetch all employees related to the salaries
    const salaries = await Salary.find({ _id: { $in: salaryIds } }).select(
      "employee"
    );
    if (salaries.length === 0) {
      return NextResponse.json(
        { message: "No salaries found for the provided IDs" },
        { status: 404 }
      );
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
          user: userId,
          _id: companyId,
        };
        if (user.role === "admin") {
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
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    //if admin
    if (user.role === "admin") {
      // Delete all salaries in one operation
      const deleteResult = await Salary.deleteMany({ _id: { $in: salaryIds } });

      if (deleteResult.deletedCount === 0) {
        return NextResponse.json(
          { message: "No salaries were deleted" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { message: "Salaries deleted successfully" },
        { status: 200 }
      );
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
        return NextResponse.json(
          {
            message: `You are not allowed to delete Salaries for employees in ${companiesAidedOrVisit
              .map((company) => company.name)
              .join(", ")}.`,
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { message: "Salaries deleted successfully" },
          { status: 200 }
        );
      }
    }
  } catch (error: any) {
    console.error("Error deleting salaries:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
