import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/db";
import { getServerSession } from "next-auth";
import Company from "@/app/models/Company";
import { options } from "../auth/[...nextauth]/options";
import { z } from "zod";
import Employee from "@/app/models/Employee";
import User from "@/app/models/User";
import bcrypt from "bcrypt";

// Define schema for validation
const userIdSchema = z.string().min(1, "User ID is required");

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    //check if need Companies is in the query
    const needCompanies =
      req.nextUrl.searchParams.get("needCompanies") === "true";

    // check if me=true is in the query
    const me = req.nextUrl.searchParams.get("me");

    if (me === "true") {
      // Connect to the database
      await dbConnect();
      // Find the user
      const _user = await User.findById(userId);
      if (!_user) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
      // remove password
      const userToReturn = _user.toObject();
      delete userToReturn.password;

      return NextResponse.json({ users: [userToReturn] });
    }

    // check if userId is in the query
    const _userId = req.nextUrl.searchParams.get("userId");

    // only allow admins
    if (user?.role !== "admin" && _userId !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // Connect to the database
    await dbConnect();

    if (_userId) {
      // Find the user
      const _user = await User.findById(_userId);
      if (!_user) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
      // remove password
      if (_user.password === "google") {
        _user.name += " (google)";
      }

      delete _user.password;
      if (needCompanies && _user.role !== "admin") {
        const companies = await Company.find({ user: _user._id })
          .select("name")
          .lean();
        _user.companies = companies;
      }
      return NextResponse.json({ users: [_user] });
    } else {
      // Fetch companies from the database remove the password if password is 'google' then after name add (google)
      const users = await User.find().lean();

      //add companies to the users
      for (const _currUser of users) {
        // remove password
        if (_currUser.password === "google") {
          _currUser.name += " (google)";
        }
        delete _currUser.password;
        if (needCompanies && _currUser.role !== "admin") {
          const companies = await Company.find({ user: _currUser._id })
            .select("name")
            .lean();
          _currUser.companies = companies;
        }
      }

      // Return the response
      return NextResponse.json({ users });
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

const userCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    // only allow admins
    if (user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await req.json();
    const { name, email, password } = userCreateSchema.parse(body);
    // Create a new user
    const _user = new User({
      name,
      email,
      password,
    });

    // encrypt the password
    // Hash the new password
    const hashedNewPassword = bcrypt.hashSync(password, 10);
    _user.password = hashedNewPassword;

    // Connect to the database
    await dbConnect();

    // Save the user
    const result = await User.create(_user);

    // Return the response
    return NextResponse.json({
      message: "User created",
      user: {
        _id: result._id,
        email: result.email,
        role: result.role,
        name: result.name,
      },
    });
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

const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  nic: z.string().optional(),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  isMarried: z.boolean().optional(),
  spouseName: z.string().optional(),
  nationality: z.string().optional(),
  documents: z.record(z.string()).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the input
    const json = await req.json();
    const updatedData = userUpdateSchema.parse(json);

    // Connect to the database
    await dbConnect();

    // Find and update the user
    const _user = await User.findOneAndUpdate(
      { _id: user.id },
      updatedData,
      { new: true }
    );

    if (!_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    //remove password
    const userToReturn = _user.toObject();
    delete userToReturn.password;

    return NextResponse.json({ user: userToReturn });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    // Handle other errors (e.g., database errors)
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    // Validate userId
    userIdSchema.parse(userId);

    // only allow admins
    if (user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    //get the user id from the request
    const _userId = req.nextUrl.searchParams.get("userId");
    // Validate userId
    userIdSchema.parse(_userId);

    // Connect to the database
    await dbConnect();

    // find companies for the user
    const companyCount = await Company.countDocuments({ user: _userId });

    // if the user has companies then return an error
    if (companyCount > 0) {
      return NextResponse.json(
        { message: "User has companies associated with them" },
        { status: 400 }
      );
    }

    // find user
    const _user = await User.findById(_userId).select("_id role");

    // if the user is an admin then return an error
    if (_user?.role === "admin") {
      return NextResponse.json(
        { message: "Cannot delete an admin user" },
        { status: 400 }
      );
    }

    // delete the user
    await User.deleteOne({ _id: _userId });

    // Return the response
    return NextResponse.json({ message: "User deleted" });
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
