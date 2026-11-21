import { describe, expect, it } from "vitest";
import {
  AQI_CATEGORIES,
  aqiSeverity,
  categorizeAqi,
  findCleanestWindow,
  pm25TimesWhoGuideline,
  WHO_PM25_24H,
  type HourlyPoint,
} from "@/lib/domain/aqi";

// ---------------------------------------------------------------------------
// categorizeAqi
// ---------------------------------------------------------------------------
describe("categorizeAqi", () => {
  it.each([
    [0, "good"],
    [25, "good"],
    [50, "good"],
    [51, "moderate"],
    [100, "moderate"],
    [101, "sensitive"],
    [150, "sensitive"],
    [151, "unhealthy"],
    [200, "unhealthy"],
    [201, "very-unhealthy"],
    [300, "very-unhealthy"],
    [301, "hazardous"],
    [999, "hazardous"],
  ])("AQI %i → level '%s'", (aqi, expected) => {
    expect(categorizeAqi(aqi).level).toBe(expected);
  });

  it("rounds fractional AQI before categorising", () => {
    expect(categorizeAqi(50.4).level).toBe("good");
    expect(categorizeAqi(50.6).level).toBe("moderate");
  });

  it("throws RangeError for negative AQI", () => {
    expect(() => categorizeAqi(-1)).toThrow(RangeError);
  });

  it("throws RangeError for Infinity", () => {
    expect(() => categorizeAqi(Infinity)).toThrow(RangeError);
  });

  it("throws RangeError for NaN", () => {
    expect(() => categorizeAqi(NaN)).toThrow(RangeError);
  });

  it("returns an object with all required fields", () => {
    const result = categorizeAqi(120);
    expect(result).toMatchObject({
      level: expect.any(String),
      label: expect.any(String),
      min: expect.any(Number),
      max: expect.any(Number),
      summary: expect.any(String),
    });
  });

  it("AQI_CATEGORIES covers every boundary without overlap", () => {
    const sorted = [...AQI_CATEGORIES].sort((a, b) => a.min - b.min);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.min).toBe((sorted[i - 1]!.max ?? 0) + 1);
    }
  });
});

// ---------------------------------------------------------------------------
// aqiSeverity
// ---------------------------------------------------------------------------
describe("aqiSeverity", () => {
  it("good → 0, hazardous → 5", () => {
    expect(aqiSeverity(0)).toBe(0);
    expect(aqiSeverity(500)).toBe(5);
  });

  it("increases monotonically across band boundaries", () => {
    const boundaries = [0, 51, 101, 151, 201, 301];
    const severities = boundaries.map(aqiSeverity);
    for (let i = 1; i < severities.length; i++) {
      expect(severities[i]).toBeGreaterThan(severities[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// pm25TimesWhoGuideline
// ---------------------------------------------------------------------------
describe("pm25TimesWhoGuideline", () => {
  it("returns 1.0 at exactly the WHO 24-hour guideline", () => {
    expect(pm25TimesWhoGuideline(WHO_PM25_24H)).toBe(1);
  });

  it("rounds to one decimal place", () => {
    expect(pm25TimesWhoGuideline(30)).toBe(2);
    expect(pm25TimesWhoGuideline(37.5)).toBe(2.5);
  });

  it("returns 0 for zero PM2.5", () => {
    expect(pm25TimesWhoGuideline(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findCleanestWindow
// ---------------------------------------------------------------------------
describe("findCleanestWindow", () => {
  const makePoints = (pm25Values: (number | null)[]): HourlyPoint[] =>
    pm25Values.map((pm25, i) => ({
      time: `2025-01-01T${String(i).padStart(2, "0")}:00`,
      pm25,
      aqi: pm25 === null ? null : Math.round(pm25 * 4),
    }));

  it("finds the window with the lowest average PM2.5", () => {
    const points = makePoints([80, 60, 40, 20, 50, 70]);
    const result = findCleanestWindow(points, 2);
    expect(result).not.toBeNull();
    // hours 2–3: avg = (40+20)/2 = 30
    expect(result!.avgPm25).toBe(30);
    expect(result!.start).toBe("2025-01-01T02:00");
    expect(result!.end).toBe("2025-01-01T03:00");
  });

  it("skips windows with null PM2.5", () => {
    const points = makePoints([null, null, 10, 10, 50, 50]);
    const result = findCleanestWindow(points, 2);
    expect(result).not.toBeNull();
    expect(result!.avgPm25).toBe(10);
  });

  it("returns null when all points have null PM2.5", () => {
    const points = makePoints([null, null, null]);
    expect(findCleanestWindow(points, 2)).toBeNull();
  });

  it("returns null when fewer points than window size", () => {
    const points = makePoints([10]);
    expect(findCleanestWindow(points, 2)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(findCleanestWindow([], 2)).toBeNull();
  });

  it("works with window size of 1", () => {
    const points = makePoints([50, 10, 30]);
    const result = findCleanestWindow(points, 1);
    expect(result!.avgPm25).toBe(10);
  });

  it("rounds avgPm25 to one decimal", () => {
    const points = makePoints([10, 11, 12]);
    const result = findCleanestWindow(points, 3);
    expect(result!.avgPm25).toBe(11);
  });
});
