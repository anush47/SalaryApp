"use client";
import AdminSideBar from "./adminSideBar";
import React, { useEffect } from "react";
import { Box } from "@mui/material";
import AdminMainBox from "./adminMainBox";
import { useSearchParams } from "next/navigation";

//export selected type
export type Selected = "users" | "calendar";

const AdminNavContainer = ({
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
  const [selected, setSelected] = React.useState<Selected>("users");

  const searchParams = useSearchParams();
  useEffect(() => {
    const selectedParam = searchParams?.get("adminPageSelect");
    if (selectedParam && ["users", "calendar"].includes(selectedParam)) {
      setSelected(selectedParam as Selected);
    } else {
      setSelected("users");
    }
  }, [searchParams]);
  return (
    <Box sx={{ display: "flex" }}>
      <AdminSideBar
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
      <AdminMainBox
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

export default AdminNavContainer;
