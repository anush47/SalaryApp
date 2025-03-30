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
    const salaries = [];
    const exists = [];

    const inOutInitial = initialInOutProcess(inOut);

    // check if company has openHours
    const openHours = company.openHours;

    for (const [index, employee] of employees.entries()) {
      //add index to employee
      employee.index = index;
      //if openHours is available add to employee
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

      const existingSalary = await Salary.findOne({
        employee: employee._id,
        period: period,
      });

      if (existingSalary && !update) {
        exists.push(employee._id);
        continue; // Skip this employee if salary already exists and update is not requested
      }

      // Check if the `inOutInitial` for the employee is RawInOut or ProcessedInOut
      const employeeInOut = update
        ? (inOutInitial as ProcessedInOut)
        : (inOutInitial as { [employeeId: string]: RawInOut })[employee._id];

      //if employee otMethod is calc and inOut is not available return error
      if (employee.otMethod === "calc" && !employeeInOut) {
        return NextResponse.json(
          {
            message: `InOut required for calculated OT: ${employee.name}`,
          },
          { status: 400 }
        );
      }

      if (!update) {
        // If inOutInitial is RawInOut (array of Dates), generate salary using RawInOut
        const generatedSalary = await generateSalaryForOneEmployee(
          employee,
          period,
          employeeInOut as RawInOut
        );
        salaries.push(generatedSalary);
      } else if (update) {
        const existingSalary = existingSalaries?.find(
          (s: { employee: any }) =>
            s.employee.toString() === employee._id.toString()
        );

        // If update is true and inOutInitial is ProcessedInOut, generate salary using ProcessedInOut
        const generatedSalary = await generateSalaryForOneEmployee(
          employee,
          period,
          employeeInOut as ProcessedInOut,
          existingSalary
        );
        salaries.push(generatedSalary);
      }
    }

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
