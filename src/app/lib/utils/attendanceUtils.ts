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
