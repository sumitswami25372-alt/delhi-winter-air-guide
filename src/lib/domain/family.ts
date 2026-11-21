import { categorizeAqi } from "./aqi";
import type { Profile } from "./profile";

export interface MemberGuidance {
  id: string;
  who: string;
  tips: string[];
}

/** Per-member advice for the household at the given AQI. */
export function memberGuidance(profile: Profile, aqi: number | null): MemberGuidance[] {
  const h = profile.household;
  const level = aqi === null ? null : categorizeAqi(aqi).level;
  const bad = level !== null && level !== "good" && level !== "moderate";
  const out: MemberGuidance[] = [];
  if (h.children > 0) {
    out.push({
      id: "children",
      who: h.children === 1 ? "Your child" : `Your ${h.children} children`,
      tips: [
        bad
          ? "Swap outdoor play for indoor games today; ask the school about indoor PE."
          : "Outdoor play is fine — favour parks away from main roads.",
        "Children under 2 should not wear masks; keep them in the cleanest room instead.",
        "Use side streets for the school walk and avoid waiting by idling buses.",
      ],
    });
  }
  if (h.seniors > 0) {
    out.push({
      id: "seniors",
      who: h.seniors === 1 ? "Your older family member" : "Your older family members",
      tips: [
        bad
          ? "Move morning walks indoors or to the cleanest afternoon hours."
          : "Keep walks to the cleaner hours shown on the Today page.",
        "Keep regular medicines stocked and watch for breathlessness, chest pain or unusual fatigue.",
        "Let them sleep in the room with the purifier.",
      ],
    });
  }
  if (h.pregnant) {
    out.push({
      id: "pregnant",
      who: "During pregnancy",
      tips: [
        "Limit time outdoors on high-AQI days; PM2.5 exposure is linked to low birth weight.",
        "Wear a well-fitted N95 when going out and avoid traffic-heavy routes.",
        "Avoid smoke from incense, mosquito coils and cooking fires.",
      ],
    });
  }
  if (h.respiratoryCondition) {
    out.push({
      id: "respiratory",
      who: "Asthma or lung condition",
      tips: [
        "Follow the asthma action plan and keep the reliever inhaler at hand.",
        bad
          ? "Stay indoors with filtered air; avoid exertion outdoors entirely today."
          : "Check the forecast before outdoor exercise.",
        "Seek medical care if the reliever is needed more often than usual.",
      ],
    });
  }
  if (h.heartCondition) {
    out.push({
      id: "heart",
      who: "Heart condition",
      tips: [
        "Fine particles raise the risk of heart attacks and arrhythmias during smog episodes.",
        "Avoid strenuous effort outdoors; call emergency services for chest pain.",
      ],
    });
  }
  if (h.pets) {
    out.push({
      id: "pets",
      who: "Your pets",
      tips: [
        "Shorten walks on bad-air days and wipe paws after; short-nosed breeds are most sensitive.",
      ],
    });
  }
  if (out.length === 0) {
    out.push({
      id: "adults",
      who: "Adults in the home",
      tips: [
        bad
          ? "Reduce long or intense outdoor activity and wear an N95 for essential trips."
          : "Normal activity is fine; check the forecast for spikes.",
      ],
    });
  }
  return out;
}
