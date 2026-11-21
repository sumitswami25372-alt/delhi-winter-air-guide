import { describe, expect, it } from "vitest";
import { memberGuidance } from "@/lib/domain/family";
import { DEFAULT_PROFILE, type Profile } from "@/lib/domain/profile";

const noSensitiveProfile: Profile = {
  ...DEFAULT_PROFILE,
  household: {
    adults: 2,
    children: 0,
    seniors: 0,
    pregnant: false,
    respiratoryCondition: false,
    heartCondition: false,
    pets: false,
  },
};

describe("memberGuidance", () => {
  it("returns at least one entry (adults fallback) for a no-sensitive household", () => {
    const guidance = memberGuidance(noSensitiveProfile, 50);
    expect(guidance).toHaveLength(1);
    expect(guidance[0]!.id).toBe("adults");
  });

  it("includes children entry when children > 0", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, children: 1 },
    };
    const guidance = memberGuidance(p, 180);
    expect(guidance.some((g) => g.id === "children")).toBe(true);
  });

  it("children who label is singular for 1 child", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, children: 1 },
    };
    const children = memberGuidance(p, 50).find((g) => g.id === "children");
    expect(children?.who).toBe("Your child");
  });

  it("children who label is plural for > 1 child", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, children: 3 },
    };
    const children = memberGuidance(p, 50).find((g) => g.id === "children");
    expect(children?.who).toContain("3 children");
  });

  it("includes seniors entry when seniors > 0", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, seniors: 2 },
    };
    expect(memberGuidance(p, 180).some((g) => g.id === "seniors")).toBe(true);
  });

  it("includes pregnant entry when pregnant = true", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, pregnant: true },
    };
    expect(memberGuidance(p, 180).some((g) => g.id === "pregnant")).toBe(true);
  });

  it("includes respiratory entry when respiratoryCondition = true", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, respiratoryCondition: true },
    };
    expect(memberGuidance(p, 180).some((g) => g.id === "respiratory")).toBe(true);
  });

  it("includes heart entry when heartCondition = true", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, heartCondition: true },
    };
    expect(memberGuidance(p, 180).some((g) => g.id === "heart")).toBe(true);
  });

  it("includes pets entry when pets = true", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, pets: true },
    };
    expect(memberGuidance(p, 180).some((g) => g.id === "pets")).toBe(true);
  });

  it("gives different outdoor advice for bad vs good AQI for children", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, children: 1 },
    };
    const badAir = memberGuidance(p, 180);
    const goodAir = memberGuidance(p, 30);

    const badChildTips = badAir.find((g) => g.id === "children")!.tips[0]!;
    const goodChildTips = goodAir.find((g) => g.id === "children")!.tips[0]!;

    expect(badChildTips).toContain("indoor");
    expect(goodChildTips).not.toContain("indoor games");
  });

  it("handles null AQI gracefully (shows non-bad advice)", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: { ...noSensitiveProfile.household, children: 1 },
    };
    const guidance = memberGuidance(p, null);
    expect(guidance.some((g) => g.id === "children")).toBe(true);
    // null AQI → level is null → bad = false → "is fine" tip
    const childTips = guidance.find((g) => g.id === "children")!.tips[0]!;
    expect(childTips).not.toContain("Swap");
  });

  it("every entry has id, who, and at least one tip", () => {
    const p: Profile = {
      ...noSensitiveProfile,
      household: {
        ...noSensitiveProfile.household,
        children: 1,
        seniors: 1,
        pregnant: true,
        respiratoryCondition: true,
        heartCondition: true,
        pets: true,
      },
    };
    const guidance = memberGuidance(p, 180);
    for (const g of guidance) {
      expect(g.id).toBeTruthy();
      expect(g.who).toBeTruthy();
      expect(g.tips.length).toBeGreaterThan(0);
    }
  });
});
