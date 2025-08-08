import { ProcessedInOut, RawInOut } from "./generate/salaryGeneration";

interface Employee {
  memberNo: string | number;
  _id: string;
}

// Helper function to parse and validate a date string
const parseDate = (time: string): Date | null => {
  const utcTime = `${time}Z`;
  const parsedDate = Date.parse(utcTime);

  if (isNaN(parsedDate)) {
    console.error(`Invalid date format: ${time}`);
    return null;
  }

  return new Date(parsedDate);
};

const replaceMemberNoWithEmployeeIdofRecords = (
  data: string[],
  employees: Employee[]
): string[] => {
  // Create a lookup map for efficient access: memberNo -> employeeId
  const memberNoToEmployeeIdMap = new Map<string, string>(
    employees.map((emp) => [String(emp.memberNo), emp._id])
  );

  // Use reduce to filter and map in a single pass, keeping only valid records
  return data.reduce<string[]>((acc, row) => {
    const columns = row.split(",");
    const memberNo = columns[0]?.trim();

    // Only Include records of given employees
    if (memberNo && memberNoToEmployeeIdMap.has(memberNo)) {
      columns[0] = memberNoToEmployeeIdMap.get(memberNo)!;
      acc.push(columns.join(","));
    }
    return acc;
  }, []);
};

// Main function to process inOut CSV data
export const initialInOutProcess = (
  data: string | ProcessedInOut,
  employees: Employee[] = []
) => {
  //if type is not string return as it is
  if (typeof data !== "string") {
    return data;
  }
  // Split the CSV data into lines and the header
  let [headerLine, ...rows] = data.trim().split("\n");
  const headers = headerLine.split(",");
  // if memberNo then replace all 1 column with relevant employeeId
  if (headers[0] === "memberNo") {
    rows = replaceMemberNoWithEmployeeIdofRecords(rows, employees);
  }
  const result: { [employeeId: string]: RawInOut } = {};

  // Process each row
  rows.forEach((row) => {
    const [employeeId, time] = row.split(",").map((cell) => cell.trim()); // Extract employee ID and time
    const parsedDate = parseDate(time);

    if (parsedDate) {
      // Initialize the employee entry if it does not exist
      if (!result[employeeId]) {
        result[employeeId] = [];
      }

      // Add the timestamp to the employee's array
      result[employeeId].push(parsedDate);
    }
  });

  // Return the structured result
  return result;
};
