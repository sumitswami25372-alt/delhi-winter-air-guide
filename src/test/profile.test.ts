import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  hasSensitiveMembers,
  householdSize,
  parseStoredProfile,
  profileSchema,
  type Profile,
} from "@/lib/domain/profile";

// ---------------------------------------------------------------------------
// householdSize
// ---------------------------------------------------------------------------
describe("householdSize", () => {
  it("sums adults + children + seniors", () => {
    const p: Profile = {
      ...DEFAULT_PROFILE,
      household: { ...DEFAULT_PROFILE.household, adults: 2, children: 1, seniors: 1 },
    };
    expect(householdSize(p)).toBe(4);
  });

  it("returns 0 for empty household", () => {
    const p: Profile = {
      ...DEFAULT_PROFILE,
      household: { ...DEFAULT_PROFILE.household, adults: 0, children: 0, seniors: 0 },
    };
    expect(householdSize(p)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// hasSensitiveMembers
// ---------------------------------------------------------------------------
describe("hasSensitiveMembers", () => {
  const base: Profile = {
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

  it("returns false when no sensitive members", () => {
    expect(hasSensitiveMembers(base)).toBe(false);
  });

  it.each([
    ["children > 0", { children: 1 }],
    ["seniors > 0", { seniors: 1 }],
    ["pregnant", { pregnant: true }],
    ["respiratoryCondition", { respiratoryCondition: true }],
    ["heartCondition", { heartCondition: true }],
  ] as const)("returns true when %s", (_label, overrides) => {
    const p: Profile = { ...base, household: { ...base.household, ...overrides } };
    expect(hasSensitiveMembers(p)).toBe(true);
  });

  it("pets alone do NOT make a household sensitive", () => {
    const p: Profile = { ...base, household: { ...base.household, pets: true } };
    expect(hasSensitiveMembers(p)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseStoredProfile
// ---------------------------------------------------------------------------
describe("parseStoredProfile", () => {
  it("returns DEFAULT_PROFILE for null input", () => {
    expect(parseStoredProfile(null)).toEqual(DEFAULT_PROFILE);
  });

  it("returns DEFAULT_PROFILE for empty string", () => {
    expect(parseStoredProfile("")).toEqual(DEFAULT_PROFILE);
  });

  it("returns DEFAULT_PROFILE for invalid JSON", () => {
    expect(parseStoredProfile("{bad json}")).toEqual(DEFAULT_PROFILE);
  });

  it("returns DEFAULT_PROFILE for JSON that fails schema validation", () => {
    expect(parseStoredProfile(JSON.stringify({ invalid: true }))).toEqual(DEFAULT_PROFILE);
  });

  it("returns parsed profile for valid JSON matching schema", () => {
    const stored = JSON.stringify(DEFAULT_PROFILE);
    const result = parseStoredProfile(stored);
    expect(result).toEqual(DEFAULT_PROFILE);
  });

  it("strips unknown fields (Zod strips by default)", () => {
    const withExtra = { ...DEFAULT_PROFILE, extraField: "should be removed" };
    const result = parseStoredProfile(JSON.stringify(withExtra));
    expect((result as unknown as Record<string, unknown>).extraField).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// profileSchema validation
// ---------------------------------------------------------------------------
describe("profileSchema", () => {
  it("accepts the DEFAULT_PROFILE", () => {
    expect(profileSchema.safeParse(DEFAULT_PROFILE).success).toBe(true);
  });

  it("rejects adults > 20", () => {
    const invalid = {
      ...DEFAULT_PROFILE,
      household: { ...DEFAULT_PROFILE.household, adults: 21 },
    };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects latitude out of range", () => {
    const invalid = {
      ...DEFAULT_PROFILE,
      location: { ...DEFAULT_PROFILE.location, latitude: 91 },
    };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects longitude out of range", () => {
    const invalid = {
      ...DEFAULT_PROFILE,
      location: { ...DEFAULT_PROFILE.location, longitude: -181 },
    };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects area < 5 m²", () => {
    const invalid = {
      ...DEFAULT_PROFILE,
      home: { ...DEFAULT_PROFILE.home, areaSqm: 4 },
    };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects daysPerWeek > 7", () => {
    const invalid = {
      ...DEFAULT_PROFILE,
      commute: { ...DEFAULT_PROFILE.commute, daysPerWeek: 8 },
    };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid transport mode", () => {
    const invalid = {
      ...DEFAULT_PROFILE,
      commute: { ...DEFAULT_PROFILE.commute, mode: "spaceship" },
    };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });
});
