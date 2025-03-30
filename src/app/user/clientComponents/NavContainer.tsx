"use client";
import UserSideBar from "./userSideBar";
import React, { useEffect } from "react";
import { Box } from "@mui/material";
import UserMainBox from "./userMainBox";
import { useSearchParams } from "next/navigation";

//export selected type
export type Selected =
  | "quick"
  | "mycompanies"
  | "settings"
  | "purchases"
  | "employees"
  | "salaries"
  | "payments";

const NavContainer = async ({
  user,
}: {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
}) => {
  const [selected, setSelected] = React.useState<Selected>("mycompanies");

  const searchParams = useSearchParams();
  useEffect(() => {
    const selectedParam = searchParams?.get("userPageSelect");

    if (
      selectedParam &&
      [
        "quick",
        "mycompanies",
        "settings",
        "purchases",
        "employees",
        "salaries",
        "payments",
      ].includes(selectedParam)
    ) {
      setSelected(selectedParam as Selected);
    } else {
      setSelected("mycompanies");
    }
  }, []);
  return (
    <Box sx={{ display: "flex" }}>
      <UserSideBar
        selected={selected}
        setSelected={setSelected}
        user={
          user
            ? {
                name: user.name ?? "",
                email: user.email ?? "",
                role: user.role ?? "",
                image: user.image ?? "",
              }
            : { name: "", email: "", role: "", image: "" }
        }
      />
      <UserMainBox
        selected={selected}
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
    </Box>
  );
};

export default NavContainer;
