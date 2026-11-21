import { categorizeAqi } from "./aqi";
import { collectiveImpact, commuteSwitchImpact, heatingCo2PerHour, treeEquivalent } from "./impact";
import { HEATING_DAYS_PER_SEASON, HEATING_HOURS_PER_DAY } from "./recommendations";

export const COMMUNITY_ACTIONS = [
  {
    id: "car-free-2days",
    label: "Go car-free 2 days a week (12 km petrol car → metro)",
    perHouseholdKg: () =>
      commuteSwitchImpact("car_petrol", "metro_rail", 12, 5, 0.4).annualCo2SavedKg,
    basis: "40% of a 12 km × 2 × 5-day commute, 48 weeks, petrol car vs metro",
  },
  {
    id: "carpool",
    label: "Carpool with one other household (12 km petrol car)",
    perHouseholdKg: () =>
      Math.round(commuteSwitchImpact("car_petrol", "metro_rail", 12, 5, 1).annualCo2SavedKg / 2),
    basis: "Half of one 12 km × 2 × 5-day car commute avoided per household",
  },
  {
    id: "heater-switch",
    label: "Swap a kerosene heater for an inverter AC (heat mode)",
    perHouseholdKg: () =>
      Math.round(
        (heatingCo2PerHour("kerosene") - heatingCo2PerHour("heat_pump")) *
          HEATING_HOURS_PER_DAY *
          HEATING_DAYS_PER_SEASON,
      ),
    basis: `2 kW for ${HEATING_HOURS_PER_DAY} h/day × ${HEATING_DAYS_PER_SEASON} days`,
  },
] as const;
export type CommunityActionId = (typeof COMMUNITY_ACTIONS)[number]["id"];

export function communityTotal(actionId: CommunityActionId, households: number) {
  const action = COMMUNITY_ACTIONS.find((a) => a.id === actionId);
  if (!action) throw new Error(`Unknown action ${actionId}`);
  const per = action.perHouseholdKg();
  const total = collectiveImpact(per, households);
  return { perHouseholdKg: per, totalKg: total, trees: treeEquivalent(total), basis: action.basis };
}

export function buildAlertMessage(
  placeName: string,
  aqi: number,
  pm25: number,
  cleanest: string | null,
): string {
  const cat = categorizeAqi(aqi);
  const lines = [
    `Smog alert for ${placeName}: AQI ${Math.round(aqi)} (${cat.label}), PM2.5 ${Math.round(pm25)} µg/m³.`,
    cat.summary,
    "Today let's: keep kids and elders indoors in clean air, avoid burning leaves or rubbish, and share rides where we can.",
  ];
  if (cleanest) lines.push(`Cleanest hours to air homes: ${cleanest}.`);
  lines.push("— shared via WinterShield AI");
  return lines.join("\n");
}
