import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      role?: string | null;
      name?: string | null;
      email?: string;
      image?: string | null;
      isActive?: boolean;
      canLogin?: boolean;
      forcePasswordChange?: boolean;
    };
  }
}

import { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string | null;
    isActive?: boolean;
    canLogin?: boolean;
    forcePasswordChange?: boolean;
    error?: string;
  }
}
