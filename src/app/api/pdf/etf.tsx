import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CompanySchema, PaymentSchema } from "./helpers";

export const getETFDoc = (
  company: CompanySchema,
  period: string,
  columns: { dataKey: string; header: string }[],
  data: (string | number)[][],
  payment: PaymentSchema
) => {
  //remove inOut columns
  columns = columns.filter((column) => column.dataKey !== "inOut");
  const doc = new jsPDF({
    orientation: "portrait",
    format: "a4",
  });

  let x = 8;
  let y = 8;

  //left top
  doc.setLineWidth(0.2);
  doc.setFontSize(10);
  const leftTopBoxWidth = 90;

  doc.rect(x, y, leftTopBoxWidth, 8);

  y += 5;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text("EMPLOYEE'S TRUST FUND BOARD", x + 5, y);
  y += 3;
  const secondYStart = y;
  doc.rect(x, secondYStart, leftTopBoxWidth, 40);
  y += 8;
  // Company name
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.text(company.name, x + 5, y, {
    maxWidth: leftTopBoxWidth - 8,
  });
  //increment y by the space occupied
  y += 5 * (Math.floor(doc.getTextWidth(company.name) / 80) + 1);

  // Company address
  // split into  lines
  const lines = company.address
    .replace(/\n/g, "")
    .split(",")
    .map((line) => line.trim());
  doc.setFont("Courier", "normal");
  doc.setFontSize(11);
  //address start
  const numberOfLines = 4;
  lines
    .slice(0, numberOfLines - 1)
    .forEach((line: string | number, index: number) => {
      doc.text(line + (index < lines.length - 1 ? "," : ""), x + 5, y);
      //address line spacing
      y += 4;
    });
  doc.text(lines.slice(numberOfLines - 1, lines.length).join(","), x + 5, y, {
    maxWidth: leftTopBoxWidth - 8,
  });

  //period text
  let [year, month] = period.split("-");
  const monthName = new Date(`${month}-01-2020`).toLocaleString("default", {
    month: "long",
  });
  const periodText = `${monthName} - ${year}`;

  const memberNoIndex = columns.findIndex(
    (column) => column.dataKey === "memberNo"
  );
  const nameIndex = columns.findIndex((column) => column.dataKey === "name");
  const nicIndex = columns.findIndex((column) => column.dataKey === "nic");
  const etf3Index = columns.findIndex((column) => column.dataKey === "etf3");
  const totalEarningsIndex = columns.findIndex(
    (column) => column.dataKey === "totalEarnings"
  );

  // right top
  const topRightRows = [
    ["Registration Number", company.employerNo],
    ["Month and Year of contribution", periodText],
    ["Number of Employees", data.length - 3],
    [
      "Contributions Rs.",
      Number(data[data.length - 1][etf3Index]).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
    [
      "Surcharges Rs.",
      payment.etfSurcharges.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) !== "0.00"
        ? payment.etfSurcharges.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
    ],
    [
      "Total Remittance Rs.",
      (
        Number(data[data.length - 1][etf3Index]) + payment.etfSurcharges
      ).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
    ["Cheque Number", payment.etfChequeNo],
    ["Bank", payment.etfPaymentMethod],
  ];

  autoTable(doc, {
    head: [["Advice of Remittance form R-4", ""]],
    body: topRightRows,
    theme: "grid",
    margin: {
      left: 112,
      top: 8,
      right: 8,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    didParseCell: function (data) {
      if (data.column.index === 1) {
        data.cell.styles.halign = "right";
      }

      if (data.section === "head" && data.column.index === 0) {
        data.cell.colSpan = 2;
      } else if (
        (data.row.index === 0 || data.row.index === 5) &&
        data.column.index === 1
      ) {
        //make bold
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 10;
      } else if (data.row.index === 7 && data.column.index === 1) {
        data.cell.styles.cellWidth = "wrap";
      }
    },
    didDrawCell: function (data) {
      y = Math.max(data.cell.y + data.cell.height, y);
    },
  });

  //main table
  y += 7;
  const etfColumns = [
    {
      dataKey: "name",
      header: "EMPLOYEE'S NAME",
    },
    { dataKey: "nic", header: "N. I. C." },
    {
      dataKey: "memberNo",
      header: "MEMBER NO.",
    },
    { dataKey: "etf3", header: "CONTRIBUTION" },
    { dataKey: "totalEarnings", header: "TOTAL EARNINGS" },
  ];

  const etfData = data.reduce((acc: (string | number)[][], item: any) => {
    acc.push([
      item[nameIndex],
      item[nicIndex],
      item[memberNoIndex],
      item[etf3Index],
      item[totalEarningsIndex],
    ]);
    return acc;
  }, []);

  autoTable(doc, {
    columns: etfColumns,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    startY: y,
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    margin: {
      left: 8,
      top: 8,
      right: 8,
      bottom: 8,
    },
    body: etfData,
    didParseCell: function (data) {
      if (data.column.dataKey === "memberNo") {
        data.cell.styles.cellWidth = 15;
        data.cell.styles.halign = "center";
        if (data.section === "head") {
          data.cell.styles.fontSize = 7;
        } else if (data.row.index === etfData.length - 1) {
          data.cell.colSpan = 3;
        }
      } else if (
        data.section === "body" &&
        !(
          data.row.index >= data.table.body.length - 3 &&
          data.row.index < data.table.body.length - 1
        ) &&
        (data.column.dataKey === "etf3" ||
          data.column.dataKey === "totalEarnings")
      ) {
        if (!isNaN(Number(data.cell.text))) {
          data.cell.text = [
            Number(data.cell.text) !== 0
              ? Number(data.cell.text).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-",
          ];
          //allign right
          data.cell.styles.halign = "right";
        }
      } else if (data.column.dataKey === "name") {
        const width = doc.getTextWidth(data.cell.text.join(" "));
        if (width <= 100) data.cell.styles.cellWidth = "wrap";
        else data.cell.styles.cellWidth = "auto";
      }
    },
    didDrawCell: function (data) {
      y = Math.max(data.cell.y + data.cell.height, y);
    },
    didDrawPage: function (data) {
      //add page number
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(
        `Page ${data.pageNumber}`,
        doc.internal.pageSize.width - 20,
        doc.internal.pageSize.height - 5
      );
    },
  });

  y += 10;
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text("I certify that the information given above is correct.", x, y);

  y += 25;
  doc.text(".".repeat(75), x, y);

  return doc;
};
