import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/site-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  commuteImpact,
  heatingCo2PerHour,
  INDOOR_COMBUSTION_HEATING,
  TRANSPORT_CO2,
  treeEquivalent,
  WORK_WEEKS_PER_YEAR,
} from "@/lib/domain/impact";
import { HEATING_DAYS_PER_SEASON, HEATING_HOURS_PER_DAY } from "@/lib/domain/recommendations";
import {
  HEATING_LABELS,
  HEATING_TYPES,
  TRANSPORT_LABELS,
  TRANSPORT_MODES,
  type TransportMode,
} from "@/lib/domain/profile";
import { useProfile } from "@/lib/profile-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Sustainable alternatives & their impact — WinterShield AI" },
      {
        name: "description",
        content:
          "Compare commute and heating options and see the CO₂ and smog impact of each choice, with every formula shown.",
      },
      { property: "og:title", content: "Sustainable alternatives & impact — WinterShield AI" },
      {
        property: "og:description",
        content: "See exactly how much each low-emission choice saves, with transparent maths.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImpactPage,
});

const COMPARE_MODES = TRANSPORT_MODES.filter((m) => m !== "work_from_home");

function ImpactPage() {
  const { profile, update } = useProfile();
  const ids = { mode: useId(), km: useId(), days: useId() };
  const [mode, setMode] = useState<TransportMode>(profile.commute.mode);
  const [km, setKm] = useState(profile.commute.oneWayKm);
  const [days, setDays] = useState(profile.commute.daysPerWeek);

  const rows = useMemo(
    () =>
      COMPARE_MODES.map((m) => ({ mode: m, ...commuteImpact(m, km, days) })).sort(
        (a, b) => a.annualCo2Kg - b.annualCo2Kg,
      ),
    [km, days],
  );
  const current = commuteImpact(mode, km, days);
  const heatRows = HEATING_TYPES.filter((h) => h !== "none").map((h) => ({
    type: h,
    perHour: heatingCo2PerHour(h),
    season: Math.round(heatingCo2PerHour(h) * HEATING_HOURS_PER_DAY * HEATING_DAYS_PER_SEASON),
    indoorSmoke: INDOOR_COMBUSTION_HEATING.includes(h),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Impact"
        title="See what each choice changes"
        lead="Every number below shows its formula and source, so you can check it — and compare greener alternatives side by side."
      />

      <section aria-labelledby="commute-h" className="paper p-6">
        <h2 id="commute-h" className="font-display text-3xl">
          Your commute
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={ids.mode}>Current mode</Label>
            <select
              id={ids.mode}
              value={mode}
              onChange={(e) => setMode(e.target.value as TransportMode)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {TRANSPORT_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.km}>One-way distance (km)</Label>
            <Input
              id={ids.km}
              type="number"
              inputMode="decimal"
              min={0}
              max={200}
              value={km}
              onChange={(e) => setKm(Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.days}>Days per week</Label>
            <Input
              id={ids.days}
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              value={days}
              onChange={(e) =>
                setDays(Math.min(7, Math.max(0, Math.round(Number(e.target.value) || 0))))
              }
            />
          </div>
        </div>
        <p className="mt-4 text-sm" aria-live="polite">
          {TRANSPORT_LABELS[mode]}:{" "}
          <strong className="font-mono">{current.annualCo2Kg} kg CO₂e</strong> and about{" "}
          <strong className="font-mono">{current.annualPm25G} g</strong> of PM2.5 a year.{" "}
          <span className="font-mono text-xs text-muted-foreground">({current.formula})</span>
        </p>
        <button
          type="button"
          className="mt-2 text-sm text-primary underline underline-offset-2"
          onClick={() =>
            update((p) => ({ ...p, commute: { mode, oneWayKm: km, daysPerWeek: days } }))
          }
        >
          Save this commute to my profile
        </button>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="mb-2 text-left text-muted-foreground">
              Yearly impact of each option for {km} km each way, {days} days a week,{" "}
              {WORK_WEEKS_PER_YEAR} weeks.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Option
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Factor
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  CO₂e / year
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  vs. current
                </th>
                <th scope="col" className="py-2 font-medium">
                  PM2.5 / year
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diff = Math.round(current.annualCo2Kg - r.annualCo2Kg);
                return (
                  <tr
                    key={r.mode}
                    className={cn("border-b border-border/50", r.mode === mode && "bg-secondary")}
                  >
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {TRANSPORT_LABELS[r.mode]}
                      {r.mode === mode ? (
                        <span className="ml-1 text-xs text-muted-foreground">(current)</span>
                      ) : null}
                    </th>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {TRANSPORT_CO2[r.mode].value} kg/pkm
                    </td>
                    <td className="py-2 pr-4 font-mono">{r.annualCo2Kg} kg</td>
                    <td className="py-2 pr-4 font-mono">
                      {diff > 0
                        ? `−${diff} kg (${treeEquivalent(diff)} trees)`
                        : diff < 0
                          ? `+${-diff} kg`
                          : "—"}
                    </td>
                    <td className="py-2 font-mono">{r.annualPm25G} g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="heat-h" className="paper mt-8 p-6">
        <h2 id="heat-h" className="font-display text-3xl">
          Heating this winter
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          For 2 kW of warmth, {HEATING_HOURS_PER_DAY} hours a day for {HEATING_DAYS_PER_SEASON}{" "}
          days.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">CO₂ and indoor smoke by heating type</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Heater
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  kg CO₂ / hour
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  kg CO₂ / season
                </th>
                <th scope="col" className="py-2 font-medium">
                  Indoor smoke / fumes
                </th>
              </tr>
            </thead>
            <tbody>
              {heatRows.map((h) => (
                <tr
                  key={h.type}
                  className={cn(
                    "border-b border-border/50",
                    h.type === profile.home.heating && "bg-secondary",
                  )}
                >
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {HEATING_LABELS[h.type]}
                    {h.type === profile.home.heating ? (
                      <span className="ml-1 text-xs text-muted-foreground">(yours)</span>
                    ) : null}
                  </th>
                  <td className="py-2 pr-4 font-mono">{h.perHour}</td>
                  <td className="py-2 pr-4 font-mono">{h.season}</td>
                  <td className="py-2">{h.indoorSmoke ? "Yes — ventilate, CO risk" : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Electric options use India's average grid factor (0.716 kg CO₂/kWh). Wood is largely
          biogenic CO₂, but its smoke is the most harmful for indoor air; coal is shown.
        </p>
      </section>

      <p className="mt-6 text-sm">
        All factors, sources and assumptions are listed on the{" "}
        <Link to="/methodology" className="text-primary underline underline-offset-2">
          methodology page
        </Link>
        .
      </p>
    </>
  );
}
