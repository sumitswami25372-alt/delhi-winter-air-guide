import { describe, expect, it } from "vitest";
import {
  collectiveImpact,
  commuteImpact,
  commuteSwitchImpact,
  heatingCo2PerHour,
  recommendedCadr,
  steadyStateIndoorPm25,
  treeEquivalent,
  TREE_KG_CO2_PER_YEAR,
  WORK_WEEKS_PER_YEAR,
  TRANSPORT_CO2,
  GRID_KG_CO2_PER_KWH,
  EV_KWH_PER_KM,
  HEAT_PUMP_COP,
  HEAT_DEMAND_KW,
} from "@/lib/domain/impact";

// ---------------------------------------------------------------------------
// commuteImpact
// ---------------------------------------------------------------------------
describe("commuteImpact", () => {
  it("calculates weekly and annual CO₂ for a petrol car", () => {
    const result = commuteImpact("car_petrol", 10, 5);
    expect(result.weeklyKm).toBe(100); // 10 × 2 × 5
    expect(result.weeklyCo2Kg).toBeCloseTo(100 * TRANSPORT_CO2.car_petrol.value, 1);
    expect(result.annualCo2Kg).toBeCloseTo(result.weeklyCo2Kg * WORK_WEEKS_PER_YEAR, 0);
  });

  it("work_from_home produces zero emissions regardless of km", () => {
    const result = commuteImpact("work_from_home", 20, 5);
    expect(result.weeklyKm).toBe(0);
    expect(result.weeklyCo2Kg).toBe(0);
    expect(result.annualCo2Kg).toBe(0);
  });

  it("bicycle and walk produce zero emissions", () => {
    expect(commuteImpact("bicycle", 10, 5).annualCo2Kg).toBe(0);
    expect(commuteImpact("walk", 5, 5).annualCo2Kg).toBe(0);
  });

  it("metro has lower emissions than petrol car for the same route", () => {
    const car = commuteImpact("car_petrol", 15, 5);
    const metro = commuteImpact("metro_rail", 15, 5);
    expect(metro.annualCo2Kg).toBeLessThan(car.annualCo2Kg);
  });

  it("throws RangeError for negative distance", () => {
    expect(() => commuteImpact("car_petrol", -1, 5)).toThrow(RangeError);
  });

  it("throws RangeError for days > 7", () => {
    expect(() => commuteImpact("car_petrol", 10, 8)).toThrow(RangeError);
  });

  it("zero km gives zero km and emissions", () => {
    const result = commuteImpact("car_petrol", 0, 5);
    expect(result.weeklyKm).toBe(0);
    expect(result.annualCo2Kg).toBe(0);
  });

  it("includes a readable formula string", () => {
    const result = commuteImpact("car_petrol", 10, 5);
    expect(result.formula).toContain("10 km");
  });
});

// ---------------------------------------------------------------------------
// commuteSwitchImpact
// ---------------------------------------------------------------------------
describe("commuteSwitchImpact", () => {
  it("switching from petrol car to metro saves CO₂", () => {
    const result = commuteSwitchImpact("car_petrol", "metro_rail", 12, 5);
    expect(result.annualCo2SavedKg).toBeGreaterThan(0);
    expect(result.percentCo2Reduction).toBeGreaterThan(0);
    expect(result.percentCo2Reduction).toBeLessThanOrEqual(100);
  });

  it("clamping share to [0, 1]: share > 1 behaves as 1", () => {
    const full = commuteSwitchImpact("car_petrol", "metro_rail", 10, 5, 1);
    const over = commuteSwitchImpact("car_petrol", "metro_rail", 10, 5, 2);
    expect(over.annualCo2SavedKg).toBe(full.annualCo2SavedKg);
  });

  it("share = 0 means zero savings", () => {
    const result = commuteSwitchImpact("car_petrol", "metro_rail", 12, 5, 0);
    expect(result.annualCo2SavedKg).toBe(0);
  });

  it("percentCo2Reduction is 0 when from-mode has zero emissions", () => {
    const result = commuteSwitchImpact("bicycle", "metro_rail", 10, 5);
    expect(result.percentCo2Reduction).toBe(0);
  });

  it("stores from and to mode correctly", () => {
    const result = commuteSwitchImpact("car_diesel", "bus", 10, 3);
    expect(result.from).toBe("car_diesel");
    expect(result.to).toBe("bus");
  });
});

// ---------------------------------------------------------------------------
// heatingCo2PerHour
// ---------------------------------------------------------------------------
describe("heatingCo2PerHour", () => {
  it("none → 0 kg/h", () => {
    expect(heatingCo2PerHour("none")).toBe(0);
  });

  it("heat_pump < electric_resistive (more efficient)", () => {
    expect(heatingCo2PerHour("heat_pump")).toBeLessThan(heatingCo2PerHour("electric_resistive"));
  });

  it("electric_resistive = HEAT_DEMAND_KW × GRID_KG_CO2_PER_KWH rounded to 3dp", () => {
    const expected = Math.round(HEAT_DEMAND_KW * GRID_KG_CO2_PER_KWH.value * 1000) / 1000;
    expect(heatingCo2PerHour("electric_resistive")).toBeCloseTo(expected, 5);
  });

  it("heat_pump = (HEAT_DEMAND_KW / COP) × GRID rounded to 3dp", () => {
    const expected =
      Math.round((HEAT_DEMAND_KW / HEAT_PUMP_COP) * GRID_KG_CO2_PER_KWH.value * 1000) / 1000;
    expect(heatingCo2PerHour("heat_pump")).toBeCloseTo(expected, 5);
  });

  it("wood_or_coal > gas > heat_pump in CO₂ per hour", () => {
    expect(heatingCo2PerHour("wood_or_coal")).toBeGreaterThan(heatingCo2PerHour("gas"));
    expect(heatingCo2PerHour("gas")).toBeGreaterThan(heatingCo2PerHour("heat_pump"));
  });

  it("all heating types return a non-negative number", () => {
    const types = [
      "none",
      "wood_or_coal",
      "kerosene",
      "gas",
      "electric_resistive",
      "heat_pump",
    ] as const;
    for (const t of types) {
      expect(heatingCo2PerHour(t)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// steadyStateIndoorPm25
// ---------------------------------------------------------------------------
describe("steadyStateIndoorPm25", () => {
  const baseInput = { outdoorPm25: 100, roomVolumeM3: 50, cadrM3h: 200 };

  it("returns a result with all required fields", () => {
    const result = steadyStateIndoorPm25(baseInput);
    expect(result).toMatchObject({
      indoorPm25: expect.any(Number),
      reductionPercent: expect.any(Number),
      effectiveAch: expect.any(Number),
      formula: expect.any(String),
    });
  });

  it("indoor PM2.5 is lower than outdoor when CADR > 0", () => {
    const result = steadyStateIndoorPm25(baseInput);
    expect(result.indoorPm25).toBeLessThan(baseInput.outdoorPm25);
  });

  it("higher CADR gives lower indoor PM2.5", () => {
    const low = steadyStateIndoorPm25({ ...baseInput, cadrM3h: 50 });
    const high = steadyStateIndoorPm25({ ...baseInput, cadrM3h: 500 });
    expect(high.indoorPm25).toBeLessThan(low.indoorPm25);
  });

  it("CADR = 0 gives minimal reduction (no filtration)", () => {
    const result = steadyStateIndoorPm25({ ...baseInput, cadrM3h: 0 });
    expect(result.reductionPercent).toBeLessThan(50);
  });

  it("reductionPercent is 0 when outdoorPm25 is 0", () => {
    const result = steadyStateIndoorPm25({ ...baseInput, outdoorPm25: 0 });
    expect(result.reductionPercent).toBe(0);
  });

  it("throws RangeError for non-positive room volume", () => {
    expect(() => steadyStateIndoorPm25({ ...baseInput, roomVolumeM3: 0 })).toThrow(RangeError);
  });

  it("throws RangeError for negative outdoor PM2.5", () => {
    expect(() => steadyStateIndoorPm25({ ...baseInput, outdoorPm25: -1 })).toThrow(RangeError);
  });

  it("throws RangeError for negative CADR", () => {
    expect(() => steadyStateIndoorPm25({ ...baseInput, cadrM3h: -10 })).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// recommendedCadr
// ---------------------------------------------------------------------------
describe("recommendedCadr", () => {
  it("returns a positive integer", () => {
    const cadr = recommendedCadr(40); // 14 m² × 2.8 m ceiling
    expect(Number.isInteger(cadr)).toBe(true);
    expect(cadr).toBeGreaterThan(0);
  });

  it("scales linearly with volume", () => {
    const small = recommendedCadr(20);
    const large = recommendedCadr(40);
    expect(large).toBeGreaterThan(small);
  });

  it("custom targetAch is respected", () => {
    const v = 50;
    const targetAch = 6;
    expect(recommendedCadr(v, targetAch)).toBe(Math.ceil(v * targetAch));
  });
});

// ---------------------------------------------------------------------------
// collectiveImpact
// ---------------------------------------------------------------------------
describe("collectiveImpact", () => {
  it("scales linearly with number of households", () => {
    expect(collectiveImpact(100, 50)).toBe(5000);
  });

  it("zero households → 0", () => {
    expect(collectiveImpact(500, 0)).toBe(0);
  });

  it("throws RangeError for negative households", () => {
    expect(() => collectiveImpact(100, -1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// treeEquivalent
// ---------------------------------------------------------------------------
describe("treeEquivalent", () => {
  it("returns 0 for 0 kg CO₂", () => {
    expect(treeEquivalent(0)).toBe(0);
  });

  it("rounds correctly: exactly one tree's worth", () => {
    expect(treeEquivalent(TREE_KG_CO2_PER_YEAR)).toBe(1);
  });

  it("scales correctly for 10 trees", () => {
    expect(treeEquivalent(TREE_KG_CO2_PER_YEAR * 10)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Electric car emission factor consistency
// ---------------------------------------------------------------------------
describe("EV emission factor", () => {
  it("matches the formula EV_KWH_PER_KM × GRID_KG_CO2_PER_KWH", () => {
    const expected = Math.round(EV_KWH_PER_KM * GRID_KG_CO2_PER_KWH.value * 1000) / 1000;
    expect(TRANSPORT_CO2.car_electric.value).toBeCloseTo(expected, 5);
  });
});
