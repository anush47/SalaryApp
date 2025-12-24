import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import dbConnect from "@/app/lib/db";
import { isBcryptHash, isGoogleOAuthUser, generateSecureRandomPassword } from "@/app/lib/authHelpers";

export const options: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // `credentials` is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: { label: "Email", type: "text", placeholder: "Email..." },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password...",
        },
      },
      async authorize(credentials, req) {
        // Add logic here to look up the user from the credentials supplied
        const email = credentials?.email;
        const password = credentials?.password || ""; // Provide a default value for password if it is undefined
        // You can also use the `req` object to obtain more information, including the IP
        //
        await dbConnect();
        const user = await User.findOne({ email });

        if (!user) {
          return null;
        }

        // Security: Check if this is a Google OAuth user
        // Google OAuth users cannot login with credentials
        if (isGoogleOAuthUser(user.password)) {
          return null;
        }

        // Check if user is active
        if (!user.isActive) {
          return null;
        }

        // For employee role, check canLogin permission
        if (user.role === "employee" && user.employee) {
          const Employee = (await import("@/app/models/Employee")).default;
          const employee = await Employee.findById(user.employee).select("canLogin");
          if (!employee || !employee.canLogin) {
            return null;
          }
        }

        // Verify password
        if (bcrypt.compareSync(password, user.password)) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          return user;
        }

        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/signIn",
    error: "/auth/signIn",
  },
  callbacks: {
    async jwt({ token, trigger, session }) {
      if (trigger === "update") {
        return { ...token, ...session.user };
      }

      await dbConnect();
      const user = await User.findOne({ email: token.email });

      if (!user) {
        // User deleted
        return { ...token, error: "UserDeleted" };
      }

      token.id = user.id;
      token.role = user.role;
      token.isActive = user.isActive;
      token.forcePasswordChange = user.forcePasswordChange;

      // For employees, check canLogin permission
      if (user.role === "employee" && user.employee) {
        const Employee = (await import("@/app/models/Employee")).default;
        const employee = await Employee.findById(user.employee).select("canLogin");
        token.canLogin = employee?.canLogin || false;
      }

      return token;
    },

    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider === "google") {
        //if new user, create user
        //search for user in db
        await dbConnect();
        const _user = await User.findOne({ email: user.email });

        if (!_user) {
          // Create new Google OAuth user with secure random password
          const newUser = new User({
            name: user.name,
            email: user.email,
            role: "employer",
            password: generateSecureRandomPassword(), // Secure random string, not "google"
            isActive: true,
          });
          await newUser.save();
          return true;
        }

        // Check if user account is active
        if (!_user.isActive) {
          return false; // Redirect to sign-in with error
        }

        // For employee role, check if they have login permission
        if (_user.role === "employee" && _user.employee) {
          const Employee = (await import("@/app/models/Employee")).default;
          const employee = await Employee.findById(_user.employee).select("canLogin");
          if (!employee || !employee.canLogin) {
            return false;
          }
        }

        // Update last login
        _user.lastLogin = new Date();
        await _user.save();

        user.name = _user.name;
        user.role = _user.role;
        return true;
      }

      return true;
    },

    async session({ session, user, token }) {
      if (token.error === "UserDeleted") {
        // If the user is deleted, return null or an empty object to invalidate the session
        // However, returning null here might break types or expectation.
        // It is better to return a session that indicates error, or reliance on token.
        // But throwing errors here usually crashes the client.
        // Returning default null often triggers signOut on client.
        return null as any;
      }
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role,
          id: token.id,
          forcePasswordChange: token.forcePasswordChange,
        },
      };
    },
  },
};
