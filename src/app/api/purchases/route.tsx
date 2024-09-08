import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import dbConnect from "@/app/lib/db";
import Purchase from "@/app/models/Purchase";
import Company from "@/app/models/Company";
import { options } from "../auth/[...nextauth]/options";

// Define schema for purchase validation
const purchaseSchema = z.object({
  periods: z.array(z.string().min(1, "Period is required")),
  company: z
    .string()
    .min(1, "Company ID is required")
    .refine((id) => /^[0-9a-fA-F]{24}$/.test(id), "Invalid company ID"),
  price: z.number().min(0, "Price must be a positive number"),
  request: z.string().min(1, "Request is required"),
  requestDay: z.string().min(1, "Request day is required"),
  approvedStatus: z.enum(["approved", "pending", "rejected"]).optional(),
});

// GET: Fetch a purchase by ID or all purchases of the company
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

    const purchaseId = req.nextUrl.searchParams.get("purchaseId");
    const companyId = req.nextUrl.searchParams.get("companyId");

    await dbConnect();

    if (purchaseId) {
      purchaseSchema.shape.company.parse(purchaseId); // Validate ID

      const purchase = await Purchase.findById(purchaseId);

      if (!purchase) {
        return NextResponse.json(
          { message: "Purchase not found" },
          { status: 404 }
        );
      }

      // Create filter
      const filter = { user: userId, _id: purchase.company };
      if (user?.role === "admin") {
        // Remove user from filter
        delete (filter as { user?: string }).user;
      }

      const company = await Company.findOne(filter);
      if (!company) {
        return NextResponse.json(
          { message: "Access denied." },
          { status: 403 }
        );
      }

      return NextResponse.json({ purchase });
    } else if (companyId) {
      // Create filter
      const companyFilter = { user: userId, _id: companyId };
      if (user?.role === "admin") {
        // Remove user from filter
        delete (companyFilter as { user?: string }).user;
      }

      if (companyId !== "all") {
        const company = await Company.findOne(companyFilter);

        if (!company) {
          return NextResponse.json(
            { message: "Company not found" },
            { status: 404 }
          );
        }
        // Create filter
        const filter = { company: company._id || "" };
        if (user?.role === "admin") {
          // Remove user from filter
          if (companyId === "all") {
            delete filter.company;
          }
        }

        console.log(filter);

        const purchases = await Purchase.find(filter).select("-request");
        return NextResponse.json({ purchases });
      } else {
        const purchases = await Purchase.find().select("-request");
        return NextResponse.json({ purchases });
      }
    } else {
      return NextResponse.json(
        { message: "Purchase ID or Company ID is required" },
        { status: 400 }
      );
    }
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

// POST: Create a new purchase
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

    const body = await req.json();
    body.approvedStatus = "pending";
    // Get today's date
    const today = new Date();
    const date = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();

    // Add zeros if necessary
    body.requestDay = `${date}-${month}-${year}`;

    const parsedBody = purchaseSchema.parse(body);
    console.log(parsedBody);

    await dbConnect();

    // Create filter
    const filter: { user?: string; _id: string } = {
      user: userId,
      _id: parsedBody?.company,
    };
    if (user?.role === "admin") {
      // Remove user from filter
      delete filter.user;
    }
    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const newPurchase = await Purchase.create(parsedBody);
    return NextResponse.json({
      message: "Purchase created successfully",
      purchase: newPurchase,
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

//update schema
const purchaseUpdateSchema = z.object({
  _id: z.string().min(1, "Purchase ID is required"),
  approvedStatus: z.enum(["approved", "pending", "rejected"]).optional(),
});

// PUT: Update an existing purchase
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

    if (user.role !== "admin") {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const parsedBody = purchaseUpdateSchema.parse(body);
    await dbConnect();

    const existingPurchase = await Purchase.findById(parsedBody._id);
    if (!existingPurchase) {
      return NextResponse.json(
        { message: "Purchase not found" },
        { status: 404 }
      );
    }

    const company = await Company.findById(existingPurchase.company);
    if (!company) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      parsedBody._id,
      parsedBody,
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedPurchase) {
      return NextResponse.json(
        { message: "Failed to update purchase" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Purchase updated successfully",
      purchase: updatedPurchase,
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
