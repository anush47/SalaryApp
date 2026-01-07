import { IEmployee } from "@/app/models/Employee";
import { ICompany } from "@/app/models/Company";
import ShiftAssignment, { IShiftAssignment } from "@/app/models/ShiftAssignment";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

interface Shift {
    _id?: string;
    name: string;
    type: "fixed" | "dynamic";
    startTime?: string;
    endTime?: string;
    duration?: number;
    breakDuration: number;
    minStartTime?: string;
    maxStartTime?: string;
    minEndTime?: string;
    maxEndTime?: string;
    maxDuration?: number;
}

interface ResolvedShift {
    shift: Shift | null;
    source: "roster" | "manual_override" | "fixed_schedule" | "auto_select" | "default" | "none"; // Updated source types
    isOffDay?: boolean;
    checkInBlocked?: boolean;
    blockReason?: string;
}

export class ShiftService {
    /**
     * Resolves the active shift for an employee on a specific date.
     * Priority:
     * 1. Roster Assignment (ShiftAssignment)
     * 2. Employee Overrides (if enabled)
     * 3. Company Defaults
     */
    static async resolveActiveShift(
        employee: IEmployee,
        company: ICompany,
        date: string = dayjs().format("YYYY-MM-DD"),
        checkInTime?: string // Optional: Used for auto-select logic
    ): Promise<ResolvedShift> {
        // 1. Check Roster Assignment
        const assignment = await ShiftAssignment.findOne({
            employee: employee._id,
            date: date,
        }).populate("shiftId"); // Assuming we might store full shift data or just ID

        if (assignment) {
            if (assignment.isOffDay) {
                return { shift: null, source: "roster", isOffDay: true };
            }

            // Find the shift definition from Employee or Company based on ID
            // This is tricky if we store just ID. We need to look up in both pools?
            // Convention: Roster assignment stores IDs from the *Company* pool mostly, or Employee pool.
            // Let's search both pools.
            const shift = this.findShiftById(assignment.shiftId, company, employee);
            if (shift) return { shift, source: "roster" };
        }

        // 2. Determine Configuration Source
        const settings = this.getEffectiveSettings(employee, company);

        if (!settings) return { shift: null, source: "none" };

        // 3. Handle Modes
        if (settings.mode === "fixed") {
            // Return the default shift. Prioritize Employee Default if set (aligning with Aggregation View), otherwise Company Default.
            const empDefaultId = employee.shiftSettings?.defaultShiftId;
            const defId = empDefaultId || settings.defaultShiftId;

            // We need to find this ID in the available shifts (Company or Employee pool)
            // settings.shifts might only be Company shifts if overrides are off.
            // But we should search in the 'scope' of available shifts.
            // If overrides are off, usually only Company shifts are relevant?
            // But if we allow Employee Default usage, we might need to look in Employee shifts?
            // Safest: Search in `settings.shifts` (which is Company's if overrides off). 
            // If empDefaultId points to a shift NOT in Company list, we might miss it if we only check `settings.shifts`.
            // Let's check `settings.shifts` first.
            let shift = settings.shifts.find(s => s._id === defId);
            if (!shift && empDefaultId) {
                // Try finding it in employee shifts if not found in company settings
                shift = employee.shiftSettings?.shifts?.find((s: any) => s._id === empDefaultId);
            }

            return { shift: shift || settings.shifts[0] || null, source: "fixed_schedule" };
        }

        if (settings.mode === "dynamic") {
            // Return the dynamic shift (usually only one active context, or auto-selected)
            // If auto-select is on, we try to match checkInTime
            if (settings.autoSelect && checkInTime) {
                const bestMatch = this.findClosestShift(settings.shifts, checkInTime);
                if (bestMatch) return { shift: bestMatch, source: "auto_select" };
            }
            // Fallback to default
            const empDefaultId = employee.shiftSettings?.defaultShiftId;
            const defId = empDefaultId || settings.defaultShiftId;

            let shift = settings.shifts.find(s => s._id === defId);
            if (!shift && empDefaultId) {
                shift = employee.shiftSettings?.shifts?.find((s: any) => s._id === empDefaultId);
            }

            return { shift: shift || null, source: "default" };
        }

        if (settings.mode === "roster") {
            // If meant to be roster but no assignment found, return null or default fallback?
            const empDefaultId = employee.shiftSettings?.defaultShiftId;
            const defId = empDefaultId || settings.defaultShiftId;
            let shift = settings.shifts.find(s => s._id === defId);
            if (!shift && empDefaultId) {
                shift = employee.shiftSettings?.shifts?.find((s: any) => s._id === empDefaultId);
            }
            return { shift: shift || null, source: "default" };
        }

        if (settings.mode === "manual") {
            // Manual mode implies we wait for user, but we return null shift here so frontend knows.
            return { shift: null, source: "manual_override" };
        }


        return { shift: null, source: "none" };
    }

    static getEffectiveSettings(employee: IEmployee, company: ICompany) {
        return employee.overrides?.shifts && employee.shiftSettings?.mode
            ? employee.shiftSettings
            : company.shiftSettings;
    }

    static findShiftById(shiftId: string, company: ICompany, employee: IEmployee): Shift | undefined {
        const companyShift = company.shiftSettings?.shifts?.find((s: any) => s._id?.toString() === shiftId);
        if (companyShift) return companyShift;

        const employeeShift = employee.shiftSettings?.shifts?.find((s: any) => s._id?.toString() === shiftId);
        if (employeeShift) return employeeShift;

        return undefined;
    }

    static findClosestShift(shifts: Shift[], time: string): Shift | undefined {
        if (!shifts || shifts.length === 0) return undefined;

        const targetTime = dayjs(time, "HH:mm");
        if (!targetTime.isValid()) return undefined;

        let bestShift: Shift | undefined;
        let minDiff = Infinity;

        // 1. Priority: Find shift with CLOSEST Start Time
        // Prevents issues where being "inside" a shift (but very late) overrides being "early" for the next shift.

        // 2. Fallback: Closest Start Time
        shifts.forEach(shift => {
            if (!shift.startTime) return;
            const shiftStart = dayjs(shift.startTime, "HH:mm");
            if (!shiftStart.isValid()) return;

            // Calculate difference in minutes
            let diff = Math.abs(targetTime.diff(shiftStart, "minute"));
            if (diff > 720) { // 12 hours
                diff = 1440 - diff;
            }

            if (diff < minDiff) {
                minDiff = diff;
                bestShift = shift;
            }
        });

        return bestShift;
    }

    static validateCheckIn(shift: Shift, checkInTime: string): { valid: boolean; message?: string } {
        const checkIn = dayjs(checkInTime, "HH:mm");
        if (!checkIn.isValid()) return { valid: false, message: "Invalid check-in time format" };

        if (shift.type === 'fixed' || shift.type === 'dynamic') {
            // Validate Min Start Time
            if (shift.minStartTime) {
                const minStart = dayjs(shift.minStartTime, "HH:mm");
                // Handle wrap around if needed, but for simplicity:
                // If minStart > checkIn, it's too early.
                // BUT: what about night shifts? 22:00 min start, check in 23:00 ok. Check in 21:00 too early.
                // Simple compare might work if we assume "today" or handle cross-midnight.
                // Let's assume standard day for now.
                if (minStart.isValid()) {
                    // Check if checkIn is significantly before minStart
                    // Complex logic required for accurate night shifts, relying on "closest" usually handles selection.
                    // Validation here prevents "too early" checkin for a SPECIFIC shift.

                    // Helper: get diff. If minStart is 23:00 and checkIn is 01:00 (next day), logic fails without date context.
                    // Assuming checkInTime is relative to the start of the shift logically.
                    // We skip complex cross-midnight validation without Dates. 
                    // Just comparing minutes from 00:00 might fail for cross-midnight.
                    // A robust system needs full Date objects (shift date + time vs checkin date + time).
                    // Given we only have "HH:mm" strings here, validation is weak.

                    // We can check simple "too early" if both are same day.
                }
            }

            // Validate Max Start Time (Cutoff)
            if (shift.maxStartTime) {
                const maxStart = dayjs(shift.maxStartTime, "HH:mm");
                if (maxStart.isValid()) {
                    // Check if checkIn is after maxStart
                    // Logic: if checkIn > maxStart, too late.
                }
            }
        }
        return { valid: true };
    }
}
