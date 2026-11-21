import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildAirQualityUrl,
  GEOCODING_ENDPOINT,
  parseAirQuality,
  parseGeocoding,
} from "./domain/openmeteo";

const TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Air data service responded with ${res.status}`);
  return res.json();
}

export const getAirQuality = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const payload = await fetchJson(buildAirQualityUrl(data.latitude, data.longitude));
    return parseAirQuality(payload);
  });

export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(2).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      name: data.query,
      count: "6",
      language: "en",
      format: "json",
    });
    const payload = await fetchJson(`${GEOCODING_ENDPOINT}?${params.toString()}`);
    return parseGeocoding(payload);
  });
