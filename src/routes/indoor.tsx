import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { PageHeader } from "@/components/app/site-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAirQuality } from "@/hooks/use-air-quality";
import { recommendedCadr, steadyStateIndoorPm25 } from "@/lib/domain/impact";
import { useProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/indoor")({
  head: () => ({
    meta: [
      { title: "Indoor air quality hacks for smog days — WinterShield AI" },
      {
        name: "description",
        content:
          "Practical, low-cost ways to keep indoor air clean during winter smog, with a purifier sizing calculator.",
      },
      { property: "og:title", content: "Indoor air quality hacks — WinterShield AI" },
      {
        property: "og:description",
        content: "Clean-room setup, DIY filters, safe heating and a purifier calculator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndoorPage,
});

const ACH_PRESETS = [
  { value: 1, label: "Leaky (old windows, gaps)" },
  { value: 0.5, label: "Average (windows closed)" },
  { value: 0.25, label: "Well sealed" },
];

const GUIDES: { title: string; items: string[] }[] = [
  {
    title: "Make one clean room",
    items: [
      "Choose the bedroom where the most vulnerable family members sleep.",
      "Close windows and doors; seal obvious gaps with tape or a door draught stopper.",
      "Run a HEPA purifier sized to the room (see calculator) on high overnight.",
    ],
  },
  {
    title: "DIY filter cube (Corsi–Rosenthal box)",
    items: [
      "Tape four MERV-13 (or similar) furnace filters into a cube with a 20-inch box fan on top, blowing out.",
      "Costs a fraction of a commercial purifier and typically delivers several hundred m³/h.",
      "Replace filters when they turn grey — usually every few months in heavy smog.",
    ],
  },
  {
    title: "Cut indoor sources",
    items: [
      "Skip incense, dhoop, mosquito coils and candles on bad-air days.",
      "Use lids, the exhaust fan and less deep-frying; pressure-cook or steam instead.",
      "Wet-mop and damp-dust instead of sweeping, which re-suspends fine dust.",
    ],
  },
  {
    title: "Heat safely",
    items: [
      "Never sleep with a coal angithi, wood or kerosene heater burning in a closed room — carbon monoxide is odourless and can kill.",
      "An inverter AC in heat mode uses about a third of the electricity of a resistive heater for the same warmth.",
      "Fit a battery carbon-monoxide alarm if any fuel is burned indoors.",
    ],
  },
  {
    title: "Ventilate smartly",
    items: [
      "Air the home for 10–15 minutes during the cleanest forecast hours (usually mid-afternoon).",
      "Keep the purifier running after airing to clear what came in.",
      "Indoor plants look nice but remove negligible PM2.5 — don't rely on them.",
    ],
  },
];

function IndoorPage() {
  const { profile } = useProfile();
  const air = useAirQuality(profile.location);
  const ids = { area: useId(), height: useId(), cadr: useId(), outdoor: useId(), ach: useId() };
  const [area, setArea] = useState(14);
  const [height, setHeight] = useState(profile.home.ceilingHeightM);
  const [cadr, setCadr] = useState(profile.home.hasPurifier ? profile.home.purifierCadrM3h : 250);
  const [ach, setAch] = useState(0.5);
  const [outdoorOverride, setOutdoorOverride] = useState<number | null>(null);
  const outdoor = outdoorOverride ?? Math.round(air.data?.current.pm25 ?? 150);

  const volume = Math.max(4, area) * Math.min(6, Math.max(2, height));
  const without = steadyStateIndoorPm25({
    outdoorPm25: outdoor,
    roomVolumeM3: volume,
    cadrM3h: 0,
    airChangesPerHour: ach,
  });
  const withP = steadyStateIndoorPm25({
    outdoorPm25: outdoor,
    roomVolumeM3: volume,
    cadrM3h: cadr,
    airChangesPerHour: ach,
  });
  const needed = recommendedCadr(volume);

  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v);
    // Allow free typing; the model clamps values to realistic ranges below.
    return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback;
  };

  return (
    <>
      <PageHeader
        eyebrow="Indoor air"
        title="Keep the smog outside"
        lead="On bad days, outdoor smog seeps in through gaps. These steps cost little and cut what your family breathes indoors."
      />

      <section aria-labelledby="calc-h" className="paper grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <h2 id="calc-h" className="font-display text-3xl">
            Purifier calculator
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimate a room's PM2.5 with and without filtration.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={ids.area}>Room area (m²)</Label>
              <Input
                id={ids.area}
                type="number"
                inputMode="decimal"
                min={4}
                max={200}
                value={area}
                onChange={(e) => setArea(num(e.target.value, 4, 200, area))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.height}>Ceiling height (m)</Label>
              <Input
                id={ids.height}
                type="number"
                inputMode="decimal"
                step={0.1}
                min={2}
                max={6}
                value={height}
                onChange={(e) => setHeight(num(e.target.value, 2, 6, height))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.cadr}>Purifier CADR (m³/h)</Label>
              <Input
                id={ids.cadr}
                type="number"
                inputMode="numeric"
                min={0}
                max={2000}
                value={cadr}
                onChange={(e) => setCadr(num(e.target.value, 0, 2000, cadr))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.outdoor}>Outdoor PM2.5 (µg/m³)</Label>
              <Input
                id={ids.outdoor}
                type="number"
                inputMode="numeric"
                min={0}
                max={2000}
                value={outdoor}
                onChange={(e) => setOutdoorOverride(num(e.target.value, 0, 2000, outdoor))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor={ids.ach}>How airtight is the room?</Label>
              <select
                id={ids.ach}
                value={ach}
                onChange={(e) => setAch(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ACH_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} — {p.value} air changes/h
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div
          className="flex flex-col justify-center rounded-xl bg-secondary p-6"
          aria-live="polite"
        >
          <p className="eyebrow">Estimated room PM2.5</p>
          <p className="mt-2 font-display text-6xl">
            <span className="font-mono text-5xl">{without.indoorPm25}</span>
            <span aria-hidden="true" className="mx-3 text-muted-foreground">
              →
            </span>
            <span className="sr-only"> without purifier, and </span>
            <span className="font-mono text-5xl text-primary">{withP.indoorPm25}</span>
            <span className="ml-2 text-base text-muted-foreground">µg/m³ with purifier</span>
          </p>
          <p className="mt-3 text-sm">
            That is <strong>{withP.reductionPercent}%</strong> below outdoor air. For this{" "}
            {Math.round(volume)} m³ room, aim for at least{" "}
            <strong className="font-mono">{needed} m³/h</strong> CADR.
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            C_in = P·a·C_out ÷ (a + k + CADR/V) = {withP.formula} ; P = 1, k = 0.2/h
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Steady-state estimate; real rooms vary with door opening, cooking and filter condition.
          </p>
        </div>
      </section>

      <section aria-labelledby="guides-h" className="mt-10">
        <h2 id="guides-h" className="font-display text-3xl">
          Practical fixes
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => (
            <li key={g.title} className="paper p-5">
              <h3 className="font-semibold">{g.title}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-foreground/85">
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
