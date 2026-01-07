import dayjs from "dayjs";

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
        thresholdMinutes = 300; // 5 hours
    } else if (statusLower === 'off' || statusLower === 'holiday' || statusLower.includes('weekend')) {
        thresholdMinutes = 0; // All worked time is OT
    }

    if (netWorkedMinutes <= thresholdMinutes) {
        return 0;
    }

    return netWorkedMinutes - thresholdMinutes;
};
