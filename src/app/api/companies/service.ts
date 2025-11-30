import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import { calculateMonthlyPrice } from "../purchases/price/priceUtils";
import { BadRequestError, NotFoundError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";
import { z } from "zod";

// Define schema for company creation
export const companyCreateSchema = z.object({
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

// Define schema for company update
export const companyUpdateSchema = z.object({
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

const companyIdSchema = z.string().min(1, "Company ID is required");

// Service layer for company operations
export class CompanyService {
  static async getCompany(companyId: string, context: RequestContext) {
    await dbConnect();

    // Create filter to ensure user only accesses their own companies (unless admin)
    const filter: {
      user?: string;
      _id?: string;
    } = { _id: companyId };
    
    if (context.user?.role !== "admin") {
      filter.user = context.user?.id;
    }

    // Fetch company from the database
    const company = await Company.findOne(filter).lean(); // Use .lean() for better performance
    
    if (!company) {
      throw new NotFoundError("Company not found");
    }
    
    return [company];
  }

  static async getCompanies(req: any, context: RequestContext) {
    await dbConnect();

    // Get is userNeeded from url
    const isUserNeeded = req.nextUrl.searchParams.get("needUsers");

    // Create filter
    const filter: {
      user?: string;
      _id?: string;
    } = {};
    
    if (context.user?.role !== "admin") {
      filter.user = context.user?.id;
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    // Fetch companies from the database with pagination
    let companies;

    if (isUserNeeded) {
      companies = await Company.find(filter)
        .populate("user", "name email") // Use populate to include user details
        .skip(skip)
        .limit(limit)
        .lean();
    } else {
      companies = await Company.find(filter)
        .skip(skip)
        .limit(limit)
        .lean();
    }
    
    if (!companies) {
      throw new NotFoundError("Companies not found");
    }

    // Get total count for pagination
    const total = await getTotalCount(Company, filter);

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

    // Return paginated response
    return { page, limit, total, companies: companiesWithEmployeeCount };
  }

  static async createCompany(body: any, context: RequestContext) {
    await dbConnect();

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

    // Create new company
    const newCompany = new Company({
      ...parsedBody,
      user: context.user?.id,
    });

    try {
      // Save the new company to the database
      await newCompany.save();
    } catch (error) {
      // Handle duplicate key error
      if ((error as any).code === 11000) {
        throw new BadRequestError("Company with this Employer Number already exists");
      }
      throw error;
    }

    return { message: "Company added successfully", companyId: newCompany._id };
  }

  static async updateCompany(body: any, context: RequestContext) {
    await dbConnect();

    const companyId = body._id;
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
    const filter = { user: context.user?.id, _id: companyId };

    if (context.user?.role === "admin") {
      delete filter.user;
    } else {
      //if mode is aided or visit dont allow modification
      if (companyData.mode === "aided" || companyData.mode === "visit") {
        throw new BadRequestError("You are not allowed to modify this company");
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

    // Find the company to update
    const company = await Company.findOne(filter);

    if (!company) {
      throw new NotFoundError("Company not found");
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

    // Update the company in the database
    const updatedCompany = await company.updateOne(companyData);

    if (!updatedCompany) {
      throw new NotFoundError("Company Update Error");
    }

    return { message: "Company updated successfully", company: updatedCompany };
  }

  static async deleteCompany(body: any, context: RequestContext) {
    await dbConnect();

    const companyId = body.id;

    // Validate companyId
    companyIdSchema.parse(companyId);

    // Create filter
    const filter = { user: context.user?.id, _id: companyId };

    if (context.user?.role === "admin") {
      delete filter.user;
    }

    // Find the company to delete
    const company = await Company.findOne(filter);
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    //if mode is aided or visit dont allow modification
    if (
      context.user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      throw new BadRequestError("You are not allowed to delete this company");
    }

    // Delete the company from the database
    await Company.findByIdAndDelete(companyId);

    return { message: "Company deleted successfully" };
  }
}