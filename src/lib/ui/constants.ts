// Centralised UI constants that were previously exported from component files.
// These constants are used by the AQI component.

import type { AqiLevel } from "@/lib/domain/aqi";

export const AQI_CLASSES: Record<AqiLevel, string> = {
  good: "bg-aqi-good text-aqi-good-foreground",
  moderate: "bg-aqi-moderate text-aqi-moderate-foreground",
  sensitive: "bg-aqi-sensitive text-aqi-sensitive-foreground",
  unhealthy: "bg-aqi-unhealthy text-aqi-unhealthy-foreground",
  "very-unhealthy": "bg-aqi-very-unhealthy text-aqi-very-unhealthy-foreground",
  hazardous: "bg-aqi-hazardous text-aqi-hazardous-foreground",
};

export const AQI_FILL_VAR: Record<AqiLevel, string> = {
  good: "var(--aqi-good)",
  moderate: "var(--aqi-moderate)",
  sensitive: "var(--aqi-sensitive)",
  unhealthy: "var(--aqi-unhealthy)",
  "very-unhealthy": "var(--aqi-very-unhealthy)",
  hazardous: "var(--aqi-hazardous)",
};

export const AQI_SCALE: { level: AqiLevel; label: string; range: string }[] = [
  { level: "good", label: "Good", range: "0–50" },
  { level: "moderate", label: "Moderate", range: "51–100" },
  { level: "sensitive", label: "Sensitive", range: "101–150" },
  { level: "unhealthy", label: "Unhealthy", range: "151–200" },
  { level: "very-unhealthy", label: "Very unhealthy", range: "201–300" },
  { level: "hazardous", label: "Hazardous", range: "301+" },
];
