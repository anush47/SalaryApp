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
  | "departments"
  | "salaries"
  | "payments"
  | "taxSettings"
  // Employee-specific
  | "dashboard"
  | "leaves"
  | "payslips"
  | "profile"
  // Employer-specific
  | "employerDashboard";

const NavContainer = ({
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
  // Default selected based on role
  const defaultSelected = user.role === "employee" ? "dashboard" : "employerDashboard";
  const [selected, setSelected] = React.useState<Selected>(defaultSelected);

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
        "departments",
        "salaries",
        "payments",
        "taxSettings",
        "dashboard",
        "leaves",
        "payslips",
        "profile",
        "employerDashboard",
      ].includes(selectedParam)
    ) {
      setSelected(selectedParam as Selected);
    } else {
      setSelected(defaultSelected);
    }
  }, [searchParams, defaultSelected]);
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
