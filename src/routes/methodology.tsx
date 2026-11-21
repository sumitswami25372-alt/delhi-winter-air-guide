import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/site-shell";
import {
  GRID_KG_CO2_PER_KWH,
  TRANSPORT_CO2,
  TREE_KG_CO2_PER_YEAR,
  WORK_WEEKS_PER_YEAR,
} from "@/lib/domain/impact";
import { TRANSPORT_LABELS, TRANSPORT_MODES } from "@/lib/domain/profile";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology, data sources & privacy — WinterShield AI" },
      {
        name: "description",
        content: "How WinterShield AI gets air data, calculates impact and protects your privacy.",
      },
      { property: "og:title", content: "Methodology & privacy — WinterShield AI" },
      {
        property: "og:description",
        content: "Data sources, emission factors, formulas and privacy practices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        title="How the numbers work"
        lead="Sources, formulas, assumptions and how your data is handled."
      />
      <div className="space-y-6">
        <section aria-labelledby="data-h" className="paper p-6 text-sm">
          <h2 id="data-h" className="font-display text-2xl">
            Air data
          </h2>
          <p className="mt-2">
            Live and forecast readings come from the Open-Meteo Air Quality API, which serves
            Copernicus (CAMS) model data at roughly 10–40 km resolution. It is modelled, not a local
            monitor, so readings near busy roads or fires can be higher. AQI uses the US EPA scale.
          </p>
        </section>
        <section aria-labelledby="factors-h" className="paper p-6 text-sm">
          <h2 id="factors-h" className="font-display text-2xl">
            Emission factors
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left">
              <caption className="sr-only">Transport emission factors</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Mode
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Factor
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {TRANSPORT_MODES.map((m) => (
                  <tr key={m} className="border-b border-border/50">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {TRANSPORT_LABELS[m]}
                    </th>
                    <td className="py-2 pr-4 font-mono">
                      {TRANSPORT_CO2[m].value} {TRANSPORT_CO2[m].unit}
                    </td>
                    <td className="py-2">{TRANSPORT_CO2[m].source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              Grid electricity: {GRID_KG_CO2_PER_KWH.value} {GRID_KG_CO2_PER_KWH.unit} (
              {GRID_KG_CO2_PER_KWH.source}).
            </li>
            <li>
              Commutes: one-way km × 2 × days per week × factor × {WORK_WEEKS_PER_YEAR} weeks.
            </li>
            <li>Tree equivalent: {TREE_KG_CO2_PER_YEAR} kg CO₂ per mature tree per year.</li>
            <li>PM2.5 per km values are indicative (about ±50%), including tyre and brake wear.</li>
            <li>
              Indoor PM2.5: steady-state model C_in = P·a·C_out ÷ (a + k + CADR/V), with P = 1 and k
              = 0.2/h.
            </li>
          </ul>
        </section>
        <section aria-labelledby="privacy-h" className="paper p-6 text-sm">
          <h2 id="privacy-h" className="font-display text-2xl">
            Privacy
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Your household profile is stored only in this browser. You can delete it on the Family
              page.
            </li>
            <li>"Use my location" is rounded to about 1 km before use.</li>
            <li>
              When you ask the assistant, your question and a household summary go to the AI model
              to answer. Conversations are not saved by WinterShield.
            </li>
            <li>No accounts, no tracking cookies.</li>
          </ul>
        </section>
        <p className="text-xs text-muted-foreground">
          Guidance is general information, not medical advice. Seek urgent care for breathing
          difficulty or chest pain.
        </p>
      </div>
    </>
  );
}
