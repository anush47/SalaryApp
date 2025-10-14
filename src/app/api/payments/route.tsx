import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import { options } from "../auth/[...nextauth]/options";
import { checkPurchased } from "../purchases/check/checkPurchased";
import Payment from "@/app/models/Payment";
import { FlattenMaps } from "mongoose";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";

// period schema
const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, { message: "Period must be in the format yyyy-mm" });

// GET: Fetch payment
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

    const paymentId = req.nextUrl.searchParams.get("paymentId");
    let companyId = req.nextUrl.searchParams.get("companyId");
    let period = req.nextUrl.searchParams.get("period");

    if (period) {
      period = periodSchema.parse(period);
    }

    if (!companyId && !paymentId) {
      return NextResponse.json(
        { message: "Company ID or payment ID is required" },
        { status: 400 }
      );
    }

    if (paymentId) {
      // Fetch one salary by ID
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return NextResponse.json(
          { message: "Salary not found" },
          { status: 404 }
        );
      }
      // Get company from employeeId and add company id
      companyId = payment?.company;
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
      const enrichedPayment = {
        ...payment._doc,
        companyPaymentMethod: company.paymentMethod,
        companyName: company.name,
        companyEmployerNo: company.employerNo,
      };
      return NextResponse.json({ payments: [enrichedPayment] });
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    let payments;
    let paymentFilter: any = {};
    let total = 0;

    if (companyId === "all") {
      let companies: (FlattenMaps<any> & Required<{ _id: string }>)[] = [];
      if (user?.role === "admin") {
        // Fetch all companies
        companies = (await Company.find({}).select("_id name employerNo paymentMethod").lean()).map(company => ({
          ...company,
          _id: (company._id as any).toString(),
        }));
        paymentFilter = {};
      } else {
        // Fetch all employees of companies associated with the user
        companies = (await Company.find({ user: userId })
          .select("_id name employerNo paymentMethod")
          .lean()).map(company => ({
          ...company,
          _id: (company._id as any).toString(),
        }));
        const companyIds = companies.map((company) => company._id);
        paymentFilter = { company: { $in: companyIds } };
      }

      // Fetch payments with pagination
      payments = await Payment.find(paymentFilter)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count
      total = await getTotalCount(Payment, paymentFilter);

      // Enrich payments with company details
      payments = payments.map((payment) => {
        const company = companies.find(
          (comp) => String(comp._id) === String(payment.company)
        );
        return {
          ...payment,
          companyName: company?.name,
          companyEmployerNo: company?.employerNo,
          companyPaymentMethod: company?.paymentMethod,
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

      // Build payment filter
      paymentFilter = { company: companyId };
      if (period) {
        paymentFilter.period = period;
      }

      // Fetch payments with pagination
      payments = await Payment.find(paymentFilter)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count
      total = await getTotalCount(Payment, paymentFilter);

      // Enrich payments with company details
      payments = payments.map((payment) => {
        return {
          ...payment,
          companyName: company.name,
          companyEmployerNo: company.employerNo,
          companyPaymentMethod: company.paymentMethod,
        };
      });
    }

    // Return paginated response
    const response = createPaginatedResponse(payments, page, limit, total);
    return NextResponse.json({ ...response, payments: response.data });
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

const paymentSaveSchema = z.object({
  _id: z.string().optional(),
  company: z.string(),
  period: z.string(),
  epfReferenceNo: z.string().optional(),
  epfAmount: z.number().gt(0, { message: "EPF amount must be above 0" }),
  epfSurcharges: z.number().optional(),
  epfPaymentMethod: z.string().optional(),
  epfChequeNo: z.string().optional(),
  epfPayDay: z.string().optional(),
  etfAmount: z.number().gt(0, { message: "ETF amount must be above 0" }),
  etfSurcharges: z.number().optional(),
  etfPaymentMethod: z.string().optional(),
  etfChequeNo: z.string().optional(),
  etfPayDay: z.string().optional(),
  remark: z.string().optional(),
});
// POST: Create new payments
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

    //convert to numbers
    body.payment.epfAmount = Number(body.payment.epfAmount);
    body.payment.etfAmount = Number(body.payment.etfAmount);
    body.payment.epfSurcharges = Number(body.payment.epfSurcharges) || 0;
    body.payment.etfSurcharges = Number(body.payment.etfSurcharges) || 0;

    const payment = paymentSaveSchema.parse(body.payment);
    //remove id
    delete payment._id;

    if (!payment) {
      return NextResponse.json({ message: "Payment invalid" }, { status: 400 });
    }

    await dbConnect();

    //check if payment already exists
    const existingPayment = await Payment.findOne({
      company: payment.company,
      period: payment.period,
    });
    if (existingPayment) {
      return NextResponse.json(
        { message: "Payment already exists" },
        { status: 400 }
      );
    }

    // Check for company access and purchased status
    const filter: { user?: string; _id: string } = {
      user: userId,
      _id: payment.company,
    };
    if (user?.role === "admin") {
      delete filter.user;
    }
    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    if (
      !(
        user?.role === "admin" &&
        (company.mode === "visit" || company.mode === "aided")
      )
    ) {
      const purchasedStatus = await checkPurchased(
        payment.company,
        payment.period
      );
      if (purchasedStatus !== "approved") {
        return NextResponse.json(
          {
            message: `${payment.period} not Purchased for ${company.name}. Purchase is ${purchasedStatus}`,
          },
          { status: 400 }
        );
      }
    }

    // save payment
    const newPayment = new Payment(payment);
    await newPayment.save();

    return NextResponse.json({
      message: "Payment created successfully",
      payment: newPayment,
    });
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

// PUT: Update an existing payment
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
    const payment = body.payment;
    //if not payment
    if (!payment) {
      return NextResponse.json({ message: "Payment invalid" }, { status: 400 });
    }

    //convert to numbers
    payment.epfAmount = Number(payment.epfAmount);
    payment.etfAmount = Number(payment.etfAmount);
    payment.epfSurcharges = Number(payment.epfSurcharges);
    payment.etfSurcharges = Number(payment.etfSurcharges);
    const parsedBody = paymentSaveSchema.parse(payment);

    await dbConnect();

    let filter: { user?: string; _id: string } = {
      user: userId,
      _id: parsedBody.company,
    };

    if (user.role === "admin") {
      delete filter.user;
    }

    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    // check if company mode is visit or aided if not admin
    if (
      user?.role !== "admin" &&
      (company.mode === "aided" || company.mode === "visit")
    ) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const existingPayment = await Payment.findById(parsedBody._id);
    if (!existingPayment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      parsedBody._id,
      parsedBody,
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedPayment) {
      return NextResponse.json(
        { message: "Failed to update payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Payment updated successfully",
      payment: updatedPayment,
    });
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

    const { paymentIds } = await req.json();
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json(
        { message: "Array of payment IDs is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    //check authority
    const payments = await Payment.find({ _id: { $in: paymentIds } }).lean();
    const companyIds = payments.map((payment) => payment.company);

    let filter: { user?: string; _id: { $in: string[] } } = {
      user: userId,
      _id: { $in: companyIds },
    };
    if (user.role === "admin") {
      delete filter.user;
    }

    //check
    const companies = await Company.find(filter).select("_id name mode").lean();
    //if no company
    if (companies.length === 0) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }
    if (companies.length !== companyIds.length) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }
    //delete

    //if user is admin
    if (user.role === "admin") {
      await Payment.deleteMany({ _id: { $in: paymentIds } });
      return NextResponse.json(
        { message: "Payments deleted successfully" },
        { status: 200 }
      );
    } else {
      //if user is not admin
      //dont delete payments with company mode visit or aided
      const companies = await Company.find({ _id: { $in: companyIds } })
        .select("mode name")
        .lean();
      const visitAidedCompanies = companies.filter(
        (company) => company.mode === "visit" || company.mode === "aided"
      );
      await Payment.deleteMany({
        _id: { $in: paymentIds },
        company: { $nin: visitAidedCompanies.map((company) => company._id) },
      });
      if (visitAidedCompanies.length > 0) {
        return NextResponse.json(
          {
            message: `You are not allowed to delete Payments for ${visitAidedCompanies
              .map((company) => company.name)
              .join(", ")}.`,
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { message: "Payments deleted successfully" },
          { status: 200 }
        );
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
