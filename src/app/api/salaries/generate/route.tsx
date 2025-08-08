import Company from "@/app/models/Company";
import dbConnect from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { options } from "../../auth/[...nextauth]/options";
import { z } from "zod";
import {
  generateSalaryForOneEmployee,
  RawInOut,
  ProcessedInOut,
} from "./salaryGeneration";
import Employee from "@/app/models/Employee";
import { checkPurchased } from "../../purchases/check/checkPurchased";
import Salary from "@/app/models/Salary";
import { initialInOutProcess } from "../initialInOutProcess";

const IdSchema = z.string().min(1, "ID is required");
const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Period must be in the format YYYY-MM");

// POST request handler
export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    IdSchema.parse(userId);

    const body = await req.json();
    let { employees, companyId, period, inOut, update, existingSalaries } =
      body;
    // Validate period
    periodSchema.parse(period);
    IdSchema.parse(companyId);

    if (!companyId) {
      return NextResponse.json(
        { message: "Company ID must be provided" },
        { status: 400 }
      );
    }

    let filter: { user?: string; _id?: string } = {
      user: userId,
      _id: companyId,
    };

    if (user?.role === "admin") {
      delete filter.user;
    }

    await dbConnect(); // Ensure database connection before any operations

    const company = await Company.findOne(filter);

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 400 }
      );
    }

    if (
      !(
        user?.role === "admin" &&
        (company.mode === "visit" || company.mode === "aided")
      )
    ) {
      const purchasedStatus = await checkPurchased(companyId, period);
      if (purchasedStatus !== "approved") {
        return NextResponse.json(
          {
            message: `Month not Purchased for ${period}. Purchase is ${purchasedStatus}`,
          },
          { status: 400 }
        );
      }
    }

    // Find all active employees of the company if employees are not given
    if (!employees) {
      employees = await Employee.find({
        company: companyId,
        active: true,
      });
    } else {
      employees = await Employee.find({
        _id: { $in: employees },
        company: companyId,
      });
    }

    // If no employees
    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { message: "No active employees found for the company" },
        { status: 400 }
      );
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
        return NextResponse.json(
          {
            message: `InOut required for calculated OT: ${employee.name}`,
          },
          { status: 400 }
        );
      }
    }

    const employeeIds = employees.map((e: { _id: any }) => e._id);
    const existingSalariesFromDB = await Salary.find({
      employee: { $in: employeeIds },
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
        employee: {
          index: any;
          openHours: any;
          overrides: {
            shifts: any;
            probabilities: any;
            workingDays: any;
            paymentStructure: any;
            calendar: any;
          };
          shifts: any;
          probabilities: any;
          workingDays: any;
          paymentStructure: any;
          calendar: any;
          _id: string | number;
        },
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

    return NextResponse.json({ salaries, exists });
  } catch (error) {
    console.log(error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      );
    }

    // Handle general errors
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
