import jsPDF from "jspdf";
import {
  budgetaryRemovePeriod,
  CompanySchema,
  isPeriodBefore,
} from "./helpers";
import autoTable from "jspdf-autotable";

export const getPaySlipDoc = (
  company: CompanySchema,
  period: string,
  columns: { dataKey: string; header: string }[],
  salary: (string | number)[],
  employee:
    | {
        _id: string;
        memberNo: number;
        name: string;
        nic: string;
        designation: string;
      }
    | undefined
) => {
  //remove inOut columns
  columns = columns.filter((column) => column.dataKey !== "inOut");
  const doc = new jsPDF({
    orientation: "portrait",
    format: "a4",
  });
  let x = 8;
  let y = 15;
  const borderMarginIn = 3.5;
  const borderMarginOut = 1;
  // border
  doc.setLineWidth(0.2);
  doc.rect(
    borderMarginIn,
    borderMarginIn,
    doc.internal.pageSize.width - 2 * borderMarginIn,
    doc.internal.pageSize.height - 2 * borderMarginIn
  );
  doc.rect(
    borderMarginOut,
    borderMarginOut,
    doc.internal.pageSize.width - 2 * borderMarginOut,
    doc.internal.pageSize.height - 2 * borderMarginOut
  );
  const memberNoIndex = columns.findIndex(
    (column) => column.dataKey === "memberNo"
  );
  const nameIndex = columns.findIndex((column) => column.dataKey === "name");
  const nicIndex = columns.findIndex((column) => column.dataKey === "nic");
  //companyName
  doc.setFont("Times", "normal");
  doc.setFontSize(20);
  const companyName = company.name;
  doc.text(companyName, x, y, {
    maxWidth: 100,
  });

  //payslip
  doc.setFont("Times", "bold");
  doc.setFontSize(18);
  doc.text(`PAYSLIP`, doc.internal.pageSize.width - 8, y, {
    align: "right",
  });
  let [year, month] = period.split("-");
  const monthName = new Date(`${month}-01-2020`).toLocaleString("default", {
    month: "long",
  });
  const periodText = `${monthName} - ${year}`;
  y += 6;
  doc.setFontSize(14);
  doc.setFont("courier", "normal");
  doc.text(`Period : ${periodText}`, doc.internal.pageSize.width - 8, y, {
    align: "right",
  });
  y += 6;
  doc.text(
    `Employer Number : ${company.employerNo}`,
    doc.internal.pageSize.width - 8,
    y,
    {
      align: "right",
    }
  );
  y += 6;
  doc.text(
    `Member Number : ${salary[memberNoIndex]}`,
    doc.internal.pageSize.width - 8,
    y,
    {
      align: "right",
    }
  );

  doc.setFont("Times", "normal");
  doc.setFontSize(20);
  let addressY =
    15 +
    doc.getTextDimensions(companyName, {
      maxWidth: 100,
    }).h;
  doc.setFontSize(10);

  // split into 3 lines maximum
  const lines = company.address
    .replace(/\n/g, "")
    .split(",")
    .map((line) => line.trim());
  doc.setFont("Courier", "normal");
  doc.setFontSize(14);
  //address start
  const numberOfLines = 3;
  lines
    .slice(0, numberOfLines - 1)
    .forEach((line: string | number, index: number) => {
      doc.text(line + (index < lines.length - 1 ? "," : ""), x, addressY);
      //address line spacing
      addressY += 6;
    });
  doc.text(
    lines.slice(numberOfLines - 1, lines.length).join(","),
    x,
    addressY,
    {
      maxWidth: 100,
    }
  );
  //get lowest
  y = Math.max(y, addressY);
  y += 6;
  autoTable(doc, {
    startY: y,
    margin: {
      top: 8,
      left: 8,
      right: 8,
      bottom: 8,
    },
    theme: "plain",
    headStyles: {},
    styles: {
      font: "Times",
      fontSize: 14,
      lineColor: [0, 0, 0],
    },
    head: [["Name:", "NIC:", "Designation:"]],
    body: [
      [
        salary[nameIndex],
        salary[nicIndex],
        employee ? employee.designation : "",
      ],
    ],
    didParseCell: function (data) {
      //nic
      if (data.section === "head") {
        data.cell.styles.lineWidth = {
          top: 0.2,
          bottom: 0,
          left: 0,
          right: 0,
        };
        data.cell.styles.cellPadding = {
          top: 1,
          bottom: 0,
        };
      } else if (data.section === "body") {
        data.cell.styles.lineWidth = {
          top: 0,
          bottom: 0.2,
          left: 0,
          right: 0,
        };
        data.cell.styles.cellPadding = {
          top: 0,
          bottom: 1,
        };
      }

      if (data.column.index === 1) {
        data.cell.styles.halign = "center";
        data.cell.styles.cellPadding = {
          top: 1,
          bottom: 1,
          left: 2,
        };
      } //designation
      else if (data.column.index === 2) {
        data.cell.styles.halign = "right";
        data.cell.styles.cellPadding = {
          top: 1,
          bottom: 1,
          left: 2,
        };
      }
    },
    didDrawCell: function (data) {
      y = Math.max(data.cell.y + data.cell.height, y);
    },
  });
  y += 16;
  //Salary details
  doc.setFont("Times", "bold");
  doc.setFontSize(18);
  doc.text(`Salary Details`, x, y);
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(x, y, doc.internal.pageSize.width - x, y);
  y += 2;

  const noPayIndex = columns.findIndex((column) => column.dataKey === "noPay");
  const holidayPayIndex = columns.findIndex(
    (column) => column.dataKey === "holidayPay"
  );
  const totalEarningsIndex = columns.findIndex(
    (column) => column.dataKey === "totalEarnings"
  );
  const basicIndex = columns.findIndex(
    (column) =>
      column.dataKey ===
      (isPeriodBefore(period, budgetaryRemovePeriod) ? "basicWithBA" : "basic")
  );
  const salaryHeaders = ["Description", "Amount (LKR)"];
  const salaryRows = [
    [
      isPeriodBefore(period, budgetaryRemovePeriod)
        ? "Basic Salary (with budgetary)"
        : "Basic Salary",
      salary[basicIndex === -1 ? totalEarningsIndex : basicIndex],
    ],
  ];

  // Add holiday pay if it exists and is not 0, null, or undefined
  if (holidayPayIndex !== -1 && salary[holidayPayIndex]) {
    salaryRows.push(["Holiday Pay (+)", salary[holidayPayIndex]]);
  }

  // Add no pay if it exists and is not 0, null, or undefined
  if (noPayIndex !== -1 && salary[noPayIndex]) {
    salaryRows.push(["No Pay (-)", salary[noPayIndex]]);
  }

  salaryRows.push(["Total Earnings", salary[totalEarningsIndex]]);

  let totalAdditions = 0;
  // Append additions
  salaryRows.push(["Empty Row", ""]);
  //salaryRows.push(["Additions Header Row", ""]);
  const additions = columns.filter(
    (column) => column.dataKey.endsWith("(+)") && column.dataKey !== "OT (+)"
  );
  additions.forEach((addition) => {
    const additionIndex = columns.findIndex(
      (column) => column.dataKey === addition.dataKey
    );
    salaryRows.push([
      addition.header
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" "),
      salary[additionIndex],
    ]);
    totalAdditions += Number(salary[additionIndex]);
  });
  salaryRows.push(["Total Additions", totalAdditions]);
  salaryRows.push(["Empty Row", ""]);
  //salaryRows.push(["Deductions Header Row", ""]);

  let totalDeductions = 0;
  //push epf8
  const epf8Index = columns.findIndex((column) => column.dataKey === "epf8");
  salaryRows.push(["EPF 8% (-)", salary[epf8Index]]);
  totalDeductions += Number(salary[epf8Index]);

  // Append deductions except epf8
  const deductions = columns.filter(
    (column) =>
      column.dataKey.endsWith("(-)") &&
      column.dataKey !== "epf8" &&
      column.dataKey !== "EPF 8% (-)"
  );
  deductions.forEach((deduction) => {
    const deductionIndex = columns.findIndex(
      (column) => column.dataKey === deduction.dataKey
    );
    salaryRows.push([
      deduction.header
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" "),
      salary[deductionIndex] !== undefined ? salary[deductionIndex] : 0,
    ]);
    totalDeductions += Number(salary[deductionIndex] || 0);
  });

  salaryRows.push(["Total Deductions", totalDeductions]);
  salaryRows.push(["Empty Row", ""]);

  //ot
  const otIndex = columns.findIndex((column) => column.dataKey === "OT (+)");
  salaryRows.push(["OT (+)", salary[otIndex]]);
  //if advance
  const advanceIndex = columns.findIndex(
    (column) => column.dataKey === "advanceAmount"
  );
  if (salary[advanceIndex]) {
    salaryRows.push(["Advance (-)", salary[advanceIndex]]);
  }
  //final salary
  const finalSalaryIndex = columns.findIndex(
    (column) => column.dataKey === "finalSalary"
  );
  salaryRows.push([
    "Final Salary",
    Number(salary[finalSalaryIndex]) - (Number(salary[advanceIndex]) || 0),
  ]);

  autoTable(doc, {
    columns: salaryHeaders,
    body: salaryRows,
    startY: y,
    theme: "grid",
    margin: {
      left: 8,
      right: 8,
      top: 8,
      bottom: 8,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      lineColor: [255, 255, 255],
      valign: "middle",
    },
    styles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      font: "courier",
      fontSize: 14,
    },
    didParseCell: function (data) {
      //Bold total and basic
      if (
        data.row.cells[0].text.join(" ") === "Total Earnings" ||
        data.row.cells[0].text.join(" ") === "Total Additions" ||
        data.row.cells[0].text.join(" ") === "Total Deductions"
      ) {
        data.cell.styles.fontStyle = "bold";
      } else if (data.row.cells[0].text.join(" ") === "Final Salary") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 16;
        data.cell.styles.lineWidth = 0.6;
      }
      //if other additions or other deductions
      if (
        data.cell.text.join(" ") === "Additions Header Row" ||
        data.cell.text.join(" ") === "Deductions Header Row"
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.text = [data.cell.text.join(" ").split(" ")[0]];
        data.cell.colSpan = 2;
      } else if (data.cell.text.join(" ") === "Empty Row") {
        data.cell.colSpan = 2;
        data.cell.text = [""];
        data.cell.styles.cellPadding = 0;
        data.cell.styles.fontSize = 1;
        data.cell.styles.lineWidth = {
          top: 0.6,
          bottom: 0.6,
          left: 0.2,
          right: 0.2,
        };
      }

      //format currency
      if (data.column.index === 1) {
        //allign right
        data.cell.styles.halign = "right";
        if (data.section === "body") {
          if (!isNaN(Number(data.cell.text))) {
            data.cell.text = [
              Number(data.cell.text) !== 0
                ? Number(data.cell.text).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-",
            ];
          }
        }
      }
    },
    didDrawCell: function (data) {
      y = Math.max(data.cell.y + data.cell.height, y);
    },
  });

  //signature
  y = doc.internal.pageSize.height - 12;
  x = doc.internal.pageSize.width - 8;
  doc.setFont("Times", "normal");
  doc.setFontSize(14);
  doc.text(
    `Signature:   ...........................................................................`,
    x,
    y,
    {
      align: "right",
    }
  );

  return doc;
};
