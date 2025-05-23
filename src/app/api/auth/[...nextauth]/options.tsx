import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import User from "@/app/models/User";
import bcrypt from "bcrypt";
import dbConnect from "@/app/lib/db";

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
        //if password is google then return null
        if (password === "google") {
          return null;
        } else if (user && bcrypt.compareSync(password, user.password)) {
          // Any object returned will be saved in `user` property of the JWT
          return user;
        } else {
          // If you return null then an error will be displayed advising the user to check their details.
          return null;
          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        }
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
        return token;
      }

      token.id = user.id;
      token.role = user.role;

      return token;
    },

    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider === "google") {
        //if new user, create user
        //search for user in db
        await dbConnect();
        const _user = await User.findOne({ email: user.email });
        console.log("User", _user);
        if (!_user) {
          console.log("Creating new user", user);
          const newUser = new User({
            name: user.name,
            email: user.email,
            role: "employer",
            password: "google",
          });
          await newUser.save();
          return true;
        }
        user.name = _user.name;
        user.role = _user.role;
        return true;
      }

      return true;
    },

    async session({ session, user, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role,
          id: token.id,
        },
      };
    },
  },
};
