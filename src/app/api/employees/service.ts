import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import Department from "@/app/models/Department";
import { calculateMonthlyPrice } from "../purchases/price/priceUtils";
import Company from "@/app/models/Company";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { checkCompanyAccess } from "@/app/lib/rbacMiddleware";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  employeeIdSchema
} from "@/app/lib/schemas";

// Service layer for employee operations
export class EmployeeService {
  static async getEmployee(employeeId: string, context: RequestContext) {
    await dbConnect();

    const employee = await Employee.findById(employeeId).populate('user', 'email name');
    
    if (!employee) {
      throw new NotFoundError("Employee record not found");
    }

    // Verify user has access to this company
    const { authorized, response } = await checkCompanyAccess(context, employee.company.toString());
    
    if (!authorized && response) {
      throw new ForbiddenError("Access denied. You cannot access this employee.");
    }

    return employee;
  }

  static async getEmployeeByUser(userParam: string, context: RequestContext) {
    await dbConnect();

    // Employees can only fetch their own record
    if (context.user?.role !== "employee" || userParam !== context.user.id) {
      throw new ForbiddenError("Access denied");
    }

    const employee = await Employee.findOne({ user: userParam })
      .populate('user', '-password')
      .populate('company', 'name employerNo paymentStructure')
      .populate('department', 'name')
      .populate('manager', 'name memberNo')
      .lean();

    if (!employee) {
      throw new NotFoundError("Employee record not found");
    }

    return [employee];
  }

  static async getEmployeesByCompany(companyId: string, req: any, context: RequestContext) {
    await dbConnect();

    let employees = [];
    let companies = [];
    let companyFilter: any = {};
    let filter: any = {};

    if (context.user?.role === "admin") {
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
        companyFilter = { user: context.user?.id };
        companies = await Company.find(companyFilter)
          .select("_id name employerNo")
          .lean();
        filter = { company: { $in: companies.map((c) => c._id) } };
      } else {
        filter = { company: companyId };
        companyFilter = { user: context.user?.id, _id: companyId };
        companies = await Company.find(companyFilter)
          .select("_id name employerNo")
          .lean();
      }
    }

    // Check if company exists without fetching data
    const companyExists = await Company.exists(companyFilter);
    if (!companyExists) {
      throw new NotFoundError("Company not found");
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req as any);

    // Find employees based on the filter with pagination and populate all necessary fields
    const employeesWithPopulatedData = await Employee.find(filter)
      .populate('user', '-password')
      .populate('company', 'name employerNo')
      .populate('department', 'name')
      .populate('manager', 'name memberNo')
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await getTotalCount(Employee, filter);

    // Create mapping from the populated data to extract original company IDs
    // We need to go back to the unpopulated state for the company field, but keep other populated data
    const enrichedEmployees = employeesWithPopulatedData.map((employee) => {
      // Store the populated company details separately
      const populatedCompany = employee.company;

      // Extract company ID before changing the field
      const companyId = typeof employee.company === 'object' ? employee.company._id : employee.company;

      // Restore the company field to be just the ID for navigation
      employee.company = companyId;

      // Add company name and employer number fields for display
      if (populatedCompany && typeof populatedCompany === 'object') {
        employee.companyName = populatedCompany.name;
        employee.companyEmployerNo = populatedCompany.employerNo;
      }

      return employee;
    });

    // Return paginated response
    return { page, limit, total, employees: enrichedEmployees };
  }

  static async createEmployee(body: any, context: RequestContext) {
    await dbConnect();

    // trim and capitalize name and NIC
    body.name = body.name.trim().toUpperCase();
    body.nic = body.nic.trim().toUpperCase();

    // Convert to int
    body.memberNo = parseInt(body.memberNo);
    body.basic = parseFloat(body.basic);

    // Remove empty string values
    if (body.email === "") {
      delete body.email;
    }
    if (body.phoneNumber === "") {
      delete body.phoneNumber;
    }
    if (body.address === "") {
      delete body.address;
    }
    // Handle empty department and manager (when "None" is selected)
    if (body.department === "") {
      body.department = null;
    }
    if (body.manager === "") {
      body.manager = null;
    }

    const parsedBody = employeeCreateSchema.parse(body);

    // Verify user has access to this company
    const { authorized, response } = await checkCompanyAccess(context, parsedBody.company);
    
    if (!authorized && response) {
      throw new ForbiddenError("Access denied. You cannot add employees to this company.");
    }

    // Find the company by ID to ensure it exists and belongs to the user
    const company = await Company.findById(parsedBody.company);
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    // Check if the company is in visit mode or aided mode if not an admin
    if (
      context.user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      throw new ForbiddenError("You are not allowed to add employees to this company");
    }

    // Check if the memberNo already exists within the company (single query instead of N+1)
    const duplicateEmployee = await Employee.findOne({
      company: parsedBody.company,
      memberNo: parsedBody.memberNo,
    });
    if (duplicateEmployee) {
      throw new BadRequestError("Employee with this member number already exists");
    }

    // Remove probabilities for non-admin users
    if (context.user?.role !== "admin") {
      delete parsedBody.probabilities;
      // if ot method is random show error
      if (parsedBody.otMethod === "random") {
        throw new BadRequestError("OT method cannot be random");
      }
    }

    // Create and save the new employee
    const newEmployee = new Employee({
      ...parsedBody,
      user: company.user,
    });
    await newEmployee.save();

    // Count the number of employees in the company
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

    return { message: "Employee added successfully", employeeId: newEmployee._id };
  }

  static async updateEmployee(body: any, context: RequestContext) {
    await dbConnect();

    // trim and capitalize name and NIC
    body.name = body.name.trim().toUpperCase();
    body.nic = body.nic.trim().toUpperCase();

    // Convert to number
    body.memberNo = parseInt(body.memberNo);
    body.basic = parseFloat(body.basic);
    
    // Remove empty string values
    if (body.email === "") {
      delete body.email;
    }
    if (body.phoneNumber === "") {
      delete body.phoneNumber;
    }
    if (body.address === "") {
      delete body.address;
    }
    // Handle empty department and manager (when "None" is selected)
    if (body.department === "") {
      body.department = null;
    }
    if (body.manager === "") {
      body.manager = null;
    }

    const parsedBody = employeeUpdateSchema.parse(body);

    // Verify user has access to this company
    const { authorized, response } = await checkCompanyAccess(context, parsedBody.company);
    
    if (!authorized && response) {
      throw new ForbiddenError("Access denied. You cannot update employees in this company.");
    }

    // Find the company by ID to ensure it exists and belongs to the user
    const company = await Company.findById(parsedBody.company);
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    // Check if the company is in visit mode or aided mode if not an admin
    if (
      context.user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      throw new ForbiddenError("You are not allowed to update employees in this company");
    }

    // Find the existing employee
    const existingEmployee = await Employee.findById(parsedBody._id);
    if (!existingEmployee) {
      throw new NotFoundError("Employee not found");
    }

    // Check if the updated memberNo is unique within the company (single query instead of N+1)
    const duplicateEmployee = await Employee.findOne({
      company: parsedBody.company,
      memberNo: parsedBody.memberNo,
      _id: { $ne: parsedBody._id }, // Exclude the current employee being updated
    });
    if (duplicateEmployee) {
      throw new BadRequestError("Employee with this member number already exists");
    }

    // Remove probabilities for non-admin users
    if (context.user?.role !== "admin") {
      delete parsedBody.probabilities;
      // if ot method is random show error
      if (parsedBody.otMethod === "random") {
        throw new BadRequestError("OT method cannot be random");
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
      throw new Error("Failed to update employee");
    }

    return { message: "Employee updated successfully" };
  }

  static async deleteEmployee(employeeId: string, context: RequestContext) {
    await dbConnect();

    // Validate employeeId
    employeeIdSchema.parse(employeeId);

    // Find the employee to delete
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Verify user has access to this company
    const { authorized, response } = await checkCompanyAccess(context, employee.company.toString());
    
    if (!authorized && response) {
      throw new ForbiddenError("Access denied. You cannot delete employees in this company.");
    }

    // Find the company to ensure it belongs to the user
    const company = await Company.findById(employee.company);
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    // Check if the company is in visit mode or aided mode if not an admin
    if (
      context.user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      throw new ForbiddenError("You are not allowed to delete employees in this company");
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

    return { message: "Employee deleted successfully" };
  }
}