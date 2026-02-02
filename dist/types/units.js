/**
 * Unit and measurement types for Sous Chef
 */
/**
 * Create a duration from minutes
 */
export function durationFromMinutes(minutes) {
    return { minutes };
}
/**
 * Create a duration from hours and minutes
 */
export function durationFromHoursMinutes(hours, minutes) {
    return { minutes: hours * 60 + minutes };
}
/**
 * Format a duration for display
 */
export function formatDuration(duration) {
    const hours = Math.floor(duration.minutes / 60);
    const mins = duration.minutes % 60;
    if (hours === 0) {
        return `${mins} min`;
    }
    if (mins === 0) {
        return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
}
/**
 * Parse an ISO 8601 duration string (e.g., "PT15M", "PT1H30M")
 */
export function parseDuration(iso8601) {
    const match = iso8601.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
    if (!match) {
        return null;
    }
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return durationFromHoursMinutes(hours, minutes);
}
/**
 * Convert a duration to ISO 8601 format
 */
export function durationToISO8601(duration) {
    const hours = Math.floor(duration.minutes / 60);
    const mins = duration.minutes % 60;
    if (hours === 0) {
        return `PT${mins}M`;
    }
    if (mins === 0) {
        return `PT${hours}H`;
    }
    return `PT${hours}H${mins}M`;
}
/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit) {
    const volumeUnits = ['tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon', 'ml', 'l'];
    return volumeUnits.includes(unit);
}
/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit) {
    const weightUnits = ['oz', 'lb', 'g', 'kg'];
    return weightUnits.includes(unit);
}
/**
 * Check if a unit is a US unit
 */
export function isUSUnit(unit) {
    const usUnits = ['tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon', 'oz', 'lb'];
    return usUnits.includes(unit);
}
/**
 * Check if a unit is a metric unit
 */
export function isMetricUnit(unit) {
    const metricUnits = ['ml', 'l', 'g', 'kg'];
    return metricUnits.includes(unit);
}
/**
 * Get the unit system for a given unit
 */
export function getUnitSystem(unit) {
    if (isUSUnit(unit))
        return 'us';
    if (isMetricUnit(unit))
        return 'metric';
    return null;
}
//# sourceMappingURL=units.js.map