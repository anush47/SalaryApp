import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/db";
import { getServerSession } from "next-auth";
import Company from "@/app/models/Company";
import { options } from "../auth/[...nextauth]/options";
import { z } from "zod";
import Employee from "@/app/models/Employee";
import { calculateMonthlyPrice } from "../purchases/price/priceUtils";

// Define schema for validation
const userIdSchema = z.string().min(1, "User ID is required");
const companyIdSchema = z.string().min(1, "Company ID is required");

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    //get the companyId from url
    const companyId = req.nextUrl.searchParams.get("companyId");

    //get is userNeeded from url
    const isUserNeeded = req.nextUrl.searchParams.get("needUsers");

    // Create filter
    const filter: {
      user?: string;
      _id?: string;
    } = { user: userId };
    if (user?.role === "admin") {
      // Remove user from filter
      delete filter.user;
    }
    if (companyId) {
      filter._id = companyId;
    }

    // Connect to the database
    await dbConnect();

    if (companyId) {
      // Fetch company from the database
      const company = await Company.findOne(filter).lean(); // Use .lean() for better performance
      // Return the company data
      return NextResponse.json({ companies: [company] });
    } else {
      // Fetch companies from the database
      let companies;

      if (isUserNeeded) {
        companies = await Company.find(filter)
          .populate("user", "name email") // Use populate to include user details
          .lean();
      } else {
        companies = await Company.find(filter).lean();
      }
      if (!companies) {
        return NextResponse.json(
          { message: "Companies not found" },
          { status: 404 }
        );
      }

      // Add the number of employees for each company in a single batch operation
      const companyIds = companies.map((company) => company._id);

      // Get employee counts in bulk for all companies
      const employeeCounts = await Employee.aggregate([
        { $match: { company: { $in: companyIds }, active: true } },
        { $group: { _id: "$company", count: { $sum: 1 } } },
      ]);

      // Create a mapping of companyId to employee count
      const employeeCountMap = employeeCounts.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {});

      // Add employee counts to companies
      const companiesWithEmployeeCount = companies.map((company) => ({
        ...company,
        noOfEmployees: employeeCountMap[company._id as string] || 0, // Default to 0 if no employees
      }));

      // Return the response
      return NextResponse.json({ companies: companiesWithEmployeeCount });
    }
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

// Define schema for company creation
const companyCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employerNo: z
    .string()
    .min(1, "Employer Number is required")
    .regex(/^[A-Z]\/\d{5}$/, "Employer Number must match the pattern A/12345"),
  address: z.string().optional(),
  startedAt: z.string().optional(),
  paymentMethod: z.string().optional(),
  monthlyPrice: z.number(),
  monthlyPriceOverride: z.boolean(),
  requiredDocs: z.object({
    epf: z.boolean(),
    etf: z.boolean(),
    salary: z.boolean(),
    paySlip: z.boolean(),
  }),
  workingDays: z.object({
    mon: z.string().optional(),
    tue: z.string().optional(),
    wed: z.string().optional(),
    thu: z.string().optional(),
    fri: z.string().optional(),
    sat: z.string().optional(),
    sun: z.string().optional(),
  }),
  active: z.boolean().default(true),
  employerName: z.string().optional(),
  employerAddress: z.string().optional(),
  openHours: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    allDay: z.boolean().optional(),
  }),
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
    //setMonthlyPrice
    body.monthlyPrice = calculateMonthlyPrice(null, 0, 0);
    body.monthlyPriceOverride = false;
    body.workingDays = {
      mon: "full",
      tue: "full",
      wed: "full",
      thu: "full",
      fri: "full",
      sat: "half",
      sun: "off",
    };
    body.requiredDocs = {
      epf: true,
      etf: true,
      salary: true,
      paySlip: true,
    };
    const parsedBody = companyCreateSchema.parse(body);

    // Connect to the database
    await dbConnect();

    // Create new company
    const newCompany = new Company({
      ...parsedBody,
      user: userId,
    });

    // Save the new company to the database
    await newCompany.save();

    // Return success response
    return NextResponse.json({ message: "Company added successfully" });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      );
    }

    //duplicate error
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { message: "Company with this Employer Number already exists" },
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

// Define schema for company update
const companyUpdateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  employerNo: z.string().min(1, "Employer number is required"),
  address: z.string().optional(),
  paymentMethod: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  monthlyPrice: z.number().optional(),
  monthlyPriceOverride: z.boolean().optional(),
  active: z.boolean().optional(),
  employerName: z.string().optional(),
  employerAddress: z.string().optional(),
  requiredDocs: z.object({
    epf: z.boolean().optional(),
    etf: z.boolean().optional(),
    salary: z.boolean().optional(),
    paySlip: z.boolean().optional(),
  }),
  shifts: z
    .array(
      z.object({
        start: z.string().optional(),
        end: z.string().optional(),
        break: z
          .number()
          .min(0, "Break time must be a positive number")
          .optional(),
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
  mode: z.string().optional(),
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
  openHours: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      allDay: z.boolean().optional(),
    })
    .optional(),
});

export async function PUT(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    // Parse request body
    const body = await req.json();
    const companyId = body.id;
    const companyData = body;

    // Validate companyId
    companyIdSchema.parse(companyId);

    //parse price
    if (companyData.monthlyPrice) {
      companyData.monthlyPrice = parseInt(companyData.monthlyPrice);
    }

    // Validate companyData
    companyUpdateSchema.parse(companyData);

    // Create filter
    const filter = { user: userId, _id: companyId };

    if (user?.role === "admin") {
      delete filter.user;
    } else {
      //if mode is aided or visit dont allow modification
      if (companyData.mode === "aided" || companyData.mode === "visit") {
        return NextResponse.json(
          {
            message: "You are not allowed to modify this company",
          },
          { status: 403 }
        );
      }
      //delete mode
      delete companyData.mode;
      //delete monthlyPrice
      delete companyData.monthlyPrice;
      //delete requiredDocs
      delete companyData.requiredDocs;
      //delete priceOverride
      delete companyData.monthlyPriceOverride;
      //delete probabilities
      delete companyData.probabilities;
      //delete user
      delete companyData.user;
    }

    // Connect to the database
    await dbConnect();

    // Find the company to update
    const company = await Company.findOne(filter);

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Count the number of employees in the company
    // Count the total and active employees in the company
    if (!companyData?.monthlyPriceOverride) {
      const [employeeCount, activeEmployeeCount] = await Promise.all([
        Employee.countDocuments({ company: companyId }),
        Employee.countDocuments({ company: companyId, active: true }),
      ]);
      const price = calculateMonthlyPrice(
        company,
        employeeCount,
        activeEmployeeCount
      );
      if (price !== company.monthlyPrice) {
        // Update the company's monthly price if it has changed
        companyData.monthlyPrice = price;
      }
    }

    console.log(companyData);

    // Update the company in the database
    const updatedCompany = await company.updateOne(companyData);

    if (!updatedCompany) {
      return NextResponse.json(
        { message: "Company Update Error" },
        { status: 404 }
      );
    }

    // Return the updated company data
    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error(error);
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

//delete
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
    const companyId = body.id;

    // Validate companyId
    companyIdSchema.parse(companyId);

    // Create filter
    const filter = { user: userId, _id: companyId };

    if (user?.role === "admin") {
      delete filter.user;
    }

    // Connect to the database
    await dbConnect();

    // Find the company to delete
    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    //if mode is aided or visit dont allow modification
    if (
      user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      return NextResponse.json(
        {
          message: "You are not allowed to delete this company",
        },
        { status: 403 }
      );
    }

    // Delete the company from the database
    await Company.findByIdAndDelete(companyId);

    // Return success response
    return NextResponse.json({ message: "Company deleted successfully" });
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
