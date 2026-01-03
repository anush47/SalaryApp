import { AttendanceService } from "../../attendance/service";
import { ProcessedInOut, RawInOut } from "../generate/salaryGeneration";

export class SalaryAttendanceService {
    /**
     * Prepares the initial In/Out data for salary generation.
     * Fetches live attendance if required or uses provided data.
     */
    static async prepareAttendanceData(
        companyId: string,
        period: string,
        employees: any[],
        companyTimezone: string,
        providedInOut: RawInOut | ProcessedInOut | undefined,
        update: boolean,
        useLiveAttendance: boolean
    ): Promise<{ [employeeId: string]: RawInOut }> {
        // Define an interface for RawInOut as a Dictionary
        let inOutInitial: { [employeeId: string]: RawInOut } = {};

        // Use ProcessedInOut if this is an update and data is passed back
        if (update && Array.isArray(providedInOut)) {
            // In update mode with processed data, we might not fetch live attendance again unless requested
            // Casting strictly to avoid type confusion
            inOutInitial = providedInOut as any;
        } else {
            // Fetch attendance for all employees that use 'attendance' method or have requested live attendance
            // Filter employees who need attendance data
            const attendanceEmployeeIds = employees
                .filter(
                    (e) =>
                        e.calculationMethod === "attendance" || useLiveAttendance
                )
                .map((e) => (e._id as any).toString());

            if (attendanceEmployeeIds.length > 0) {
                const liveAttendanceMap = await AttendanceService.getAttendanceForSalaryPeriod(
                    companyId,
                    period,
                    attendanceEmployeeIds,
                    companyTimezone
                );

                // Map to inOutInitial structure
                inOutInitial = liveAttendanceMap;
            }
        }

        return inOutInitial;
    }
}
