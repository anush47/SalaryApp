import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import LeaveType from "@/app/models/LeaveType";
import { PurchaseService } from "../purchases/service";
import { BadRequestError, NotFoundError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";
import {
  companyCreateSchema,
  companyUpdateSchema,
  companyIdSchema
} from "@/app/lib/schemas";

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
    let company = await Company.findOne(filter).lean();

    // If company not found by ownership, check if user is an employee of the company
    if (!company && context.user?.role !== "admin") {
      const isEmployee = await Employee.exists({
        user: context.user?.id,
        company: companyId
      });

      if (isEmployee) {
        // If user is an employee, fetch the company without the user filter
        company = await Company.findOne({ _id: companyId }).lean();
      }
    }

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
    body.monthlyPrice = PurchaseService.calculateMonthlyPrice(null, 0, 0);
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

    // Create default shift structure (without ID)
    const defaultShift = {
      name: "Standard Day",
      type: "fixed",
      startTime: "08:00",
      endTime: "17:00",
      breakDuration: 1,
      duration: 540,
    };

    // Initialize shiftSettings
    body.shiftSettings = {
      mode: "fixed",
      shifts: [defaultShift],
      autoSelect: false,
      useShiftStartForOT: false
    };

    const parsedBody = companyCreateSchema.parse(body);

    // Create new company
    const newCompany = new Company({
      ...parsedBody,
      user: context.user?.id,
    });

    // Auto-link default shift ID
    if (newCompany.shiftSettings?.shifts?.length > 0) {
      // Mongoose auto-generates _id for subdocs. We convert it to string for the reference field.
      const generatedId = newCompany.shiftSettings.shifts[0]._id;
      if (generatedId) {
        newCompany.shiftSettings.defaultShiftId = generatedId.toString();
      }
    }

    try {
      // Save the new company to the database
      await newCompany.save();

      // Create default leave types
      const defaultLeaveTypes = [
        {
          name: "Annual Leave",
          company: newCompany._id,
          code: "AL",
          accrualPeriod: "yearly",
          maxDaysPerPeriod: 14, // Standard 14 days
          accrualMethod: "upfront",
          requiresApproval: true,
          isPaid: true,
          resetDay: 1, // Default reset day (1st) for robustness
          color: "#4CAF50", // Green
          description: "Standard annual leave allowance",
          applicableFor: ["permanent", "contract"],
        },
        {
          name: "Casual Leave",
          company: newCompany._id,
          code: "CL",
          accrualPeriod: "yearly",
          maxDaysPerPeriod: 7, // Standard 7 days
          accrualMethod: "upfront",
          requiresApproval: true,
          isPaid: true,
          resetDay: 1,
          color: "#2196F3", // Blue
          description: "Casual leave for personal matters",
          applicableFor: ["permanent", "contract"],
        },
        {
          name: "Sick Leave",
          company: newCompany._id,
          code: "SL",
          accrualPeriod: "yearly",
          maxDaysPerPeriod: 7, // Standard 7 days
          accrualMethod: "upfront",
          requiresApproval: true,
          requiresDocument: true, // Often requires medical cert
          isPaid: true,
          resetDay: 1,
          color: "#FF9800", // Orange
          description: "Leave for medical reasons",
          applicableFor: ["permanent", "contract", "intern"],
        },
        {
          name: "Short Leave",
          company: newCompany._id,
          code: "SH",
          accrualPeriod: "monthly",
          maxDaysPerPeriod: 0,
          accrualMethod: "upfront",
          requiresApproval: true,
          isPaid: true,
          resetDay: 1,
          color: "#9C27B0", // Purple
          description: "Short leave (Max 2 hours, 3 per month)",
          applicableFor: ["permanent", "contract", "intern"],
          isShortLeave: true,
          maxDurationMinutes: 120,
        },
        {
          name: "No Pay Leave",
          company: newCompany._id,
          code: "NPL",
          accrualPeriod: "yearly",
          maxDaysPerPeriod: 365, // Effectively unlimited
          accrualMethod: "upfront",
          requiresApproval: true,
          isPaid: false,
          resetDay: 1,
          color: "#F44336", // Red
          description: "Unpaid leave",
          applicableFor: ["permanent", "contract", "intern", "temporary"],
        },
      ];

      await LeaveType.insertMany(defaultLeaveTypes);

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
      const price = PurchaseService.calculateMonthlyPrice(
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
    // Use explicit $set and $unset to clean up legacy root fields (geoFencing, apiKey)
    const updatedCompany = await company.updateOne({
      $set: companyData,
      $unset: { geoFencing: 1, apiKey: 1 }
    });

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

  static async getReferenceNoName(employerNo: string, period: string): Promise<{ referenceNo: string | null; name: string | null }> {
    const [employer_no_zn, employer_no_number] = employerNo.split("/");
    const formattedPeriod = period.replace("-", "");

    // Try to get cached VIEWSTATE and EVENTVALIDATION first
    let viewState = "";
    let eventValidation = "";
    let usedCachedViewState = false;

    const viewStateCacheKey = "cbsl_viewstate";
    const cachedViewState = viewStateCache.get(viewStateCacheKey);

    if (cachedViewState && Date.now() - cachedViewState.timestamp < VIEWSTATE_CACHE_TTL) {
      viewState = cachedViewState.viewState;
      eventValidation = cachedViewState.eventValidation;
      usedCachedViewState = true;
    } else {
      // Fetch fresh VIEWSTATE and EVENTVALIDATION
      try {
        const initialResponse = await fetch("https://www.cbsl.lk/EPFCRef/", {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,si;q=0.6",
            "cache-control": "no-cache",
            "sec-ch-ua":
              '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "upgrade-insecure-requests": "1",
            Referer: "https://www.cbsl.lk/EPFCRef/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
          method: "GET",
        });

        if (!initialResponse.ok) {
          throw new Error(`Failed to fetch initial page: ${initialResponse.statusText}`);
        }

        const initialText = await initialResponse.text();

        // Extract VIEWSTATE and EVENTVALIDATION dynamically
        const viewStateMatch = initialText.match(/id="__VIEWSTATE"[^>]*value="([^"]*)"/);
        const eventValidationMatch = initialText.match(/id="__EVENTVALIDATION"[^>]*value="([^"]*)"/);

        if (!viewStateMatch || !eventValidationMatch) {
          throw new Error("Failed to extract VIEWSTATE or EVENTVALIDATION from the page");
        }

        viewState = viewStateMatch[1];
        eventValidation = eventValidationMatch[1];

        // Cache the VIEWSTATE and EVENTVALIDATION
        viewStateCache.set(viewStateCacheKey, {
          viewState,
          eventValidation,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error fetching VIEWSTATE and EVENTVALIDATION:", error);
        throw error;
      }
    }

    try {
      // Make the POST request with the VIEWSTATE and EVENTVALIDATION
      const response = await fetch("https://www.cbsl.lk/EPFCRef/", {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,si;q=0.6",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          pragma: "no-cache",
          priority: "u=0, i",
          "sec-ch-ua":
            '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          Referer: "https://www.cbsl.lk/EPFCRef/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: `__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=7BA8A1FC&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&zn=${employer_no_zn}&em=${employer_no_number}&mn=${formattedPeriod}&sb=&checkb=Get+Reference`,
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const text = await response.text();

      // Extract employer name with improved regex
      const nameMatch = text.match(/<span[^>]*id=["']empnm["'][^>]*>(.*?)<\/span>/i);
      const employer_name = nameMatch
        ? nameMatch[1]
          .replace(/<[^>]*>/g, "")
          .split(":")[1]
          ?.trim() || null
        : null;

      // Extract reference number with improved regex
      const refMatch = text.match(/<span[^>]*id=["']refno["'][^>]*>(.*?)<\/span>/i);
      const reference_no = refMatch
        ? refMatch[1]
          .replace(/<[^>]*>/g, "")
          .split(":")[1]
          ?.trim() || null
        : null;

      // If we got data, return it
      if (reference_no && employer_name) {
        return { referenceNo: reference_no, name: employer_name };
      }

      // If we didn't get data but used cached viewstate, try again with fresh viewstate
      if (usedCachedViewState) {
        console.log("Retrying with fresh VIEWSTATE and EVENTVALIDATION");
        // Remove cached viewstate and try again
        viewStateCache.delete(viewStateCacheKey);
        // Recursively call with fresh viewstate
        return await CompanyService.getReferenceNoName(employerNo, period);
      }

      // If we didn't get data and didn't use cached viewstate, throw an error
      throw new Error("Failed to extract reference number or employer name from response");
    } catch (error) {
      // If we used cached viewstate and failed, try again with fresh viewstate
      if (usedCachedViewState) {
        console.log("Retrying with fresh VIEWSTATE and EVENTVALIDATION after error");
        // Remove cached viewstate and try again
        viewStateCache.delete(viewStateCacheKey);
        // Recursively call with fresh viewstate
        return await CompanyService.getReferenceNoName(employerNo, period);
      }

      if (error instanceof Error) {
        console.error("An error occurred in get_ref_no_name:", error.message);
      } else {
        console.error("An unknown error occurred in get_ref_no_name");
      }
      // Return null values to indicate failure
      return { referenceNo: null, name: null };
    }
  }
}

// In-memory cache for VIEWSTATE and EVENTVALIDATION
const viewStateCache = new Map<string, { viewState: string; eventValidation: string; timestamp: number }>();
const VIEWSTATE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds