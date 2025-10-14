import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import { options } from "../../auth/[...nextauth]/options";
import Company from "@/app/models/Company";
import Purchase from "@/app/models/Purchase";
import { FormAFillPDF, employeeFormSchema } from "./AFormFillPDF";

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
    //convert to number
    body.memberNo = Number(body.memberNo);
    //console.log(body);
    const formDetails = employeeFormSchema.parse(body);

    // Connect to the database
    await dbConnect();

    // Create filter
    const filter: { user?: string; _id: string } = {
      user: userId,
      _id: formDetails.companyId,
    };
    if (user?.role === "admin") {
      // Remove user from filter
      delete filter.user;
    }

    // Find the company by ID to ensure it exists and belongs to the user
    const company = await Company.findOne(filter);
    if (!company) {
      return NextResponse.json(
        {
          message: "Access denied. You cannot add employees to this company.",
        },
        { status: 403 }
      );
    }

    //admin and the company mode is visit or aided
    if (
      !(
        user?.role === "admin" &&
        (company.mode === "visit" || company.mode === "aided")
      )
    ) {
      // Check if at least 2 purchases have been made (including free trial)
      const purchaseCount = await Purchase.countDocuments({
        company: company._id,
      });
      if (purchaseCount < 2) {
        return NextResponse.json(
          {
            message:
              "You must make at least one purchase other than the free trial to fill AH.",
          },
          { status: 403 }
        );
      }
    }

    const pdfOutput = await FormAFillPDF(formDetails);

    if (!pdfOutput || pdfOutput === null) {
      return NextResponse.json(
        { message: "Failed to generate PDF" },
        { status: 500 }
      );
    }

    // Return the pdf
    // Return the PDF as a response
    return new NextResponse(pdfOutput as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="report.pdf"', // or "attachment" if you want it to be downloaded
      },
    });
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
