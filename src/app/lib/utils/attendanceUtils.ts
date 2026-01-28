import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Types derived from existing interfaces - Used for geofencing and attendance configuration mapping
export interface GeoConfig {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    enforceValidation?: boolean;
    allowedLocations?: {
        lat?: number;
        lng?: number;
        latitude?: number;
        longitude?: number;
        radius: number;
        name: string;
    }[];
}

export interface AttendanceOverrides {
    enabled: boolean;
    isRemote: boolean;
    geoFencing?: GeoConfig;
}

export interface CompanyConfig {
    geoFencing?: GeoConfig;
    allowRemoteCheckIn?: boolean;
    attendanceConfig?: {
        enabled?: boolean;
        allowRemoteCheckIn?: boolean;
        geoFencing?: GeoConfig;
    };
}

export interface Zone {
    lat: number;
    lng: number;
    radius: number;
    name: string;
    isPrimary?: boolean;
}

/**
 * Calculates the effective allowed zones for an employee by merging
 * Company Configuration with Employee Overrides.
 * MATCHES BACKEND AttendanceService.ts LOGIC
 */
export const getEffectiveAllowedZones = (
    companyConfig: CompanyConfig | undefined,
    employeeOverrides: AttendanceOverrides | undefined
): {
    zones: Zone[];
    isGeofencingEnabled: boolean;
    enforceValidation: boolean;
    primaryZone: Zone | null;
} => {
    // Resolve Company-level GeoConfig (check root and attendanceConfig)
    let companyGeo: GeoConfig | undefined = companyConfig?.geoFencing || companyConfig?.attendanceConfig?.geoFencing;

    let geoConfig: GeoConfig | undefined = companyGeo;
    let additionalZones: any[] = [];

    // 1. Check if Override is enabled and set to Remote
    if (employeeOverrides?.enabled && employeeOverrides.isRemote) {
        // Remote workers skip geofencing entirely
        return { zones: [], isGeofencingEnabled: false, enforceValidation: false, primaryZone: null };
    }

    // 2. Resolve GeoConfig (Backend logic: Fallback to company if override geofencing is disabled)
    if (employeeOverrides?.enabled && employeeOverrides.geoFencing?.enabled) {
        // Use Employee Override Geofencing
        geoConfig = employeeOverrides.geoFencing;
        additionalZones = geoConfig.allowedLocations || [];
    } else {
        // Use Company Geofencing (either no override, or override geofencing is disabled)
        additionalZones = geoConfig?.allowedLocations || [];
    }

    if (!geoConfig) {
        return { zones: [], isGeofencingEnabled: false, enforceValidation: false, primaryZone: null };
    }

    const zones: Zone[] = [];
    let primaryZone: Zone | null = null;

    // 1. Primary Zone (Office/Home Base)
    if (geoConfig.enabled && geoConfig.latitude && geoConfig.longitude) {
        primaryZone = {
            lat: geoConfig.latitude,
            lng: geoConfig.longitude,
            radius: geoConfig.radiusMeters || 100,
            name: "Primary Zone",
            isPrimary: true
        };
        zones.push(primaryZone);
    }

    // 2. Additional Zones
    if (additionalZones.length > 0) {
        additionalZones.forEach((loc, idx) => {
            const lat = loc.lat || loc.latitude;
            const lng = loc.lng || loc.longitude;

            if (lat && lng) {
                zones.push({
                    lat: lat,
                    lng: lng,
                    radius: loc.radius || 100,
                    name: loc.name || `Allowed Zone ${idx + 1}`,
                    isPrimary: false
                });
            }
        });
    }

    return {
        zones,
        isGeofencingEnabled: geoConfig.enabled,
        enforceValidation: !!geoConfig.enforceValidation,
        primaryZone
    };
};

/**
 * Utils for distance calculation
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Standarized Overtime Calculation
 * Logic:
 * 1. Net Worked Hours = Total Duration - Shift Break
 * 2. If Half Day: Threshold is 5 hours (300 mins)
 * 3. If Off Day / Holiday: Threshold is 0 (All worked time is OT)
 * 4. If Full Day: Threshold is 8 hours (480 mins)
 * 5. OT = Net Worked Hours - Threshold (min 0)
 */
export const calculateOT = (
    totalDurationMinutes: number,
    breakDurationMinutes: number,
    dayStatus: string // 'Full Day' | 'Half Day' | 'Off' | 'Holiday' ...
): number => {
    // 1. Deduct Break
    // Note: totalDurationMinutes usually is "Clock Out - Clock In", which INCLUDES break time if they didn't clock out for break.
    // If the system tracks breaks separately effectively, input should adjust.
    // Assuming totalDurationMinutes is the raw difference between First IN and Last OUT (or sum of sessions), which implicitly includes break time if they are on premises.
    // If the user says "ignore the selected shifts break", they usually mean "deduct it".

    // Safety check
    if (totalDurationMinutes <= 0) return 0;

    const netWorkedMinutes = totalDurationMinutes - (breakDurationMinutes || 0);

    // 2. Determine Threshold
    let thresholdMinutes = 480; // Default Full Day 8h

    const statusLower = dayStatus?.toLowerCase() || "";

    if (statusLower.includes('half')) {
        thresholdMinutes = 360; // 6 hours
    } else if (statusLower === 'off' || statusLower === 'holiday' || statusLower.includes('weekend')) {
        thresholdMinutes = 0; // All worked time is OT
    }

    if (netWorkedMinutes <= thresholdMinutes) {
        return 0;
    }

    return netWorkedMinutes - thresholdMinutes;
};

/**
 * Calculates the "Effective Duration" for OT purposes.
 * 
 * @param sessions Array of { in: Date, out?: Date }
 * @param shiftStartTimeStr Optional shift start time "HH:mm" (e.g. "08:00")
 * @param useShiftStartForOT Boolean flag behavior
 * 
 * Logic:
 * 1. If `useShiftStartForOT` is TRUE and `shiftStartTimeStr` is provided:
 *    - For the FIRST session only:
 *      - If Actual IN < Shift Start: Effective IN = Shift Start (Clamp early arrival)
 *      - If Actual IN > Shift Start: Effective IN = Actual IN (Late arrival counts as is)
 *    - Subsequent sessions use actual times.
 * 2. If FALSE, use actual times for everything.
 * 
 * Returns total minutes.
 */
export const calculateEffectiveDuration = (
    sessions: { in: Date; out?: Date }[],
    shiftStartTimeStr?: string,
    useShiftStartForOT: boolean = false,
    companyTimezone: string = "Asia/Colombo"
): number => {
    if (!sessions || sessions.length === 0) return 0;

    // Helper to parse Shift Start Time relative to a specific date
    // Helper to parse Shift Start Time relative to a specific date in Company Timezone
    const getShiftStartDate = (date: Date, timeStr: string) => {
        // Use dayjs to handle timezone correctly
        // 1. Convert input date to company timezone
        // 2. Set hours/minutes
        // 3. returned Date is in UTC equivalent
        const [hours, mins] = timeStr.split(':').map(Number);

        // Ensure valid timezone
        const tz = companyTimezone || "Asia/Colombo";

        const shiftStart = dayjs(date).tz(tz)
            .hour(hours)
            .minute(mins)
            .second(0)
            .millisecond(0);

        return shiftStart.toDate();
    };

    let totalMinutes = 0;

    // Sort sessions by time to ensure we identify the "First" one correctly
    const sortedSessions = [...sessions].sort((a, b) => a.in.getTime() - b.in.getTime());

    sortedSessions.forEach((session, index) => {
        const inTime = session.in;
        const outTime = session.out || new Date(); // If running live, out is "now"

        let effectiveIn = inTime;

        // Apply Clamping ONLY to the very first session of the day
        if (index === 0 && useShiftStartForOT && shiftStartTimeStr) {
            const shiftStart = getShiftStartDate(inTime, shiftStartTimeStr);

            // If checked in BEFORE shift start, clamp to shift start
            if (inTime < shiftStart) {
                // However, ensure we don't clamp if they checked out before shift even started? 
                // (e.g. Came 6am, Left 7am, Shift 8am). 
                // If outTime < shiftStart, duration is 0 for OT context?
                // Logic: "Work done before shift doesn't count for OT/Hours if this flag is on".

                if (outTime < shiftStart) {
                    effectiveIn = outTime; // Resulting duration 0
                } else {
                    effectiveIn = shiftStart;
                }
            }
        }

        const durationMs = outTime.getTime() - effectiveIn.getTime();
        const durationMins = Math.max(0, Math.floor(durationMs / 60000));

        totalMinutes += durationMins;
    });

    return totalMinutes;
};

/**
 * Calculates the difference in minutes between a shift start time and actual IN time.
 */
export const getTimeDifferenceInMinutes = (
    shift: string,
    inOut: Date,
    timezone: string
): number => {
    const [hours, minutes] = shift.split(":").map(Number);
    const localDate = dayjs(inOut).tz(timezone);
    const timeDiff =
        hours * 60 + minutes - (localDate.hour() * 60 + localDate.minute());
    return timeDiff;
};

/**
 * Calculates holiday pay bonus based on holiday type and hours worked.
 */
export const calculateHolidayPay = (
    holidayText: string,
    workingHours: number,
    workingHoursTreshold: number,
    basic: number,
    divideBy: number
) => {
    const recordHolidays = new Set(
        holidayText.split(/[\s,]+/).map((h) => h.trim().toLowerCase())
    );

    let holidayPayMultiplier = 0;
    if (recordHolidays.has("mercantile") || recordHolidays.has("off")) {
        holidayPayMultiplier = 1; // Double pay for working, so bonus is 1x basic rate.
    } else if (recordHolidays.has("public")) {
        holidayPayMultiplier = 0.5; // 1.5x pay for working, so bonus is 0.5x basic rate.
    }

    let holidayPay = 0;
    if (holidayPayMultiplier > 0) {
        const basePayForHours =
            (basic / divideBy) * Math.min(workingHoursTreshold, workingHours);
        holidayPay = basePayForHours * holidayPayMultiplier;
    }

    return { holidayPay, holidayPayMultiplier };
};
