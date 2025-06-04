"use client";
import { CircularProgress } from "@mui/material";
import React, { useState } from "react";

export const DemoContent = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      style={{
        position: "relative",
        boxSizing: "content-box",
        maxHeight: "80vh",
        width: "100%",
        aspectRatio: "2.183472327520849",
        padding: "40px 0 40px 0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isLoading && (
        <div>
          <CircularProgress size="3rem" />
        </div>
      )}
      <iframe
        src="https://app.supademo.com/embed/cmbgruw8s51umsn1rde14rujz?embed_v=2"
        loading="lazy"
        title="SalaryApp Demo"
        allow="clipboard-write"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-in-out",
        }}
      ></iframe>
    </div>
  );
};

export default DemoContent;
