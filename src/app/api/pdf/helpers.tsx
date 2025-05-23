import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Payment from "@/app/models/Payment";
import Salary from "@/app/models/Salary";
import { degrees, PDFDocument } from "pdf-lib";
import { getSalaryDoc } from "./salary";
import { getEPFDoc } from "./epf";
import { getETFDoc } from "./etf";
import { getPaySlipDoc } from "./payslip";
import { getAttendanceDoc } from "./attendance";

export const budgetaryRemovePeriod = "2025-04";

//salary schema type
export type SalarySchema = {
  _id: string;
  employee: {
    memberNo: number;
    name: string;
    nic: string;
  };
  inOut: any[];
  period: string;
  basic: number;
  holidayPay: number;
  noPay: { amount: number };
  ot: { amount: number };
  paymentStructure: {
    additions: {
      name: string;
      amount: string | number;
      affectTotalEarnings: boolean;
    }[];
    deductions: {
      name: string;
      amount: string | number;
      affectTotalEarnings: boolean;
    }[];
  };
  advanceAmount: number;
  finalSalary: number;
};

//company
export type CompanySchema = {
  name: string;
  employerNo: string;
  address: string;
  requiredDocs: {
    epf: boolean;
    etf: boolean;
    salary: boolean;
    paySlip: boolean;
  };
};

//paymentSchema
export type PaymentSchema = {
  _id: string;
  company: string;
  period: string;
  epfReferenceNo: string;
  epfAmount: number;
  epfPaymentMethod: string;
  epfChequeNo: string;
  epfSurcharges: number;
  epfPayDay: string;
  etfAmount: number;
  etfPaymentMethod: string;
  etfSurcharges: number;
  etfChequeNo: string;
  etfPayDay: string;
};

// Utility function to check if a period string (YYYY-MM) is before another period string
export const isPeriodBefore = (period: string, compareTo: string): boolean => {
  const [yearStr, monthStr] = period.split("-");
  const [compareYearStr, compareMonthStr] = compareTo.split("-");

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const compareYear = parseInt(compareYearStr, 10);
  const compareMonth = parseInt(compareMonthStr, 10);

  if (year < compareYear) {
    return true;
  } else if (year === compareYear) {
    return month < compareMonth;
  } else {
    return false;
  }
};

export const getData = async (
  companyId: string,
  period: string,
  needPayment: boolean = false,
  pdfType: string,
  salaryIds: string[] | undefined = undefined
) => {
  await dbConnect();

  // Fetch company details
  const company = await Company.findById(companyId).select(
    "name employerNo address requiredDocs"
  );

  const needInOut =
    pdfType === "attendance" ||
    (pdfType === "all" && company.requiredDocs.attendance) ||
    (pdfType === "print" && company.requiredDocs.attendance);

  // Fetch employees of the company
  const employees = await Employee.find({ company: companyId }).select(
    "memberNo name nic designation"
  );

  // Ensure employees are fetched correctly
  if (!employees || employees.length === 0) {
    throw new Error("No employees found for the given company.");
  }

  // Fetch salaries and populate employee details in one query
  const salaries = await Salary.find({
    employee: { $in: employees.map((employee) => employee._id) },
    ...(salaryIds ? { _id: { $in: salaryIds } } : {}),
    period,
  })
    .populate("employee", "memberNo name nic")
    .select(needInOut ? "" : "-inOut"); // Exclude the 'inOut' field if needInout is false

  // Ensure salaries are fetched correctly
  if (!salaries || salaries.length === 0) {
    throw new Error("No salaries found for the given criteria.");
  }

  // sort salaries by memberNo after parsing int
  salaries.sort((a, b) => {
    return parseInt(a.employee.memberNo) - parseInt(b.employee.memberNo);
  });

  let payment = undefined;
  if (needPayment) {
    // Fetch payments
    payment = await Payment.findOne({
      company: companyId,
      period,
    });
  }
  //fill payment with "" or 0 if undefined
  payment = {
    _id: payment?._id || "",
    company: payment?.company || "",
    period: payment?.period || "",
    epfReferenceNo: payment?.epfReferenceNo || "",
    epfAmount: payment?.epfAmount || 0,
    epfPaymentMethod: payment?.epfPaymentMethod || "",
    epfChequeNo: payment?.epfChequeNo || "",
    epfSurcharges: payment?.epfSurcharges || 0,
    epfPayDay: payment?.epfPayDay || "",
    etfAmount: payment?.etfAmount || 0,
    etfPaymentMethod: payment?.etfPaymentMethod || "",
    etfSurcharges: payment?.etfSurcharges || 0,
    etfChequeNo: payment?.etfChequeNo || "",
    etfPayDay: payment?.etfPayDay || "",
  };

  return { company, salaries, payment, employees };
};

export const setupData = (salaries: SalarySchema[]) => {
  // Initial static columns
  const columns = [
    {
      dataKey: "memberNo",
      header: "MEMBER NO.",
    },
    {
      dataKey: "name",
      header: "NAME",
    },
    {
      dataKey: "nic",
      header: "NIC",
    },
    {
      dataKey: "basic",
      header: "BASIC",
    },
  ];

  // add budgetary from
  if (
    salaries.length > 0 &&
    isPeriodBefore(salaries[0]?.period, budgetaryRemovePeriod)
  ) {
    columns.push({
      dataKey: "budgetaryAllowance",
      header: "BUDGETARY ALLOWANCE (+)",
    });
  }

  const toPush = [];
  if (salaries.some((salary) => salary.holidayPay !== 0)) {
    toPush.push({ dataKey: "holidayPay", header: "HOLIDAY PAY (+)" });
  }

  if (salaries.some((salary) => salary.noPay.amount !== 0)) {
    toPush.push({ dataKey: "noPay", header: "NO PAY (-)" });
  }

  // if atleast one has nopay or holiday pay then add basic with BA column
  if (toPush.length > 0) {
    if (isPeriodBefore(salaries[0]?.period, budgetaryRemovePeriod)) {
      columns.push({
        dataKey: "basicWithBA",
        header: "BASIC (WITH B.A.)",
      });
    }
    columns.push(...toPush);
  }

  columns.push(
    {
      dataKey: "totalEarnings",
      header: "TOTAL EARNINGS",
    },
    {
      dataKey: "epf12",
      header: "EPF (EMPLOYER 12%)",
    },
    {
      dataKey: "epf8",
      header: "EPF (EMPLOYEE 8%) (-)",
    },
    {
      dataKey: "etf3",
      header: "ETF (EMPLOYER 3%)",
    }
  );

  const records: { [key: string]: string | number }[] = [];
  const additions = new Set<string>();
  const deductions = new Set<string>();

  // Iterate over salaries and build records
  salaries.forEach((salary) => {
    const basicWithBA = salary.basic;
    const budgetaryAllowance = 3500;
    let affectTotalEarnings = 0;
    //loop through additions and deductions
    salary.paymentStructure.additions.forEach((addition) => {
      if (addition.affectTotalEarnings) {
        affectTotalEarnings +=
          typeof addition.amount === "number"
            ? addition.amount
            : parseFloat(addition.amount);
      }
    });
    salary.paymentStructure.deductions.forEach((deduction) => {
      if (deduction.affectTotalEarnings) {
        affectTotalEarnings -=
          typeof deduction.amount === "number"
            ? deduction.amount
            : parseFloat(deduction.amount);
      }
    });

    const totalEarnings =
      basicWithBA +
      (salary.holidayPay || 0) -
      (salary.noPay.amount || 0) +
      affectTotalEarnings;
    const modifiedSalary: { [key: string]: any } = {
      memberNo: salary.employee.memberNo,
      name: salary.employee.name,
      nic: salary.employee.nic,
      basic: isPeriodBefore(salary.period, budgetaryRemovePeriod)
        ? salary.basic - budgetaryAllowance
        : salary.basic,
      budgetaryAllowance, // Example static value
      basicWithBA,
      holidayPay: salary.holidayPay,
      noPay: salary.noPay.amount || 0,
      totalEarnings,
      epf12: totalEarnings * 0.12,
      etf3: totalEarnings * 0.03,
      epf8: totalEarnings * 0.08,
      advanceAmount: salary.advanceAmount,
      finalSalary: salary.finalSalary,
    };

    if (salary.inOut) {
      modifiedSalary.inOut = salary.inOut;
    }

    // Add dynamic additions
    salary.paymentStructure.additions.forEach(
      (addition: { name: string; amount: string | number }) => {
        const nameText = `${addition.name.toUpperCase()} (+)`;
        additions.add(nameText); // Collect dynamic addition columns
        modifiedSalary[nameText] = addition.amount || 0;
      }
    );

    // Add dynamic deductions
    salary.paymentStructure.deductions.forEach(
      (deduction: { name: string; amount: string | number }) => {
        const excludedDeductions = ["EPF 8%"]; //exclude EPF 8% from deductions because it is already included
        if (!excludedDeductions.includes(deduction.name.toUpperCase())) {
          const nameText = `${deduction.name.toUpperCase()} (-)`;
          deductions.add(nameText); // Collect dynamic deduction columns
          modifiedSalary[nameText] = deduction.amount || 0;
        }
      }
    );

    if (salary.ot && salary.ot.amount !== 0) {
      modifiedSalary["OT (+)"] = salary.ot.amount;
      additions.add("OT (+)");
    }

    // Push the modified record into the records array
    records.push(modifiedSalary);
  });

  // Add dynamic addition and deduction columns
  additions.forEach((addition) => {
    columns.push({ dataKey: addition, header: addition });
  });
  deductions.forEach((deduction) => {
    columns.push({ dataKey: deduction, header: deduction });
  });

  //if atleast one has advance then add advance column
  if (records.some((record) => record.advanceAmount !== 0)) {
    columns.push({ dataKey: "advanceAmount", header: "ADVANCE (-)" });
  }

  // Finalize columns by adding static columns like "FINAL SALARY"
  columns.push({ dataKey: "finalSalary", header: "FINAL SALARY" });

  //if inOut is available in salary then add it to columns
  if (salaries[0].inOut) {
    columns.push({ dataKey: "inOut", header: "IN/OUT" });
  }

  // Prepare data based on columns
  const data: (string | number)[][] = records.map((record) => {
    return columns.map((column) => record[column.dataKey] || ""); // Default to "-" if data is missing
  });

  //add 2 blank rows
  data.push(Array(columns.length).fill(""));
  data.push(Array(columns.length).fill(""));

  //totals
  const totals = columns.map((column) => {
    if (column.dataKey === "memberNo") {
      return "TOTAL";
    } else if (column.dataKey === "name" || column.dataKey === "nic") {
      return "";
    } else {
      let total = 0;
      for (let i = 0; i < records.length; i++) {
        total += Number(records[i][column.dataKey]) || 0;
      }
      return total;
    }
  });
  data.push(totals);

  return {
    columns,
    data,
  };
};

const getCombinedPayslips = async (
  company: CompanySchema,
  period: string,
  columns: { dataKey: string; header: string }[],
  data: (string | number)[][],
  employees: {
    _id: string;
    memberNo: number;
    name: string;
    nic: string;
    designation: string;
  }[]
) => {
  const mergePdfsIntoQuads = async (pdfsToMerge: ArrayBuffer[]) => {
    const mergedPdf = await PDFDocument.create();
    let page = mergedPdf.addPage();
    const { width, height } = page.getSize();

    let pdfIndex = 0;

    for (let i = 0; i < pdfsToMerge.length; i += 4) {
      // For each set of 4 PDFs, create a new page if necessary
      if (i > 0) page = mergedPdf.addPage();

      // Loop over a set of 4 PDFs (or less, if remaining are fewer than 4)
      for (let j = 0; j < 4; j++) {
        pdfIndex = i + j;
        if (pdfIndex >= pdfsToMerge.length) break; // If no more PDFs left

        const pdfBuffer = pdfsToMerge[pdfIndex];
        const pdf = await PDFDocument.load(pdfBuffer);
        const [embeddedPage] = await mergedPdf.embedPages(pdf.getPages());

        // Calculate positions to place each PDF page in a 2x2 grid
        const xOffset = (j % 2) * (width / 2); // Two columns
        const yOffset = height - Math.floor(j / 2) * (height / 2) - height / 2; // Two rows

        // Draw the embedded page on the merged document
        page.drawPage(embeddedPage, {
          x: xOffset,
          y: yOffset,
          width: width / 2, // Scaling to fit 4 on a single page
          height: height / 2,
        });
      }
    }

    const mergedPdfFile = await mergedPdf.save();
    return mergedPdfFile;
  };

  const paySlipDocArrays: ArrayBuffer[] = [];

  // Iterate over each salary record to generate payslips, avoiding the last 3
  for (let i = 0; i < data.length - 3; i++) {
    const salary = data[i];
    // Find the employee by their memberNo (first column in salary data)
    let employee = employees.find((e) => e.memberNo === salary[0]);
    if (!employee) {
      employee = undefined;
    }

    // Get the payslip document (assuming getPaySlipDoc returns a jsPDF instance)
    const payslipDoc = getPaySlipDoc(
      company,
      period,
      columns,
      salary,
      employee
    );

    // Convert jsPDF document to arraybuffer
    const payslipArrayBuffer = payslipDoc.output("arraybuffer");
    paySlipDocArrays.push(payslipArrayBuffer);
  }

  // Combine the payslips into quads and await the result
  const combinedPayslips = await mergePdfsIntoQuads(paySlipDocArrays);
  return combinedPayslips;
};

const getCombinedAttendance = async (
  company: CompanySchema,
  period: string,
  columns: { dataKey: string; header: string }[],
  data: (string | number)[][],
  employees: {
    _id: string;
    memberNo: number;
    name: string;
    nic: string;
    designation: string;
  }[]
) => {
  const mergePdfsIntoQuads = async (pdfsToMerge: ArrayBuffer[]) => {
    const mergedPdf = await PDFDocument.create();
    let page = mergedPdf.addPage();
    const { width, height } = page.getSize();

    let pdfIndex = 0;

    for (let i = 0; i < pdfsToMerge.length; i += 4) {
      // For each set of 4 PDFs, create a new page if necessary
      if (i > 0) page = mergedPdf.addPage();

      // Loop over a set of 4 PDFs (or less, if remaining are fewer than 4)
      for (let j = 0; j < 4; j++) {
        pdfIndex = i + j;
        if (pdfIndex >= pdfsToMerge.length) break; // If no more PDFs left

        const pdfBuffer = pdfsToMerge[pdfIndex];
        const pdf = await PDFDocument.load(pdfBuffer);
        const [embeddedPage] = await mergedPdf.embedPages(pdf.getPages());

        // Calculate positions to place each PDF page in a 2x2 grid
        const xOffset = (j % 2) * (width / 2); // Two columns
        const yOffset = height - Math.floor(j / 2) * (height / 2) - height / 2; // Two rows

        // Draw the embedded page on the merged document
        page.drawPage(embeddedPage, {
          x: xOffset,
          y: yOffset,
          width: width / 2, // Scaling to fit 4 on a single page
          height: height / 2,
        });
      }
    }

    const mergedPdfFile = await mergedPdf.save();
    return mergedPdfFile;
  };

  const attendanceDocArrays: ArrayBuffer[] = [];

  // Iterate over each salary record to generate payslips, avoiding the last 3
  for (let i = 0; i < data.length - 3; i++) {
    const salary = data[i];
    // Find the employee by their memberNo (first column in salary data)
    let employee = employees.find((e) => e.memberNo === salary[0]);
    if (!employee) {
      employee = undefined;
    }

    // Get the payslip document (assuming getPaySlipDoc returns a jsPDF instance)
    const attendanceDoc = getAttendanceDoc(
      company,
      period,
      columns,
      salary,
      employee
    );

    // Convert jsPDF document to arraybuffer
    const attendanceArrayBuffer = attendanceDoc.output("arraybuffer");
    attendanceDocArrays.push(attendanceArrayBuffer);
  }

  // Combine the payslips into quads and await the result
  const combinedAttendance = await mergePdfs(attendanceDocArrays);
  return combinedAttendance;
};

export const mergePdfs = async (pdfsToMerges: ArrayBuffer[]) => {
  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfsToMerges) {
    const pdf = await PDFDocument.load(pdfBuffer); // Load each PDF in the order of the array
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices()); // Copy pages from the original PDF
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page); // Add each page to the merged PDF in sequence
    });
  }

  const mergedPdfFile = await mergedPdf.save(); // Save the merged PDF
  return mergedPdfFile; // Return the final merged PDF file
};

export const getPDFOutput = async (
  company: CompanySchema,
  period: string,
  columns: { dataKey: string; header: string }[],
  data: (string | number)[][],
  payment: PaymentSchema,
  pdfType: string,
  employees: {
    _id: string;
    memberNo: number;
    name: string;
    nic: string;
    designation: string;
  }[]
) => {
  let pdfOutput;
  if (pdfType === "salary") {
    pdfOutput = getSalaryDoc(company, period, columns, data).output(
      "arraybuffer"
    );
  } else if (pdfType === "epf") {
    pdfOutput = getEPFDoc(company, period, columns, data, payment).output(
      "arraybuffer"
    );
  } else if (pdfType === "etf") {
    pdfOutput = getETFDoc(company, period, columns, data, payment).output(
      "arraybuffer"
    );
  } else if (pdfType === "payslip") {
    pdfOutput = await getCombinedPayslips(
      company,
      period,
      columns,
      data,
      employees
    );
  } else if (pdfType === "attendance") {
    pdfOutput = await getCombinedAttendance(
      company,
      period,
      columns,
      data,
      employees
    );
  } else if (pdfType === "all" || pdfType === "print") {
    const salaryDoc = company.requiredDocs.salary
      ? getSalaryDoc(company, period, columns, data).output("arraybuffer")
      : undefined;
    const epfDoc = company.requiredDocs.epf
      ? getEPFDoc(company, period, columns, data, payment).output("arraybuffer")
      : undefined;
    const etfDoc = company.requiredDocs.etf
      ? getETFDoc(company, period, columns, data, payment).output("arraybuffer")
      : undefined;
    const payslipDoc = company.requiredDocs.paySlip
      ? await getCombinedPayslips(company, period, columns, data, employees)
      : undefined;

    let rotatedSalaryDoc = undefined;
    let arrayBuffers = [];
    if (salaryDoc && pdfType === "print") {
      // Rotate salary document pages by 90 degrees
      const salaryPdfDoc = await PDFDocument.load(salaryDoc);
      const rotatedSalaryPdfPages = salaryPdfDoc.getPages();
      rotatedSalaryPdfPages.forEach((page) => page.setRotation(degrees(90)));
      rotatedSalaryDoc = await salaryPdfDoc.save();
    }

    if (pdfType === "all") {
      if (salaryDoc) arrayBuffers.push(salaryDoc);
      if (epfDoc) arrayBuffers.push(epfDoc);
      if (etfDoc) arrayBuffers.push(etfDoc);
      if (payslipDoc) arrayBuffers.push(payslipDoc.buffer as ArrayBuffer);
    } else {
      if (rotatedSalaryDoc)
        arrayBuffers.push(rotatedSalaryDoc.buffer as ArrayBuffer);
      if (epfDoc) arrayBuffers.push(epfDoc);
      if (epfDoc) arrayBuffers.push(epfDoc);
      if (etfDoc) arrayBuffers.push(etfDoc);
      if (etfDoc) arrayBuffers.push(etfDoc);
      if (payslipDoc) arrayBuffers.push(payslipDoc.buffer as ArrayBuffer);
    }

    //if 0 throw error
    if (arrayBuffers.length === 0) {
      throw new Error("No documents to merge");
    }
    //combine
    pdfOutput = await mergePdfs(arrayBuffers);
  }
  return pdfOutput;
};
