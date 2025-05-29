import React from "react";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import AdminNavContainer from "./clientComponents/AdminNavContainer";
import UnAuthorize from "./unAuthorize/UnAuthorize";

const AdminPage = async () => {
  const session = await getServerSession(options);
  const user = session?.user || null;

  if (!user) {
    //redirect to login page if user is not logged in
    window.location.href = "/auth/login?callbackUrl=/admin";
  }

  if (user && user.role !== "admin") {
    return <UnAuthorize user={user} />;
  }

  return (
    <AdminNavContainer
      user={
        user
          ? {
              name: user.name ?? "",
              email: user.email ?? "",
              id: user.id ?? "",
              role: user.role ?? "",
              image: user.image ?? "",
            }
          : { name: "", email: "", id: "", role: "", image: "" }
      }
    />
  );
};

export default AdminPage;
