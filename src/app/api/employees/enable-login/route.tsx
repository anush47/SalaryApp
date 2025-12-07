import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import User from "@/app/models/User";
import bcrypt from "bcrypt";

// POST /api/employees/enable-login
// Creates a User account for an employee to enable login
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session || (session.user.role !== "employer" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { employeeId, userId, email } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Find the employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if employee already has a user account
    if (employee.user) {
      return NextResponse.json(
        { error: "Employee already has a user account" },
        { status: 400 }
      );
    }

    // Check if employee has an email or one is provided
    if (!employee.email && !email) {
      return NextResponse.json(
        { error: "Employee must have an email address to create a login account" },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists
    const userEmail = email || employee.email;
    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user account with this email already exists" },
        { status: 400 }
      );
    }

    // Generate a temporary password (employee will be forced to change it)
    const temporaryPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create the user account
    const newUser = new User({
      name: employee.name,
      email: email || employee.email,
      password: hashedPassword,
      role: "employee",
      employee: employee._id,
      isActive: true,
      forcePasswordChange: true, // Force password change on first login
      phoneNumber: employee.phoneNumber || "",
    });

    await newUser.save();

    // Update employee to link to the user
    employee.user = newUser._id;
    await employee.save();

    return NextResponse.json(
      {
        message: "User account created successfully",
        temporaryPassword, // Return this to show to the employer
        userId: newUser._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error enabling employee login:", error);
    return NextResponse.json(
      { error: "Failed to create user account" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (!employee.user) {
      return NextResponse.json(
        { error: "Employee does not have a user account" },
        { status: 400 }
      );
    }

    // Delete the user
    await User.findByIdAndDelete(employee.user);

    // Update employee to remove user reference
    employee.user = undefined;
    employee.canLogin = false;
    await employee.save();

    return NextResponse.json({ message: "User account deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete user account" },
      { status: 500 }
    );
  }
}
