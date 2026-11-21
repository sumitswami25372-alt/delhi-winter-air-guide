import { describe, expect, it } from "vitest";
import {
  buildAirQualityUrl,
  AIR_QUALITY_ENDPOINT,
  parseAirQuality,
  parseGeocoding,
} from "@/lib/domain/openmeteo";

// ---------------------------------------------------------------------------
// buildAirQualityUrl
// ---------------------------------------------------------------------------
describe("buildAirQualityUrl", () => {
  it("contains the base endpoint", () => {
    const url = buildAirQualityUrl(28.6214, 77.2148);
    expect(url).toContain(AIR_QUALITY_ENDPOINT);
  });

  it("includes latitude and longitude as query params", () => {
    const url = buildAirQualityUrl(28.6214, 77.2148);
    expect(url).toContain("latitude=28.6214");
    expect(url).toContain("longitude=77.2148");
  });

  it("includes all required CAMS variables", () => {
    const url = buildAirQualityUrl(0, 0);
    expect(url).toContain("us_aqi");
    expect(url).toContain("pm2_5");
    expect(url).toContain("pm10");
    expect(url).toContain("nitrogen_dioxide");
  });

  it("requests timezone=auto", () => {
    expect(buildAirQualityUrl(0, 0)).toContain("timezone=auto");
  });
});

// ---------------------------------------------------------------------------
// parseAirQuality
// ---------------------------------------------------------------------------
const VALID_PAYLOAD = {
  timezone: "Asia/Kolkata",
  current: {
    time: "2025-01-15T12:00",
    us_aqi: 180,
    pm2_5: 95.3,
    pm10: 140,
    nitrogen_dioxide: 50,
    ozone: 70,
    carbon_monoxide: 400,
    sulphur_dioxide: 10,
  },
  hourly: {
    time: ["2025-01-15T10:00", "2025-01-15T11:00", "2025-01-15T12:00", "2025-01-15T13:00"],
    pm2_5: [100, 95, 90, 85],
    us_aqi: [170, 165, 160, 155],
  },
};

describe("parseAirQuality", () => {
  it("parses a valid payload successfully", () => {
    const result = parseAirQuality(VALID_PAYLOAD);
    expect(result.current.aqi).toBe(180);
    expect(result.current.pm25).toBe(95.3);
    expect(result.timezone).toBe("Asia/Kolkata");
  });

  it("filters hourly data to current hour and beyond", () => {
    // current time is 12:00; hours before 12:00 should be dropped
    const result = parseAirQuality(VALID_PAYLOAD);
    for (const point of result.hourly) {
      expect(point.time >= "2025-01-15T12").toBe(true);
    }
  });

  it("caps hourly data at 48 points", () => {
    const times = Array.from(
      { length: 100 },
      (_, i) => `2025-01-15T${String(i % 24).padStart(2, "0")}:00`,
    );
    const payload = {
      ...VALID_PAYLOAD,
      hourly: { time: times, pm2_5: times.map(() => 50), us_aqi: times.map(() => 100) },
    };
    const result = parseAirQuality(payload);
    expect(result.hourly.length).toBeLessThanOrEqual(48);
  });

  it("throws when us_aqi is null in current", () => {
    const invalid = {
      ...VALID_PAYLOAD,
      current: { ...VALID_PAYLOAD.current, us_aqi: null },
    };
    expect(() => parseAirQuality(invalid)).toThrow();
  });

  it("throws when pm2_5 is null in current", () => {
    const invalid = {
      ...VALID_PAYLOAD,
      current: { ...VALID_PAYLOAD.current, pm2_5: null },
    };
    expect(() => parseAirQuality(invalid)).toThrow();
  });

  it("throws for completely invalid payload", () => {
    expect(() => parseAirQuality(null)).toThrow();
    expect(() => parseAirQuality({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseGeocoding
// ---------------------------------------------------------------------------
describe("parseGeocoding", () => {
  it("parses results with all fields", () => {
    const payload = {
      results: [
        { name: "Delhi", latitude: 28.62, longitude: 77.21, country: "India", admin1: "Delhi" },
      ],
    };
    const result = parseGeocoding(payload);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Delhi",
      latitude: 28.62,
      longitude: 77.21,
      country: "India",
      region: "Delhi",
    });
  });

  it("handles missing optional fields (country, admin1)", () => {
    const payload = {
      results: [{ name: "Somewhere", latitude: 10, longitude: 20 }],
    };
    const [r] = parseGeocoding(payload);
    expect(r!.country).toBe("");
    expect(r!.region).toBe("");
  });

  it("returns empty array when results is undefined", () => {
    expect(parseGeocoding({})).toEqual([]);
  });

  it("throws for invalid payload schema", () => {
    expect(() => parseGeocoding(null)).toThrow();
  });
});
