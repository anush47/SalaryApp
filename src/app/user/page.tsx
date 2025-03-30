import { getServerSession } from "next-auth";
import React from "react";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Box } from "@mui/material";
import NavContainer from "./clientComponents/NavContainer";

const UserPage = async () => {
  const session = await getServerSession(options);
  const user = session?.user || null;

  return (
    <NavContainer
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

export default UserPage;
