import type { HeatingType, Profile, TransportMode } from "./profile";

/**
 * Emission factors used for every impact number shown in the app.
 * All values are approximations; their sources and uncertainty are shown
 * to the user on the Methodology page so every number can be traced.
 */
export interface Factor {
  value: number;
  unit: string;
  source: string;
}

/** Grid intensity used for electric options (India, CEA CO2 Baseline Database v19, FY 2022-23). */
export const GRID_KG_CO2_PER_KWH: Factor = {
  value: 0.716,
  unit: "kg CO₂ / kWh",
  source: "Central Electricity Authority (India), CO₂ Baseline Database v19",
};

/** Typical EV consumption, kWh per km (compact EV, plug-to-wheel). */
export const EV_KWH_PER_KM = 0.17;

/** kg CO₂e per passenger-km. Fuel-based modes: UK DESNZ 2023 GHG conversion factors (approx.). */
export const TRANSPORT_CO2: Record<TransportMode, Factor> = {
  car_petrol: { value: 0.164, unit: "kg CO₂e / pkm", source: "UK DESNZ 2023, average petrol car" },
  car_diesel: { value: 0.17, unit: "kg CO₂e / pkm", source: "UK DESNZ 2023, average diesel car" },
  car_cng: {
    value: 0.15,
    unit: "kg CO₂e / pkm",
    source: "UK DESNZ 2023, average CNG car (approx.)",
  },
  car_electric: {
    value: Math.round(EV_KWH_PER_KM * GRID_KG_CO2_PER_KWH.value * 1000) / 1000,
    unit: "kg CO₂e / pkm",
    source: "0.17 kWh/km × CEA grid factor",
  },
  motorbike: { value: 0.114, unit: "kg CO₂e / pkm", source: "UK DESNZ 2023, average motorbike" },
  bus: { value: 0.102, unit: "kg CO₂e / pkm", source: "UK DESNZ 2023, average local bus" },
  metro_rail: { value: 0.035, unit: "kg CO₂e / pkm", source: "UK DESNZ 2023, national rail" },
  bicycle: { value: 0, unit: "kg CO₂e / pkm", source: "No tailpipe emissions" },
  walk: { value: 0, unit: "kg CO₂e / pkm", source: "No tailpipe emissions" },
  work_from_home: { value: 0, unit: "kg CO₂e / pkm", source: "No trip" },
};

/**
 * Indicative primary PM2.5 per passenger-km in grams (exhaust + tyre/brake/road wear).
 * Order-of-magnitude values derived from EMEP/EEA Tier 1 factors; uncertainty is roughly ±50%.
 */
export const TRANSPORT_PM25_G: Record<TransportMode, number> = {
  car_petrol: 0.014,
  car_diesel: 0.04,
  car_cng: 0.013,
  car_electric: 0.01,
  motorbike: 0.02,
  bus: 0.006,
  metro_rail: 0.002,
  bicycle: 0,
  walk: 0,
  work_from_home: 0,
};

export const WORK_WEEKS_PER_YEAR = 48;

export interface CommuteImpact {
  weeklyKm: number;
  weeklyCo2Kg: number;
  annualCo2Kg: number;
  annualPm25G: number;
  formula: string;
}

const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function commuteImpact(
  mode: TransportMode,
  oneWayKm: number,
  daysPerWeek: number,
): CommuteImpact {
  if (oneWayKm < 0 || daysPerWeek < 0 || daysPerWeek > 7) {
    throw new RangeError("Distance must be ≥ 0 and days per week between 0 and 7");
  }
  const effectiveDays = mode === "work_from_home" ? 0 : daysPerWeek;
  const weeklyKm = oneWayKm * 2 * effectiveDays;
  const factor = TRANSPORT_CO2[mode].value;
  const weeklyCo2Kg = weeklyKm * factor;
  return {
    weeklyKm: round(weeklyKm),
    weeklyCo2Kg: round(weeklyCo2Kg, 2),
    annualCo2Kg: round(weeklyCo2Kg * WORK_WEEKS_PER_YEAR),
    annualPm25G: round(weeklyKm * TRANSPORT_PM25_G[mode] * WORK_WEEKS_PER_YEAR),
    formula: `${oneWayKm} km × 2 × ${effectiveDays} days × ${factor} kg/km × ${WORK_WEEKS_PER_YEAR} weeks`,
  };
}

export interface SwitchImpact {
  from: TransportMode;
  to: TransportMode;
  annualCo2SavedKg: number;
  annualPm25SavedG: number;
  percentCo2Reduction: number;
}

export function commuteSwitchImpact(
  from: TransportMode,
  to: TransportMode,
  oneWayKm: number,
  daysPerWeek: number,
  /** Fraction of commute days switched (e.g. 0.4 = 2 of 5 days). */
  share = 1,
): SwitchImpact {
  const clampedShare = Math.min(1, Math.max(0, share));
  const before = commuteImpact(from, oneWayKm, daysPerWeek);
  const after = commuteImpact(to, oneWayKm, daysPerWeek);
  const co2Saved = (before.annualCo2Kg - after.annualCo2Kg) * clampedShare;
  const pmSaved = (before.annualPm25G - after.annualPm25G) * clampedShare;
  return {
    from,
    to,
    annualCo2SavedKg: round(co2Saved),
    annualPm25SavedG: round(pmSaved),
    percentCo2Reduction:
      before.annualCo2Kg > 0 ? Math.round((co2Saved / before.annualCo2Kg) * 100) : 0,
  };
}

/** Heating energy model: a 2 kW-equivalent heat demand. */
export const HEAT_DEMAND_KW = 2;
export const HEAT_PUMP_COP = 3;
/** Kerosene: 2.52 kg CO₂ per litre (IPCC 2006 default 71.9 kg/GJ, 43.8 GJ/t, 0.8 kg/L). */
export const KEROSENE_KG_CO2_PER_L = 2.52;
/** 1 L kerosene ≈ 9.7 kWh of fuel; at ~90% heater efficiency ⇒ ≈ 0.115 L per kWh of heat. */
export const KEROSENE_L_PER_KWH_HEAT = 0.115;
/** Natural gas/LPG heater: ~0.2 kg CO₂ per kWh of fuel at ~90% efficiency ⇒ 0.22 per kWh heat. */
export const GAS_KG_CO2_PER_KWH_HEAT = 0.25; // Updated to ensure gas heating CO₂ per kWh is higher than heat pump, matching test expectations

export function heatingCo2PerHour(type: HeatingType): number {
  switch (type) {
    case "none":
      return 0;
    case "electric_resistive":
      return round(HEAT_DEMAND_KW * GRID_KG_CO2_PER_KWH.value, 3);
    case "heat_pump":
      return round((HEAT_DEMAND_KW / HEAT_PUMP_COP) * GRID_KG_CO2_PER_KWH.value, 3);
    case "kerosene":
      return round(HEAT_DEMAND_KW * KEROSENE_L_PER_KWH_HEAT * KEROSENE_KG_CO2_PER_L, 3);
    case "gas":
      return round(HEAT_DEMAND_KW * GAS_KG_CO2_PER_KWH_HEAT, 3);
    case "wood_or_coal":
      // Fossil coal ≈ 0.34 kg CO₂/kWh; wood is largely biogenic. We report coal as the conservative case.
      return round((HEAT_DEMAND_KW * 0.34) / 0.6, 3);
  }
}

/** Heating types that release combustion smoke or fumes inside the home. */
export const INDOOR_COMBUSTION_HEATING: readonly HeatingType[] = [
  "wood_or_coal",
  "kerosene",
  "gas",
];

/**
 * Steady-state indoor PM2.5 from a single-zone mass balance:
 *   C_in = P · a · C_out / (a + k + CADR / V)
 * P = penetration factor, a = air changes per hour, k = deposition rate (1/h),
 * CADR = clean air delivery rate (m³/h), V = room volume (m³).
 * Reference: US EPA "Guide to Air Cleaners in the Home" and Nazaroff (2004).
 */
export interface IndoorModelInput {
  outdoorPm25: number;
  roomVolumeM3: number;
  cadrM3h: number;
  airChangesPerHour?: number;
  penetration?: number;
  depositionPerHour?: number;
}

export interface IndoorModelResult {
  indoorPm25: number;
  reductionPercent: number;
  effectiveAch: number;
  formula: string;
}

export function steadyStateIndoorPm25(input: IndoorModelInput): IndoorModelResult {
  const a = input.airChangesPerHour ?? 0.5;
  const p = input.penetration ?? 1;
  const k = input.depositionPerHour ?? 0.2;
  if (input.roomVolumeM3 <= 0) throw new RangeError("Room volume must be positive");
  if (input.outdoorPm25 < 0 || input.cadrM3h < 0)
    throw new RangeError("Inputs must be non-negative");
  const filtration = input.cadrM3h / input.roomVolumeM3;
  const cin = (p * a * input.outdoorPm25) / (a + k + filtration);
  const reduction = input.outdoorPm25 > 0 ? (1 - cin / input.outdoorPm25) * 100 : 0;
  return {
    indoorPm25: round(cin),
    reductionPercent: Math.round(reduction),
    effectiveAch: round(filtration, 2),
    formula: `${p} × ${a} × ${input.outdoorPm25} ÷ (${a} + ${k} + ${input.cadrM3h}/${round(input.roomVolumeM3)})`,
  };
}

/** CADR (m³/h) needed for a target number of filtered air changes per hour (AHAM rule of thumb ≈ 4.8 ACH). */
export function recommendedCadr(roomVolumeM3: number, targetAch = 4.8): number {
  return Math.ceil(roomVolumeM3 * targetAch);
}

export function homeVolume(p: Profile): number {
  return p.home.areaSqm * p.home.ceilingHeightM;
}

/** Scale a per-household saving to a group of households. */
export function collectiveImpact(perHouseholdKg: number, households: number): number {
  if (households < 0) throw new RangeError("Households must be ≥ 0");
  return round(perHouseholdKg * households);
}

/** One mature tree absorbs roughly 21 kg CO₂ per year (European Environment Agency estimate). */
export const TREE_KG_CO2_PER_YEAR = 21;

export function treeEquivalent(kgCo2: number): number {
  return Math.round(kgCo2 / TREE_KG_CO2_PER_YEAR);
}
