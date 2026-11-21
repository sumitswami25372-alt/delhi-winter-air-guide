/**
 * US EPA Air Quality Index categories and health messaging.
 * Category bands follow the EPA AQI technical assistance document
 * (https://www.airnow.gov/aqi/aqi-basics/).
 */
export type AqiLevel =
  "good" | "moderate" | "sensitive" | "unhealthy" | "very-unhealthy" | "hazardous";

export interface AqiCategory {
  level: AqiLevel;
  label: string;
  min: number;
  max: number;
  /** One-line general-population guidance. */
  summary: string;
}

export const AQI_CATEGORIES: readonly AqiCategory[] = [
  { level: "good", label: "Good", min: 0, max: 50, summary: "Air quality is satisfactory." },
  {
    level: "moderate",
    label: "Moderate",
    min: 51,
    max: 100,
    summary: "Unusually sensitive people should limit long outdoor exertion.",
  },
  {
    level: "sensitive",
    label: "Unhealthy for sensitive groups",
    min: 101,
    max: 150,
    summary:
      "Children, older adults and people with heart or lung conditions should reduce outdoor exertion.",
  },
  {
    level: "unhealthy",
    label: "Unhealthy",
    min: 151,
    max: 200,
    summary: "Everyone should reduce prolonged outdoor exertion; sensitive groups should avoid it.",
  },
  {
    level: "very-unhealthy",
    label: "Very unhealthy",
    min: 201,
    max: 300,
    summary:
      "Health alert: everyone should avoid prolonged outdoor exertion and keep indoor air clean.",
  },
  {
    level: "hazardous",
    label: "Hazardous",
    min: 301,
    max: Number.POSITIVE_INFINITY,
    summary: "Emergency conditions: stay indoors with filtered air and avoid all outdoor activity.",
  },
];

export function categorizeAqi(aqi: number): AqiCategory {
  if (!Number.isFinite(aqi) || aqi < 0) {
    throw new RangeError(`AQI must be a non-negative number, received ${aqi}`);
  }
  const rounded = Math.round(aqi);
  const found = AQI_CATEGORIES.find((c) => rounded >= c.min && rounded <= c.max);
  // The last band is open-ended, so a match always exists for valid input.
  return found ?? (AQI_CATEGORIES[AQI_CATEGORIES.length - 1] as AqiCategory);
}

export function aqiSeverity(aqi: number): number {
  return AQI_CATEGORIES.indexOf(categorizeAqi(aqi));
}

/** WHO 2021 annual PM2.5 guideline (5 µg/m³) and 24-hour guideline (15 µg/m³). */
export const WHO_PM25_24H = 15;

export function pm25TimesWhoGuideline(pm25: number): number {
  return Math.round((pm25 / WHO_PM25_24H) * 10) / 10;
}

export interface HourlyPoint {
  time: string;
  pm25: number | null;
  aqi: number | null;
}

export interface CleanWindow {
  start: string;
  end: string;
  avgPm25: number;
}

/**
 * Find the contiguous block of `hours` hours (within the provided points)
 * with the lowest average PM2.5. Used to suggest when to air the home
 * or schedule unavoidable outdoor tasks.
 */
export function findCleanestWindow(points: HourlyPoint[], hours = 2): CleanWindow | null {
  if (hours < 1 || points.length < hours) return null;
  let best: CleanWindow | null = null;
  for (let i = 0; i + hours <= points.length; i++) {
    const slice = points.slice(i, i + hours);
    if (slice.some((p) => p.pm25 === null)) continue;
    const avg = slice.reduce((sum, p) => sum + (p.pm25 ?? 0), 0) / hours;
    if (best === null || avg < best.avgPm25) {
      const first = slice[0] as HourlyPoint;
      const last = slice[slice.length - 1] as HourlyPoint;
      best = { start: first.time, end: last.time, avgPm25: Math.round(avg * 10) / 10 };
    }
  }
  return best;
}
