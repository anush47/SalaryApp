import { getServerSession } from "next-auth";
import React from "react";
import { options } from "@/app/api/auth/[...nextauth]/options";
import NavContainer from "./clientComponents/NavContainer";

const UserPage = async ({ params }: { params: { id: string } }) => {
  const session = await getServerSession(options);
  const user = session?.user || null;
  const companyId = params.id;

  return (
    <NavContainer
      user={
        user
          ? {
              name: user.name ?? "",
              email: user.email ?? "",
              image: user.image ?? "",
              role: user.role ?? "",
              id: user.id ?? "",
            }
          : { name: "", email: "", image: "", role: "", id: "" }
      }
      companyId={companyId}
    />
  );
};

export default UserPage;
