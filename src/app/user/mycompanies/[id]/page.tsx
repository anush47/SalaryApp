import { getServerSession } from "next-auth";
import CompanySideBar from "./clientComponents/companySideBar";
import React from "react";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Box } from "@mui/material";
import MainBox from "./clientComponents/companyMainBox";
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
              image: user.image ?? "",
              role: user.role ?? "",
              id: user.id ?? "",
            }
          : { name: "", email: "", image: "", role: "", id: "" }
      }
    />
  );
};

export default UserPage;
