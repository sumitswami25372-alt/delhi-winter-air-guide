import { describe, expect, it } from "vitest";
import { buildAlertMessage, COMMUNITY_ACTIONS, communityTotal } from "@/lib/domain/community";

// ---------------------------------------------------------------------------
// communityTotal
// ---------------------------------------------------------------------------
describe("communityTotal", () => {
  it("returns positive values for all defined actions", () => {
    for (const action of COMMUNITY_ACTIONS) {
      const result = communityTotal(action.id, 10);
      expect(result.perHouseholdKg).toBeGreaterThan(0);
      expect(result.totalKg).toBe(result.perHouseholdKg * 10);
      expect(result.trees).toBeGreaterThanOrEqual(0);
      expect(result.basis).toMatch(/.+/); // non-empty basis text
    }
  });

  it("scales linearly: 100 households is 10× 10 households", () => {
    const small = communityTotal("car-free-2days", 10);
    const large = communityTotal("car-free-2days", 100);
    expect(large.totalKg).toBe(small.totalKg * 10);
  });

  it("throws for an unknown action id", () => {
    expect(() => communityTotal("unknown-action" as never, 10)).toThrow();
  });

  it("zero households → totalKg = 0", () => {
    const result = communityTotal("carpool", 0);
    expect(result.totalKg).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildAlertMessage
// ---------------------------------------------------------------------------
describe("buildAlertMessage", () => {
  it("includes place name", () => {
    const msg = buildAlertMessage("Noida", 180, 95, null);
    expect(msg).toContain("Noida");
  });

  it("includes rounded AQI", () => {
    const msg = buildAlertMessage("Delhi", 180.7, 95, null);
    expect(msg).toContain("181");
  });

  it("includes rounded PM2.5", () => {
    const msg = buildAlertMessage("Delhi", 180, 95.4, null);
    expect(msg).toContain("95");
  });

  it("includes AQI category label", () => {
    const msg = buildAlertMessage("Delhi", 180, 95, null);
    expect(msg).toContain("Unhealthy");
  });

  it("includes cleanest window when provided", () => {
    const msg = buildAlertMessage("Delhi", 180, 95, "14:00–16:00");
    expect(msg).toContain("14:00–16:00");
  });

  it("omits cleanest window line when null", () => {
    const msg = buildAlertMessage("Delhi", 180, 95, null);
    expect(msg).not.toContain("Cleanest hours");
  });

  it("includes WinterShield AI attribution", () => {
    const msg = buildAlertMessage("Delhi", 180, 95, null);
    expect(msg).toContain("WinterShield AI");
  });
});
