import { categorizeAqi, findCleanestWindow, type HourlyPoint } from "./aqi";
import {
  collectiveImpact,
  commuteImpact,
  commuteSwitchImpact,
  heatingCo2PerHour,
  INDOOR_COMBUSTION_HEATING,
  recommendedCadr,
  steadyStateIndoorPm25,
  treeEquivalent,
} from "./impact";
import { hasSensitiveMembers, TRANSPORT_LABELS, type Profile, type TransportMode } from "./profile";

export interface AirSnapshot {
  current: {
    time: string;
    aqi: number;
    pm25: number;
    pm10: number | null;
    no2: number | null;
    o3: number | null;
    co: number | null;
    so2: number | null;
  };
  /** Hourly forecast starting at the current hour (local time, ISO without offset). */
  hourly: HourlyPoint[];
  timezone: string;
}

export type RecommendationCategory = "health" | "routine" | "indoor" | "alternative" | "community";

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  /** 1 = act today, 2 = important, 3 = worthwhile. */
  priority: 1 | 2 | 3;
  title: string;
  detail: string;
  /** Plain-language explanation of the direct effect of acting on this. */
  why: string;
  impact?: { label: string; value: string; formula?: string };
}

/** A typical bedroom used for purifier sizing: 14 m² floor area. */
export const BEDROOM_AREA_SQM = 14;
export const HEATING_HOURS_PER_DAY = 4;
export const HEATING_DAYS_PER_SEASON = 90;

const CAR_MODES: TransportMode[] = ["car_petrol", "car_diesel", "car_cng"];

export function formatHour(isoLocal: string): string {
  // Extract hour portion (HH) from an ISO‑like local datetime string.
  // Guard against non‑ISO inputs where slice may return an empty string.
  const hourStr = isoLocal.slice(11, 13);
  if (!/^\d{2}$/.test(hourStr)) return isoLocal;
  const hour = Number(hourStr);
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${suffix}`;
}

export function buildRecommendations(air: AirSnapshot, profile: Profile): Recommendation[] {
  const recs: Recommendation[] = [];
  const aqi = air.current.aqi;
  const cat = categorizeAqi(aqi);
  const sensitive = hasSensitiveMembers(profile);
  const h = profile.household;
  const next24 = air.hourly.slice(0, 24);

  // ---- Health ----
  if (aqi > 100 && sensitive) {
    const who: string[] = [];
    if (h.children > 0) who.push("children");
    if (h.seniors > 0) who.push("older family members");
    if (h.pregnant) who.push("the pregnant family member");
    if (h.respiratoryCondition) who.push("anyone with asthma or lung disease");
    if (h.heartCondition) who.push("anyone with a heart condition");
    recs.push({
      id: "health-sensitive",
      category: "health",
      priority: 1,
      title: "Keep sensitive family members indoors in clean air",
      detail: `Today's AQI is ${Math.round(aqi)} (${cat.label}). Limit outdoor time for ${who.join(", ")} and keep them in the room with the cleanest air.`,
      why: "Fine particles (PM2.5) reach deep into the lungs and bloodstream; children breathe more air per kg of body weight, and older adults and people with heart or lung disease are most at risk.",
    });
  }
  if (aqi > 150) {
    recs.push({
      id: "health-mask",
      category: "health",
      priority: 1,
      title: "Wear a well-fitted N95 / FFP2 mask outside",
      detail:
        "Cloth and surgical masks do little against PM2.5. A sealed N95/FFP2 respirator filters most fine particles. Not suitable for children under 2.",
      why: "A good seal matters more than the brand: gaps at the nose or cheeks let unfiltered air bypass the filter.",
    });
  }
  if (h.respiratoryCondition && aqi > 100) {
    recs.push({
      id: "health-asthma",
      category: "health",
      priority: 1,
      title: "Have the asthma action plan and reliever inhaler ready",
      detail:
        "Smog episodes trigger flare-ups. Keep medicines within reach and seek care if breathing worsens. This app is not a substitute for medical advice.",
      why: "Early use of a reliever and following a doctor's plan prevents many emergency visits during pollution spikes.",
    });
  }

  // ---- Routine ----
  const window = findCleanestWindow(next24, 2);
  if (profile.lifestyle.exercisesOutdoors) {
    if (aqi > 150) {
      recs.push({
        id: "routine-exercise-indoor",
        category: "routine",
        priority: 1,
        title: "Move today's workout indoors",
        detail: "Do yoga, skipping or a home circuit instead of an outdoor run or walk.",
        why: "During exercise you breathe several times more air, multiplying the pollution dose you inhale.",
      });
    } else if (window) {
      recs.push({
        id: "routine-exercise-window",
        category: "routine",
        priority: 2,
        title: `Exercise outside around ${formatHour(window.start)}–${formatHour(window.end)}`,
        detail: `The forecast shows the lowest PM2.5 (≈${window.avgPm25} µg/m³) then. Winter mornings are often the smoggiest because of temperature inversions.`,
        why: "Shifting the same activity to cleaner hours lowers the dose you inhale without giving it up.",
      });
    }
  }
  if (window) {
    const ventilationOk = window.avgPm25 < air.current.pm25 * 0.8;
    recs.push({
      id: "routine-ventilate",
      category: "routine",
      priority: 2,
      title: ventilationOk
        ? `Air the home briefly around ${formatHour(window.start)}`
        : "Keep windows closed; ventilate the kitchen with an exhaust fan",
      detail: ventilationOk
        ? `Open windows for 10–15 minutes near ${formatHour(window.start)} when outdoor PM2.5 is forecast to be lowest (≈${window.avgPm25} µg/m³), then close them.`
        : "Outdoor air is not forecast to get much cleaner in the next 24 hours. Short exhaust-fan bursts while cooking remove fumes without pulling in much smog.",
      why: "Homes still need fresh air to clear CO₂ and moisture; timing it to the cleanest hours lets less smog in.",
    });
  }
  if (h.children > 0 && aqi > 100) {
    recs.push({
      id: "routine-school-route",
      category: "routine",
      priority: 2,
      title: "Use quieter side streets for the school run",
      detail:
        "Walking one street away from a main road and avoiding waiting near idling vehicles reduces exposure.",
      why: "Traffic pollution drops sharply within tens of metres of a busy road.",
    });
  }

  // ---- Indoor ----
  const bedroomVolume = BEDROOM_AREA_SQM * profile.home.ceilingHeightM;
  const neededCadr = recommendedCadr(bedroomVolume);
  if (!profile.home.hasPurifier && aqi > 100) {
    const model = steadyStateIndoorPm25({
      outdoorPm25: air.current.pm25,
      roomVolumeM3: bedroomVolume,
      cadrM3h: neededCadr,
    });
    const baseline = steadyStateIndoorPm25({
      outdoorPm25: air.current.pm25,
      roomVolumeM3: bedroomVolume,
      cadrM3h: 0,
    });
    recs.push({
      id: "indoor-purifier",
      category: "indoor",
      priority: 1,
      title: `Create one clean room with ≥${neededCadr} m³/h of filtration`,
      detail: `A HEPA purifier (or a DIY box-fan + MERV-13 filter cube) sized for a ${BEDROOM_AREA_SQM} m² bedroom. Run it on high with the door closed, especially overnight.`,
      why: "Families spend 8+ hours a night in the bedroom; cleaning that one room's air cuts the largest share of daily exposure.",
      impact: {
        label: "Estimated bedroom PM2.5",
        value: `${baseline.indoorPm25} → ${model.indoorPm25} µg/m³`,
        formula: model.formula,
      },
    });
  } else if (profile.home.hasPurifier && profile.home.purifierCadrM3h < neededCadr) {
    recs.push({
      id: "indoor-purifier-undersized",
      category: "indoor",
      priority: 2,
      title: "Your purifier is undersized for a bedroom",
      detail: `It delivers ${profile.home.purifierCadrM3h} m³/h; about ${neededCadr} m³/h is recommended. Run it on a higher setting, close the door, or add a DIY filter cube.`,
      why: "Filtration only beats leaking smog when it cleans the room's air several times an hour.",
    });
  }
  if (profile.home.burnsIncenseOrCandles) {
    recs.push({
      id: "indoor-incense",
      category: "indoor",
      priority: aqi > 150 ? 1 : 2,
      title: "Pause incense, dhoop and candles on smog days",
      detail:
        "Use electric diyas or LED candles, or burn incense briefly near an open window during the cleanest hours.",
      why: "Burning incense indoors can raise room PM2.5 by hundreds of µg/m³ — on top of the smog that already leaks in.",
    });
  }
  if (profile.home.indoorSmoking) {
    recs.push({
      id: "indoor-smoking",
      category: "indoor",
      priority: 1,
      title: "Make the home smoke-free",
      detail: "Smoke only outside, away from doors and windows — or use cessation support.",
      why: "Second-hand smoke is one of the largest indoor PM2.5 sources and especially harms children.",
    });
  }
  if (profile.home.cookingFuel === "biomass" || profile.home.cookingFuel === "kerosene") {
    recs.push({
      id: "indoor-cooking-fuel",
      category: "alternative",
      priority: 1,
      title: "Switch cooking to LPG, piped gas or induction",
      detail:
        "Clean cooking fuels remove the single biggest source of household smoke. Use a lid and the exhaust fan while frying.",
      why: "WHO estimates household air pollution from polluting fuels causes millions of premature deaths each year; women and children near the stove are most exposed.",
    });
  } else {
    recs.push({
      id: "indoor-cooking-ventilation",
      category: "indoor",
      priority: 3,
      title: "Run the kitchen exhaust and use lids while cooking",
      detail:
        "Frying and tadka create bursts of fine particles. Prefer steaming, pressure-cooking or baking on bad-air days.",
      why: "Cooking can briefly push kitchen PM2.5 far above outdoor levels; capture at the source is most effective.",
    });
  }
  if (INDOOR_COMBUSTION_HEATING.includes(profile.home.heating)) {
    const current = heatingCo2PerHour(profile.home.heating);
    const heatPump = heatingCo2PerHour("heat_pump");
    const seasonHours = HEATING_HOURS_PER_DAY * HEATING_DAYS_PER_SEASON;
    const saved = Math.round((current - heatPump) * seasonHours);
    recs.push({
      id: "alt-heating",
      category: "alternative",
      priority: profile.home.heating === "gas" ? 2 : 1,
      title: "Replace the combustion heater with an inverter AC (heat mode) or electric heater",
      detail:
        profile.home.heating === "gas"
          ? "Unvented gas heaters release nitrogen dioxide indoors. If you keep one, crack a window and never use it while sleeping."
          : "Never sleep with an angithi, coal or kerosene heater burning in a closed room — carbon monoxide can be fatal.",
      why: "Burning fuel indoors adds smoke and toxic gases straight into the air your family breathes.",
      impact:
        saved > 0
          ? {
              label: "CO₂ change per winter",
              value: `≈ ${saved} kg less`,
              formula: `(${current} − ${heatPump}) kg/h × ${HEATING_HOURS_PER_DAY} h × ${HEATING_DAYS_PER_SEASON} days`,
            }
          : { label: "Indoor smoke", value: "Eliminated at source" },
    });
  }

  // ---- Alternatives: commute ----
  const { mode, oneWayKm, daysPerWeek } = profile.commute;
  if (CAR_MODES.includes(mode) || mode === "motorbike") {
    const target: TransportMode = oneWayKm <= 4 ? "bicycle" : "metro_rail";
    const sw = commuteSwitchImpact(mode, target, oneWayKm, daysPerWeek, 0.4);
    recs.push({
      id: "alt-commute",
      category: "alternative",
      priority: 2,
      title: `Switch 2 of 5 commute days to ${TRANSPORT_LABELS[target].toLowerCase()}`,
      detail: `Your ${oneWayKm} km ${TRANSPORT_LABELS[mode].toLowerCase()} commute emits about ${commuteImpact(mode, oneWayKm, daysPerWeek).annualCo2Kg} kg CO₂ a year.`,
      why: "Vehicle exhaust and road dust are major winter PM2.5 sources in cities; fewer car trips means cleaner street air for everyone.",
      impact: {
        label: "Saved per year",
        value: `≈ ${sw.annualCo2SavedKg} kg CO₂ (${treeEquivalent(sw.annualCo2SavedKg)} trees' yearly uptake)`,
        formula: "40% of trips × (car factor − new-mode factor) × annual km",
      },
    });
    if (CAR_MODES.includes(mode)) {
      const perPerson = commuteImpact(mode, oneWayKm, daysPerWeek).annualCo2Kg / 2;
      recs.push({
        id: "community-carpool",
        category: "community",
        priority: 3,
        title: "Start a carpool with a neighbour or colleague",
        detail: "Sharing one car between two commuters halves the emissions per person.",
        why: "Fewer cars on the road also means less congestion and idling — the worst-polluting driving.",
        impact: { label: "Saved per person per year", value: `≈ ${Math.round(perPerson)} kg CO₂` },
      });
    }
  }

  // ---- Community ----
  recs.push({
    id: "community-no-burning",
    category: "community",
    priority: aqi > 150 ? 2 : 3,
    title: "Agree a no-burning pact in your colony or building",
    detail:
      "Ask neighbours, guards and maintenance staff to compost leaves and avoid burning rubbish; offer heaters instead of night-time bonfires.",
    why: "Open burning releases smoke at street level, right where people breathe.",
  });
  const communitySwitch = commuteSwitchImpact(
    "car_petrol",
    "metro_rail",
    12,
    5,
    0.4,
  ).annualCo2SavedKg;
  recs.push({
    id: "community-collective",
    category: "community",
    priority: 3,
    title: "Invite 50 households to go car-free twice a week",
    detail: "Share this plan with your residents' association, school WhatsApp group or office.",
    why: "Individual changes are small; neighbourhood-wide changes measurably cut traffic emissions on your streets.",
    impact: {
      label: "50 households, 12 km petrol-car commute → metro 2 days a week",
      value: `≈ ${collectiveImpact(communitySwitch, 50)} kg CO₂ / year`,
      formula: `${communitySwitch} kg × 50 households`,
    },
  });

  return recs.sort((a, b) => a.priority - b.priority);
}

export interface PlanBlock {
  id: "morning" | "midday" | "evening" | "night";
  label: string;
  hours: [number, number];
  avgAqi: number | null;
  advice: string;
}

const BLOCKS: Omit<PlanBlock, "avgAqi" | "advice">[] = [
  { id: "morning", label: "Morning (6–10 am)", hours: [6, 10] },
  { id: "midday", label: "Midday (11 am–4 pm)", hours: [11, 16] },
  { id: "evening", label: "Evening (5–8 pm)", hours: [17, 20] },
  { id: "night", label: "Night (9 pm–midnight)", hours: [21, 23] },
];

/** Build a 4-block daily routine from the forecast for the next 24 hours. */
export function buildDailyPlan(air: AirSnapshot, profile: Profile): PlanBlock[] {
  const next24 = air.hourly.slice(0, 24);
  const blocks = BLOCKS.map((b) => {
    const values = next24
      .filter((p) => {
        const hour = Number(p.time.slice(11, 13));
        return hour >= b.hours[0] && hour <= b.hours[1] && p.aqi !== null;
      })
      .map((p) => p.aqi as number);
    const avgAqi = values.length
      ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
      : null;
    return { ...b, avgAqi };
  });
  const known = blocks.filter((b) => b.avgAqi !== null);
  const cleanest = known.length
    ? known.reduce((best, b) => ((b.avgAqi as number) < (best.avgAqi as number) ? b : best))
    : null;
  const sensitive = hasSensitiveMembers(profile);

  return blocks.map((b) => {
    if (b.avgAqi === null) return { ...b, advice: "No forecast available for this period." };
    const level = categorizeAqi(b.avgAqi).level;
    const isCleanest = cleanest?.id === b.id;
    let advice: string;
    if (level === "good" || level === "moderate") {
      advice = "Fine for outdoor plans, walks and airing the home.";
    } else if (level === "sensitive") {
      advice = sensitive
        ? "OK for short errands; keep children and elders' outdoor play brief."
        : "OK for light activity; skip intense outdoor exercise.";
    } else if (level === "unhealthy") {
      advice = "Do essential trips only, with an N95 mask. Keep windows shut.";
    } else {
      advice = "Stay indoors with the purifier on. Postpone outdoor errands if you can.";
    }
    if (isCleanest && known.length > 1) advice = `Cleanest part of the day. ${advice}`;
    return { ...b, advice };
  });
}
