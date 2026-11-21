import { describe, expect, it } from "vitest";
import {
  buildDailyPlan,
  buildRecommendations,
  formatHour,
  type AirSnapshot,
} from "@/lib/domain/recommendations";
import { DEFAULT_PROFILE, type Profile } from "@/lib/domain/profile";

// ---------------------------------------------------------------------------
// formatHour
// ---------------------------------------------------------------------------
describe("formatHour", () => {
  it.each([
    ["2025-01-01T00:00", "12 am"],
    ["2025-01-01T06:00", "6 am"],
    ["2025-01-01T12:00", "12 pm"],
    ["2025-01-01T13:00", "1 pm"],
    ["2025-01-01T23:00", "11 pm"],
  ])("formats '%s' as '%s'", (input, expected) => {
    expect(formatHour(input)).toBe(expected);
  });

  it("returns original string for non-ISO input", () => {
    expect(formatHour("not-a-date")).toBe("not-a-date");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSnapshot(aqi: number, pm25: number, hourlyAqi: number[] = []): AirSnapshot {
  const hourly = hourlyAqi.map((a, i) => ({
    time: `2025-01-01T${String(i).padStart(2, "0")}:00`,
    pm25: pm25,
    aqi: a,
  }));
  return {
    timezone: "Asia/Kolkata",
    current: {
      time: "2025-01-01T00:00",
      aqi,
      pm25,
      pm10: null,
      no2: null,
      o3: null,
      co: null,
      so2: null,
    },
    hourly,
  };
}

// ---------------------------------------------------------------------------
// buildRecommendations
// ---------------------------------------------------------------------------
describe("buildRecommendations", () => {
  it("returns an array of recommendations", () => {
    const air = makeSnapshot(180, 95, Array(24).fill(180));
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
  });

  it("recommendations are sorted by priority (1 first)", () => {
    const air = makeSnapshot(180, 95, Array(24).fill(180));
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i]!.priority).toBeGreaterThanOrEqual(recs[i - 1]!.priority);
    }
  });

  it("includes sensitive-group recommendation when AQI > 100 and household has children", () => {
    const air = makeSnapshot(150, 70, Array(24).fill(150));
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      household: { ...DEFAULT_PROFILE.household, children: 2 },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "health-sensitive")).toBe(true);
  });

  it("does NOT include sensitive-group rec when AQI ≤ 100", () => {
    const air = makeSnapshot(80, 30, Array(24).fill(80));
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    expect(recs.some((r) => r.id === "health-sensitive")).toBe(false);
  });

  it("includes mask recommendation when AQI > 150", () => {
    const air = makeSnapshot(200, 120, Array(24).fill(200));
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    expect(recs.some((r) => r.id === "health-mask")).toBe(true);
  });

  it("does NOT include mask recommendation when AQI ≤ 150", () => {
    const air = makeSnapshot(100, 40, Array(24).fill(100));
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    expect(recs.some((r) => r.id === "health-mask")).toBe(false);
  });

  it("includes asthma recommendation when AQI > 100 and respiratoryCondition = true", () => {
    const air = makeSnapshot(120, 60, []);
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      household: { ...DEFAULT_PROFILE.household, respiratoryCondition: true },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "health-asthma")).toBe(true);
  });

  it("includes indoor-smoking recommendation when indoorSmoking is true", () => {
    const air = makeSnapshot(100, 40, []);
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      home: { ...DEFAULT_PROFILE.home, indoorSmoking: true },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "indoor-smoking")).toBe(true);
  });

  it("includes incense recommendation when burnsIncenseOrCandles is true", () => {
    const air = makeSnapshot(100, 40, []);
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      home: { ...DEFAULT_PROFILE.home, burnsIncenseOrCandles: true },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "indoor-incense")).toBe(true);
  });

  it("every recommendation has required fields: id, category, priority, title, detail, why", () => {
    const air = makeSnapshot(180, 95, Array(24).fill(180));
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    for (const rec of recs) {
      expect(rec.id).toBeTruthy();
      expect(rec.category).toBeTruthy();
      expect([1, 2, 3]).toContain(rec.priority);
      expect(rec.title).toBeTruthy();
      expect(rec.detail).toBeTruthy();
      expect(rec.why).toBeTruthy();
    }
  });

  it("includes commute alternative for car users", () => {
    const air = makeSnapshot(100, 40, []);
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      commute: { mode: "car_petrol", oneWayKm: 12, daysPerWeek: 5 },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "alt-commute")).toBe(true);
  });

  it("does NOT include commute alternative for metro users", () => {
    const air = makeSnapshot(100, 40, []);
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      commute: { mode: "metro_rail", oneWayKm: 12, daysPerWeek: 5 },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "alt-commute")).toBe(false);
  });

  it("always includes community-no-burning recommendation", () => {
    const air = makeSnapshot(50, 10, []);
    const recs = buildRecommendations(air, DEFAULT_PROFILE);
    expect(recs.some((r) => r.id === "community-no-burning")).toBe(true);
  });

  it("includes heating alternative for combustion heaters", () => {
    const air = makeSnapshot(100, 40, []);
    const profile: Profile = {
      ...DEFAULT_PROFILE,
      home: { ...DEFAULT_PROFILE.home, heating: "kerosene" },
    };
    const recs = buildRecommendations(air, profile);
    expect(recs.some((r) => r.id === "alt-heating")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildDailyPlan
// ---------------------------------------------------------------------------
describe("buildDailyPlan", () => {
  it("returns exactly 4 blocks", () => {
    const air = makeSnapshot(180, 95, Array(24).fill(180));
    expect(buildDailyPlan(air, DEFAULT_PROFILE)).toHaveLength(4);
  });

  it("each block has an id, label, advice and avgAqi", () => {
    const air = makeSnapshot(100, 40, Array(24).fill(100));
    const plan = buildDailyPlan(air, DEFAULT_PROFILE);
    for (const block of plan) {
      expect(block.id).toBeTruthy();
      expect(block.label).toBeTruthy();
      expect(block.advice).toBeTruthy();
    }
  });

  it("marks the cleanest block correctly", () => {
    // Morning (hours 6-10) has lower AQI → should be marked cleanest
    const hourlyAqi = Array(24).fill(200);
    for (let h = 6; h <= 10; h++) hourlyAqi[h] = 50;
    const air = makeSnapshot(200, 100, hourlyAqi);
    const plan = buildDailyPlan(air, DEFAULT_PROFILE);
    const morning = plan.find((b) => b.id === "morning");
    expect(morning?.advice).toContain("Cleanest");
  });

  it("gives 'No forecast' advice for blocks with no data", () => {
    const air = makeSnapshot(100, 40, []); // no hourly data
    const plan = buildDailyPlan(air, DEFAULT_PROFILE);
    const noDataBlocks = plan.filter((b) => b.avgAqi === null);
    for (const block of noDataBlocks) {
      expect(block.advice).toContain("No forecast");
    }
  });
});
