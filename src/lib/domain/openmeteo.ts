import { z } from "zod";
import type { AirSnapshot } from "./recommendations";
import type { Place } from "./profile";

/** Open-Meteo Air Quality API (CAMS model data). https://open-meteo.com/en/docs/air-quality-api */
export const AIR_QUALITY_ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality";
export const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

const nullableNumber = z
  .number()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const openMeteoAirSchema = z.object({
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    us_aqi: z.number().nullable(),
    pm2_5: z.number().nullable(),
    pm10: nullableNumber,
    nitrogen_dioxide: nullableNumber,
    ozone: nullableNumber,
    carbon_monoxide: nullableNumber,
    sulphur_dioxide: nullableNumber,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    pm2_5: z.array(z.number().nullable()),
    us_aqi: z.array(z.number().nullable()),
  }),
});

export function buildAirQualityUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide",
    hourly: "pm2_5,us_aqi",
    forecast_days: "3",
    timezone: "auto",
  });
  return `${AIR_QUALITY_ENDPOINT}?${params.toString()}`;
}

/** Convert the raw API payload into the app's snapshot, keeping only hours from "now" onward. */
export function parseAirQuality(payload: unknown): AirSnapshot {
  const data = openMeteoAirSchema.parse(payload);
  const c = data.current;
  if (c.us_aqi === null || c.pm2_5 === null) {
    throw new Error("Air quality data is temporarily unavailable for this location");
  }
  const currentHour = c.time.slice(0, 13);
  const hourly = data.hourly.time
    .map((time, i) => ({
      time,
      pm25: data.hourly.pm2_5[i] ?? null,
      aqi: data.hourly.us_aqi[i] ?? null,
    }))
    .filter((p) => p.time.slice(0, 13) >= currentHour)
    .slice(0, 48);
  return {
    timezone: data.timezone,
    current: {
      time: c.time,
      aqi: c.us_aqi,
      pm25: c.pm2_5,
      pm10: c.pm10,
      no2: c.nitrogen_dioxide,
      o3: c.ozone,
      co: c.carbon_monoxide,
      so2: c.sulphur_dioxide,
    },
    hourly,
  };
}

const geoResultSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export interface PlaceResult extends Place {
  region: string;
}

export function parseGeocoding(payload: unknown): PlaceResult[] {
  const data = geoResultSchema.parse(payload);
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country ?? "",
    region: r.admin1 ?? "",
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}
