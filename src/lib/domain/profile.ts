import { z } from "zod";

export const TRANSPORT_MODES = [
  "car_petrol",
  "car_diesel",
  "car_cng",
  "car_electric",
  "motorbike",
  "bus",
  "metro_rail",
  "bicycle",
  "walk",
  "work_from_home",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const HEATING_TYPES = [
  "none",
  "wood_or_coal",
  "kerosene",
  "gas",
  "electric_resistive",
  "heat_pump",
] as const;
export type HeatingType = (typeof HEATING_TYPES)[number];

export const COOKING_FUELS = ["biomass", "kerosene", "lpg", "piped_gas", "induction"] as const;
export type CookingFuel = (typeof COOKING_FUELS)[number];

export const locationSchema = z.object({
  name: z.string().min(1).max(120),
  country: z.string().max(80).default(""),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type Place = z.infer<typeof locationSchema>;

export const profileSchema = z.object({
  location: locationSchema,
  household: z.object({
    adults: z.number().int().min(0).max(20),
    children: z.number().int().min(0).max(20),
    seniors: z.number().int().min(0).max(20),
    pregnant: z.boolean(),
    respiratoryCondition: z.boolean(),
    heartCondition: z.boolean(),
    pets: z.boolean(),
  }),
  home: z.object({
    areaSqm: z.number().min(5).max(1000),
    ceilingHeightM: z.number().min(2).max(6),
    hasPurifier: z.boolean(),
    purifierCadrM3h: z.number().min(0).max(2000),
    heating: z.enum(HEATING_TYPES),
    cookingFuel: z.enum(COOKING_FUELS),
    burnsIncenseOrCandles: z.boolean(),
    indoorSmoking: z.boolean(),
  }),
  commute: z.object({
    mode: z.enum(TRANSPORT_MODES),
    oneWayKm: z.number().min(0).max(200),
    daysPerWeek: z.number().int().min(0).max(7),
  }),
  lifestyle: z.object({
    exercisesOutdoors: z.boolean(),
    exerciseTime: z.enum(["morning", "evening", "anytime"]),
  }),
});
export type Profile = z.infer<typeof profileSchema>;

export const DEFAULT_PLACE: Place = {
  name: "New Delhi",
  country: "India",
  latitude: 28.6214,
  longitude: 77.2148,
};

export const DEFAULT_PROFILE: Profile = {
  location: DEFAULT_PLACE,
  household: {
    adults: 2,
    children: 1,
    seniors: 1,
    pregnant: false,
    respiratoryCondition: false,
    heartCondition: false,
    pets: false,
  },
  home: {
    areaSqm: 80,
    ceilingHeightM: 2.8,
    hasPurifier: false,
    purifierCadrM3h: 0,
    heating: "electric_resistive",
    cookingFuel: "lpg",
    burnsIncenseOrCandles: true,
    indoorSmoking: false,
  },
  commute: { mode: "car_petrol", oneWayKm: 12, daysPerWeek: 5 },
  lifestyle: { exercisesOutdoors: true, exerciseTime: "morning" },
};

/** Parse a stored profile; fall back to defaults when missing or invalid. */
export function parseStoredProfile(raw: string | null): Profile {
  if (!raw) return DEFAULT_PROFILE;
  try {
    const result = profileSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function householdSize(p: Profile): number {
  return p.household.adults + p.household.children + p.household.seniors;
}

export function hasSensitiveMembers(p: Profile): boolean {
  const h = p.household;
  return (
    h.children > 0 || h.seniors > 0 || h.pregnant || h.respiratoryCondition || h.heartCondition
  );
}

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  car_petrol: "Petrol car",
  car_diesel: "Diesel car",
  car_cng: "CNG car",
  car_electric: "Electric car",
  motorbike: "Motorbike / scooter",
  bus: "Bus",
  metro_rail: "Metro / train",
  bicycle: "Bicycle",
  walk: "Walking",
  work_from_home: "Work from home",
};

export const HEATING_LABELS: Record<HeatingType, string> = {
  none: "No heating",
  wood_or_coal: "Wood / coal / angithi",
  kerosene: "Kerosene heater",
  gas: "Gas heater",
  electric_resistive: "Electric heater",
  heat_pump: "Heat pump / inverter AC",
};

export const COOKING_LABELS: Record<CookingFuel, string> = {
  biomass: "Wood, dung or crop waste",
  kerosene: "Kerosene stove",
  lpg: "LPG cylinder",
  piped_gas: "Piped natural gas",
  induction: "Induction / electric",
};
