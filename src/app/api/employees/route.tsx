import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Adjust import as needed
import { z } from "zod";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import { options } from "../auth/[...nextauth]/options";
import Company from "@/app/models/Company";
import { calculateMonthlyPrice } from "../purchases/price/priceUtils";

// Define schema for validation
const userIdSchema = z.string().min(1, "User ID is required");
const employeeIdSchema = z.string().min(1, "Employee ID is required");

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    // Get the employeeId from URL
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    // Get the companyId from URL
    const companyId = req.nextUrl.searchParams.get("companyId");

    //if both are not present
    if (!employeeId && !companyId) {
      return NextResponse.json(
        { message: "Employee ID or Company ID is required" },
        { status: 400 }
      );
    }

    // Connect to the database
    await dbConnect();

    if (employeeId) {
      // Fetch employee from the database
      const employee = await Employee.findById(employeeId); // Use .lean() for better performance

      // Create filter
      const filter: { user?: string; _id: string } = {
        user: userId,
        _id: employee?.company,
      };
      if (user?.role === "admin") {
        // Remove user from filter
        delete filter.user;
      }

      const company = await Company.findOne(filter);
      if (!company) {
        return NextResponse.json(
          {
            message: "Access denied. You cannot add employees to this company.",
          },
          { status: 403 }
        );
      }

      // Return the employee data
      return NextResponse.json({ employees: [employee] });
    } else if (companyId) {
      // Fetch employees from the database
      let employees = [];
      let companies = [];
      let companyFilter = {};
      let filter = {};

      if (user?.role === "admin") {
        // Admin can see all employees
        if (companyId === "all") {
          // Admin can see all employees of all companies
          filter = {};
          companies = await Company.find({})
            .select("_id name employerNo")
            .lean();
        } else {
          // Admin can see employees of a specific company
          filter = { company: companyId };
          companyFilter = { _id: companyId };
          companies = await Company.find(companyFilter)
            .select("_id name employerNo")
            .lean();
        }
      } else {
        // User can see employees of user's companies
        if (companyId === "all") {
          // User can see employees of all their companies
          companyFilter = { user: userId };
          companies = await Company.find(companyFilter)
            .select("_id name employerNo")
            .lean();
          filter = { company: { $in: companies.map((c) => c._id) } };
        } else {
          filter = { company: companyId };
          companyFilter = { user: userId, _id: companyId };
          companies = await Company.find(companyFilter)
            .select("_id name employerNo")
            .lean();
        }
      }
      // Check if company exists without fetching data
      const companyExists = await Company.exists(companyFilter);
      if (!companyExists) {
        return NextResponse.json(
          { message: "Company not found" },
          { status: 404 }
        );
      }
      // Find employees based on the filter
      employees = await Employee.find(filter).lean();
      // Enrich employees with company details
      employees.forEach((employee) => {
        const company = companies.find(
          (comp) => String(comp._id) === String(employee.company)
        );
        employee.companyName = company?.name;
        employee.companyEmployerNo = company?.employerNo;
      });
      // Return enriched employees
      return NextResponse.json({ employees });
    }
  } catch (error) {
    // Handle Zod validation errors
    console.log(error);
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

// Define the schema for employee validation
const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  memberNo: z.number().min(1, "Member number is required"),
  nic: z
    .string()
    .regex(
      /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
      "NIC must be a valid format (e.g., 123456789V or 123456789012)"
    ),
  basic: z.number().min(1, "Basic salary is required"),
  totalSalary: z.union([z.string(), z.number(), z.null()]),
  divideBy: z.union([z.literal(240), z.literal(200)]).default(240),
  designation: z.string().optional(),
  remark: z.string().optional(),
  otMethod: z.string(),
  startedAt: z.string().optional(),
  active: z.boolean().default(true),
  workingDays: z
    .object({
      mon: z.string().optional(),
      tue: z.string().optional(),
      wed: z.string().optional(),
      thu: z.string().optional(),
      fri: z.string().optional(),
      sat: z.string().optional(),
      sun: z.string().optional(),
    })
    .optional(),
  shifts: z
    .array(
      z.object({
        start: z.string().min(1, "Start time is required"),
        end: z.string().min(1, "End time is required"),
        break: z.number().optional().default(0),
      })
    )
    .optional(),
  probabilities: z
    .object({
      workOnOff: z.number().optional(),
      workOnHoliday: z.number().optional(),
      absent: z.number().optional(),
      late: z.number().optional(),
      ot: z.number().optional(),
    })
    .optional(),
  paymentStructure: z
    .object({
      additions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
      deductions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
    })
    .optional(),
  company: z.string().length(24, "Company ID must be a valid ObjectId"),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be a valid 10")
    .optional(),
  email: z.string().email("Email must be a valid email").optional(),
  address: z.string().optional(), // Add this line
  overrides: z
    .object({
      shifts: z.boolean(),
      workingDays: z.boolean(),
      probabilities: z.boolean(),
      paymentStructure: z.boolean(),
      calendar: z.boolean(),
    })
    .default({
      shifts: false,
      workingDays: false,
      probabilities: false,
      paymentStructure: false,
      calendar: false,
    }),
  calendar: z.enum(["default", "other"]).optional().default("default"),
});

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    //trim name and nic
    body.name = body.name.trim();
    body.nic = body.nic.trim();
    //capitalize nic and name
    body.name = body.name.toUpperCase();
    body.nic = body.nic.toUpperCase();

    // Convert to int
    body.memberNo = parseInt(body.memberNo);
    body.basic = parseFloat(body.basic);
    //email phone number and address if ""
    if (body.email === "") {
      delete body.email;
    }
    if (body.phoneNumber === "") {
      delete body.phoneNumber;
    }
    if (body.address === "") {
      delete body.address;
    }

    const parsedBody = employeeCreateSchema.parse(body);

    // Connect to the database
    await dbConnect();

    // Create filter
    const filter: { user?: string; _id: string } = {
      user: userId,
      _id: parsedBody.company,
    };
    if (user?.role === "admin") {
      // Remove user from filter
      delete filter.user;
    } else {
      //delete probabilities
      delete parsedBody.probabilities;
      // if ot method is random show error
      if (parsedBody.otMethod === "random") {
        return NextResponse.json(
          { message: "OT method cannot be random" },
          { status: 400 }
        );
      }
    }

    // Find the company by ID to ensure it exists and belongs to the user
    const company = await Company.findById(parsedBody.company);
    if (!company) {
      return NextResponse.json(
        { message: "Access denied. You cannot add employees to this company." },
        { status: 403 }
      );
    }

    // Check if the company is in visit mode or aided mode if not an admin
    if (
      user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      return NextResponse.json(
        {
          message: "You are not allowed to add employees to this company",
        },
        { status: 403 }
      );
    }

    // Check if the memberNo already exists within the company
    const employees = await Employee.find({ company: parsedBody.company });
    for (let i = 0; i < employees.length; i++) {
      if (employees[i].memberNo === parsedBody.memberNo) {
        return NextResponse.json(
          { message: "Employee with this member number already exists" },
          { status: 400 }
        );
      }
    }

    // Create and save the new employee
    const newEmployee = new Employee({
      ...parsedBody,
      user: company.user,
    });
    await newEmployee.save();

    // Count the number of employees in the company
    // Count the total and active employees in the company
    if (!company?.monthlyPriceOverride) {
      const [employeeCount, activeEmployeeCount] = await Promise.all([
        Employee.countDocuments({ company: parsedBody.company }),
        Employee.countDocuments({ company: parsedBody.company, active: true }),
      ]);
      const price = calculateMonthlyPrice(
        company,
        employeeCount,
        activeEmployeeCount
      );
      if (price !== company.monthlyPrice) {
        // Update the company's monthly price if it has changed
        company.monthlyPrice = price;
        await company.save();
      }
    }

    // Return success response
    return NextResponse.json({ message: "Employee added successfully" });
  } catch (error) {
    // Handle Zod validation errors
    console.log(error);
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

// Define schema for employee update
const employeeUpdateSchema = z.object({
  _id: z.string().min(1, "Employee ID is required"),
  name: z.string().min(1, "Employee name is required"),
  memberNo: z.number().min(1, "Member number is required"),
  nic: z
    .string()
    .regex(
      /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
      "NIC must be a valid format (e.g., 123456789V or 123456789012)"
    )
    .optional(),
  divideBy: z.union([z.literal(240), z.literal(200)]).default(240),
  active: z.boolean().default(true),
  basic: z.number().min(0, "Basic salary must be a positive number"),
  totalSalary: z.union([z.string(), z.number(), z.null()]),
  startedAt: z.string().optional(), // Assuming the date format is "DD-MM-YYYY"
  resignedAt: z.string().optional(), // Assuming the date format is "DD-MM-YYYY"
  company: z.string().min(1, "Company ID is required"),
  designation: z.string().optional(),
  remark: z.string().optional(),
  otMethod: z.string(),
  overrides: z
    .object({
      shifts: z.boolean().optional(),
      workingDays: z.boolean().optional(),
      probabilities: z.boolean().optional(),
      paymentStructure: z.boolean().optional(),
      calendar: z.boolean().optional(),
    })
    .optional(),
  probabilities: z
    .object({
      workOnOff: z.number().optional(),
      workOnHoliday: z.number().optional(),
      absent: z.number().optional(),
      late: z.number().optional(),
      ot: z.number().optional(),
    })
    .optional(),
  workingDays: z
    .object({
      mon: z.string(),
      tue: z.string(),
      wed: z.string(),
      thu: z.string(),
      fri: z.string(),
      sat: z.string(),
      sun: z.string(),
    })
    .optional(),
  shifts: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
        break: z
          .number()
          .min(0, "Break time must be a positive number")
          .optional(),
      })
    )
    .optional(),
  paymentStructure: z
    .object({
      additions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
      deductions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
    })
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be a valid")
    .optional(),
  email: z.string().email("Email must be a valid email").optional(),
  address: z.string().optional(),
  calendar: z.enum(["default", "other"]).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    //trim name and nic
    body.name = body.name.trim();
    body.nic = body.nic.trim();
    //capitalize nic and name
    body.name = body.name.toUpperCase();
    body.nic = body.nic.toUpperCase();

    //convert to number
    body.memberNo = parseInt(body.memberNo);
    body.basic = parseFloat(body.basic);
    //email phone number and address if ""
    if (body.email === "") {
      delete body.email;
    }
    if (body.phoneNumber === "") {
      delete body.phoneNumber;
    }
    if (body.address === "") {
      delete body.address;
    }

    const parsedBody = employeeUpdateSchema.parse(body);

    // Connect to the database
    await dbConnect();

    // Create filter
    const filter: { user?: string; _id: string } = {
      user: userId,
      _id: parsedBody?.company,
    };
    if (user?.role === "admin") {
      // Remove user from filter
      delete filter.user;
    } else {
      //remove probabilities
      delete parsedBody.probabilities;
      // if otmethod is random show error
      if (parsedBody.otMethod === "random") {
        return NextResponse.json(
          { message: "OT method cannot be random" },
          { status: 400 }
        );
      }
    }

    // Find the company by ID to ensure it exists and belongs to the user
    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json(
        {
          message:
            "Access denied. You cannot update employees in this company.",
        },
        { status: 403 }
      );
    }

    // Check if the company is in visit mode or aided mode if not an admin
    if (
      user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      return NextResponse.json(
        {
          message: "You are not allowed to update employees in this company",
        },
        { status: 403 }
      );
    }

    // Find the existing employee
    const existingEmployee = await Employee.findById(parsedBody._id);
    if (!existingEmployee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if the updated memberNo is unique within the company
    const employees = await Employee.find({
      company: parsedBody.company,
      _id: { $ne: parsedBody._id }, // Exclude the current employee being updated
    });
    for (const employee of employees) {
      if (employee.memberNo === parsedBody.memberNo) {
        return NextResponse.json(
          { message: "Employee with this member number already exists" },
          { status: 400 }
        );
      }
    }
    const updateData = { ...parsedBody };
    const unsetFields: Record<string, number> = {};
    // Handle field updates and unsetting
    if (!parsedBody.overrides?.shifts) unsetFields.shifts = 1;
    if (!parsedBody.overrides?.workingDays) unsetFields.workingDays = 1;
    if (!parsedBody.overrides?.probabilities) unsetFields.probabilities = 1;
    if (!parsedBody.overrides?.paymentStructure)
      unsetFields.paymentStructure = 1;
    if (!parsedBody.overrides?.calendar) unsetFields.calendar = 1;

    // Remove fields from updateData if they are to be unset
    Object.keys(unsetFields).forEach((field) => {
      delete (updateData as Record<string, unknown>)[field];
    });

    // Update the employee in the database
    const updatedEmployee = await Employee.findByIdAndUpdate(
      parsedBody._id,
      {
        ...updateData,
        ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }), // Add $unset only if needed
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedEmployee) {
      return NextResponse.json(
        { message: "Failed to update employee" },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({ message: "Employee updated successfully" });
  } catch (error) {
    // Handle Zod validation errors
    console.log(error);
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

//delete employee
export async function DELETE(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    // Parse request body
    const body = await req.json();
    const employeeId = body.employeeId;

    // Validate employeeId
    employeeIdSchema.parse(employeeId);

    // Connect to the database
    await dbConnect();

    // Find the employee to delete
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Create filter
    const filter = { user: userId, _id: employee?.company };
    if (user?.role === "admin") {
      // Remove user from filter
      delete filter?.user;
    }
    // Find the company to ensure it belongs to the user
    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json(
        {
          message:
            "Access denied. You cannot delete employees in this company.",
        },
        { status: 403 }
      );
    }
    //if company is in visit mode or aided mode
    if (
      user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      return NextResponse.json(
        {
          message: "You are not allowed to delete employees in this company",
        },
        { status: 403 }
      );
    }

    // Delete the employee from the database
    await Employee.findByIdAndDelete(employeeId);

    // Update the company's monthly price if needed
    if (!company?.monthlyPriceOverride) {
      const [employeeCount, activeEmployeeCount] = await Promise.all([
        Employee.countDocuments({ company: company._id }),
        Employee.countDocuments({ company: company._id, active: true }),
      ]);
      const price = calculateMonthlyPrice(
        company,
        employeeCount,
        activeEmployeeCount
      );
      if (price !== company.monthlyPrice) {
        // Update the company's monthly price if it has changed
        company.monthlyPrice = price;
        await company.save();
      }
    }

    // Return success response
    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
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
