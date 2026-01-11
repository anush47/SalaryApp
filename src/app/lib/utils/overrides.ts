/**
 * Centralized logic for Employee vs Company settings overrides.
 * Rule: If the specific override flag is enabled for the employee, use the employee's settings.
 * Otherwise, fallback to the company defaults.
 */

export const getEffectiveShiftSettings = (company: any, employee: any) => {
    if (employee?.overrides?.shifts && employee?.shiftSettings) {
        return employee.shiftSettings;
    }
    return company?.shiftSettings;
};

export const getEffectiveShifts = (company: any, employee: any) => {
    const settings = getEffectiveShiftSettings(company, employee);
    return settings?.shifts || [];
};

export const getEffectiveAttendanceConfig = (company: any, employee: any) => {
    if (employee?.overrides?.attendance && employee?.attendanceOverrides) {
        // Map attendanceOverrides to the same structure as company.attendanceConfig if they differ
        // Backend uses attendanceOverrides on Employee and attendanceConfig on Company.
        return employee.attendanceOverrides;
    }
    return company?.attendanceConfig;
};

export const getEffectiveWorkingDays = (company: any, employee: any) => {
    if (employee?.overrides?.workingDays && employee?.workingDays) {
        return employee.workingDays;
    }
    return company?.workingDays;
};

export const getEffectiveLeaveTypes = (company: any, employee: any) => {
    if (employee?.overrides?.leaveTypes && employee?.leaveTypes) {
        return employee.leaveTypes;
    }
    return company?.leaveTypes;
};

export const getEffectiveSalaryPeriod = (company: any, employee: any) => {
    if (employee?.overrides?.salaryPeriod && employee?.salaryPeriod) {
        return employee.salaryPeriod;
    }
    return company?.salaryPeriod;
};

export const getEffectivePaymentStructure = (company: any, employee: any) => {
    if (employee?.overrides?.paymentStructure && employee?.paymentStructure) {
        return employee.paymentStructure;
    }
    return company?.paymentStructure;
};

export const getEffectiveCalendar = (company: any, employee: any) => {
    if (employee?.overrides?.calendar && employee?.calendar) {
        return employee.calendar;
    }
    return company?.calendar;
};

export const getEffectiveProbabilities = (company: any, employee: any) => {
    if (employee?.overrides?.probabilities && employee?.probabilities) {
        return employee.probabilities;
    }
    return company?.probabilities;
};
