"use client";
import CompanySideBar from "./companySideBar";
import React, { useEffect } from "react";
import { Box } from "@mui/material";
import CompanyMainBox from "./companyMainBox";
import { useParams, useSearchParams } from "next/navigation";

export let companyId = "";

//export selected type
export type Selected =
  | "quick"
  | "details"
  | "employees"
  | "payments"
  | "salaries"
  | "purchases"
  | "documents";

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
  const [selected, setSelected] = React.useState<Selected>("quick");
  const searchParams = useSearchParams();
  const params = useParams();
  useEffect(() => {
    const selectedParam = searchParams?.get("companyPageSelect");
    const companyIdParam = params.id.toString();
    companyId = companyIdParam ? companyIdParam : "";
    if (
      selectedParam &&
      [
        "quick",
        "details",
        "employees",
        "payments",
        "salaries",
        "purchases",
        "documents",
      ].includes(selectedParam)
    ) {
      setSelected(selectedParam as Selected);
    } else {
      setSelected("quick");
    }
  }, []);
  return (
    <Box sx={{ display: "flex" }}>
      <CompanySideBar
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
      <CompanyMainBox
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
