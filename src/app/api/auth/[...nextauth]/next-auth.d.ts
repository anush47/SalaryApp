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
    };
  }
}
