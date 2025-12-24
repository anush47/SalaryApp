import dbConnect from "@/app/lib/db";
import User from "@/app/models/User";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { z } from "zod";
import { isGoogleOAuthUser } from "@/app/lib/authHelpers";

//zod for password
const passwordSchema = z
  .string()
  .min(4, "New Password must be at least 4 characters long");

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { oldPassword, newPassword } = json;

    if (!newPassword) {
      return NextResponse.json(
        { error: "Both old and new passwords are required" },
        { status: 400 }
      );
    }

    // Validate the input using zod

    await dbConnect();

    const session = await getServerSession(options);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Find the user in the database
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if this is a Google OAuth user
    if (isGoogleOAuthUser(user.password)) {
      // This is a Google OAuth user - they're setting their first password
      // Allow password change without old password verification
    } else {
      // Regular credentials user - verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect old password" },
          { status: 400 }
        );
      }
    }

    // Validate new password
    passwordSchema.parse(newPassword);

    // Hash the new password
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedNewPassword;
    user.forcePasswordChange = false;
    user.passwordChangedAt = new Date();
    await user.save();

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          //return the messege of first error
          error: e.errors[0].message,
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
