import React from "react";

export const DemoContent = () => {
  return (
    <div
      style={{
        position: "relative",
        boxSizing: "content-box",
        maxHeight: "80vh",
        width: "100%",
        aspectRatio: "2.183472327520849",
        padding: "40px 0 40px 0",
      }}
    >
      <iframe
        src="https://app.supademo.com/embed/cmbgruw8s51umsn1rde14rujz?embed_v=2"
        loading="lazy"
        title="SalaryApp Demo"
        allow="clipboard-write"
        frameBorder="0"
        allowFullScreen
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      ></iframe>
    </div>
  );
};

export default DemoContent;
