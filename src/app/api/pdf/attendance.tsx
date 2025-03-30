import jsPDF from "jspdf";
import { CompanySchema } from "./helpers";
import autoTable from "jspdf-autotable";

export const getAttendanceDoc = (
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
  const doc = new jsPDF({
    orientation: "portrait",
    format: "a4",
  });
  let x = 8;
  let y = 12;
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
  const memberNoIndex = columns.findIndex(
    (column) => column.dataKey === "memberNo"
  );
  const nameIndex = columns.findIndex((column) => column.dataKey === "name");
  const nicIndex = columns.findIndex((column) => column.dataKey === "nic");
  //companyName
  doc.setFont("Times", "normal");
  doc.setFontSize(12);
  const companyName = company.name;
  doc.text(companyName, x, y, {
    maxWidth: 100,
  });

  //payslip
  doc.setFont("Times", "bold");
  doc.setFontSize(12);
  doc.text(`ATTENDANCE REPORT`, doc.internal.pageSize.width - 8, y, {
    align: "right",
  });
  let [year, month] = period.split("-");
  const monthName = new Date(`${month}-01-2020`).toLocaleString("default", {
    month: "long",
  });
  const periodText = `${monthName} - ${year}`;
  y += 4;
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text(`Period : ${periodText}`, doc.internal.pageSize.width - 8, y, {
    align: "right",
  });
  y += 4;
  doc.text(
    `Employer Number : ${company.employerNo}`,
    doc.internal.pageSize.width - 8,
    y,
    {
      align: "right",
    }
  );
  y += 4;
  doc.text(
    `Member Number : ${salary[memberNoIndex]}`,
    doc.internal.pageSize.width - 8,
    y,
    {
      align: "right",
    }
  );

  doc.setFont("Times", "normal");
  doc.setFontSize(12);
  let addressY =
    13 +
    doc.getTextDimensions(companyName, {
      maxWidth: 100,
    }).h;
  doc.setFontSize(8);

  // split into 3 lines maximum
  const lines = company.address
    .replace(/\n/g, "")
    .split(",")
    .map((line) => line.trim());
  doc.setFont("Courier", "normal");
  doc.setFontSize(10);
  //address start
  const numberOfLines = 3;
  lines
    .slice(0, numberOfLines - 1)
    .forEach((line: string | number, index: number) => {
      doc.text(line + (index < lines.length - 1 ? "," : ""), x, addressY);
      //address line spacing
      addressY += 4;
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
  y += 5;
  autoTable(doc, {
    startY: y,
    margin: {
      top: 5,
      left: 8,
      right: 8,
      bottom: 5,
    },
    theme: "plain",
    headStyles: {},
    styles: {
      font: "Times",
      fontSize: 10,
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
          top: 0.4,
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
          bottom: 0.4,
        };
      }

      if (data.column.index === 1) {
        data.cell.styles.halign = "center";
        data.cell.styles.cellPadding = {
          top: 0.5,
          bottom: 0.5,
          left: 2,
        };
      } //designation
      else if (data.column.index === 2) {
        data.cell.styles.halign = "right";
        data.cell.styles.cellPadding = {
          top: 0.5,
          bottom: 0.5,
          left: 2,
        };
      }
    },
    didDrawCell: function (data) {
      y = Math.max(data.cell.y + data.cell.height, y);
    },
  });
  y += 8;
  //Salary details
  doc.setFont("Times", "bold");
  doc.setFontSize(12);
  doc.text(`Attendance Details`, x, y);
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(x, y, doc.internal.pageSize.width - x, y);
  y += 2;

  //format date and time using ISO format
  const formatDateTime = (dateTime: string) => {
    const dateObj = new Date(dateTime);
    const dateTimeStringArray = dateObj.toISOString().split("T");
    const date = dateTimeStringArray[0].slice(5).replace("-", "/"); // MM/DD
    const time = dateTimeStringArray[1].slice(0, 5); // HH:MM
    return { date, time };
  };

  const noPayIndex = columns.findIndex((column) => column.dataKey === "noPay");
  const inOutIndex = columns.findIndex((column) => column.dataKey === "inOut");
  const holidayPayIndex = columns.findIndex(
    (column) => column.dataKey === "holidayPay"
  );
  const basicIndex = columns.findIndex(
    (column) => column.dataKey === "basicWithBA"
  );
  const salaryForEPFIndex = columns.findIndex(
    (column) => column.dataKey === "salaryForEPF"
  );

  type inOutSchema = {
    in: string;
    out: string;
    workingHours: number;
    otHours: number;
    ot: number;
    noPay: number;
    description: string;
  };

  const inOut = Array.isArray(salary[inOutIndex])
    ? (salary[inOutIndex] as inOutSchema[])
    : [];

  const attendanceHeaders = ["Day", "In", "Out", "Work(h)", "OT(h)", "OT(LKR)"];
  //add noPay if exists
  const hasNoPay =
    noPayIndex &&
    salary[noPayIndex] != undefined &&
    salary[noPayIndex] != "" &&
    salary[noPayIndex] != 0;
  if (hasNoPay) {
    attendanceHeaders.push("No Pay");
  }
  //throw new Error("This is an error");
  attendanceHeaders.push("Description");

  const attendanceRows = inOut.map((row, i) => {
    let inDate = "-",
      inTime = "-",
      outDate = "-",
      outTime = "-",
      day = "";
    if (row.in != row.out) {
      ({ date: inDate, time: inTime } = formatDateTime(row.in));
      ({ date: outDate, time: outTime } = formatDateTime(row.out));
      day = inDate === outDate ? inDate : `${inDate}-${outDate}`;
    } else {
      day = formatDateTime(row.in).date;
    }
    if (row.in) {
      const dateObj = new Date(row.in.split("T")[0]);
      const dayOfWeek = dateObj.toLocaleString("default", { weekday: "short" });
      day = `${day}(${dayOfWeek})`;
    }

    const returnArray = [
      //get current index + 1
      day,
      `${inTime}`,
      `${outTime}`,
      row.workingHours === 0 ? "-" : row.workingHours.toFixed(2),
      row.otHours === 0 ? "-" : row.otHours.toFixed(2),
      row.ot === 0
        ? "-"
        : row.ot.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
    ];

    if (hasNoPay) {
      returnArray.push(
        row.noPay == 0
          ? "-"
          : row.noPay.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
      );
    }

    returnArray.push(row.description.trim());

    return returnArray;
  });

  //attendanceRows.push(["Empty Row", ""]);

  //ot
  const otIndex = columns.findIndex((column) => column.dataKey === "OT (+)");
  //if advance
  const advanceIndex = columns.findIndex(
    (column) => column.dataKey === "advanceAmount"
  );
  //final salary
  const finalSalaryIndex = columns.findIndex(
    (column) => column.dataKey === "finalSalary"
  );
  // attendanceRows.push([
  //   "Final Salary",
  //   Number(salary[finalSalaryIndex]) - (Number(salary[advanceIndex]) || 0),
  // ]);

  autoTable(doc, {
    columns: attendanceHeaders,
    body: attendanceRows,
    startY: y,
    theme: "grid",
    margin: {
      left: 8,
      right: 8,
      top: 5,
      bottom: 5,
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
      fontSize: 8,
      cellPadding: 1,
    },
    didParseCell: function (data) {
      //Bold total and basic
      if (
        data.row.cells[0].text.join(" ") === "Basic Salary (with budgetary)" ||
        data.row.cells[0].text.join(" ") === "Total Additions" ||
        data.row.cells[0].text.join(" ") === "Total Deductions"
      ) {
        data.cell.styles.fontStyle = "bold";
      } else if (data.row.cells[0].text.join(" ") === "Final Salary") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 10;
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
          top: 0.5,
          bottom: 0.5,
          left: 0.2,
          right: 0.2,
        };
      }

      //format currency
      if (data.column.index === -1) {
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
  doc.setFontSize(10);
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
