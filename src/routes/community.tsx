import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Share2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAirQuality } from "@/hooks/use-air-quality";
import { findCleanestWindow } from "@/lib/domain/aqi";
import {
  buildAlertMessage,
  COMMUNITY_ACTIONS,
  communityTotal,
  type CommunityActionId,
} from "@/lib/domain/community";
import { formatHour } from "@/lib/domain/recommendations";
import { useProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community clean-air action — WinterShield AI" },
      {
        name: "description",
        content:
          "Calculate the collective impact of your neighbourhood's choices and share smog alerts with your building or school group.",
      },
      { property: "og:title", content: "Community clean-air action — WinterShield AI" },
      {
        property: "og:description",
        content: "Collective impact calculator and shareable smog alerts for neighbourhoods.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

const CHECKLIST = [
  "Agree a no-burning pact for leaves and rubbish with residents, guards and sweepers — arrange composting instead.",
  "Offer guards and night staff an electric heater or warm clothing so they don't need bonfires.",
  "Set up a carpool or shared school-run rota in your building group.",
  "Ask schools to move sports and assemblies indoors when AQI is above 200.",
  "Report open burning or construction dust to your city's pollution complaint channel (in India, CPCB's Sameer app or Delhi's Green Delhi app).",
  "Pool money for a shared DIY filter-box workshop for families who can't afford purifiers.",
];

function CommunityPage() {
  const { profile } = useProfile();
  const air = useAirQuality(profile.location);
  const ids = { households: useId(), action: useId(), message: useId() };
  const [households, setHouseholds] = useState(50);
  const [action, setAction] = useState<CommunityActionId>("car-free-2days");
  const result = communityTotal(action, households);

  const w = air.data ? findCleanestWindow(air.data.hourly.slice(0, 24), 2) : null;
  const message = air.data
    ? buildAlertMessage(
        profile.location.name,
        air.data.current.aqi,
        air.data.current.pm25,
        w ? `${formatHour(w.start)}–${formatHour(w.end)}` : null,
      )
    : "Loading live air data…";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Alert copied — paste it in your group chat.");
    } catch {
      toast.error("Copy failed. Select the text and copy it manually.");
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Smog alert", text: message });
      } catch {
        /* user cancelled */
      }
    } else {
      await copy();
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Clean air is a team effort"
        lead="One household's change is small. A building, colony or school acting together makes a measurable difference on your street."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="collective-h" className="paper p-6">
          <h2 id="collective-h" className="font-display text-3xl">
            Collective impact
          </h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={ids.action}>Shared action</Label>
              <select
                id={ids.action}
                value={action}
                onChange={(e) => setAction(e.target.value as CommunityActionId)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {COMMUNITY_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.households}>Number of households taking part</Label>
              <Input
                id={ids.households}
                type="number"
                min={1}
                max={100000}
                value={households}
                onChange={(e) =>
                  setHouseholds(
                    Math.min(100000, Math.max(0, Math.round(Number(e.target.value) || 0))),
                  )
                }
              />
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-secondary p-5" aria-live="polite">
            <p className="eyebrow">Avoided each year</p>
            <p className="mt-1 font-mono text-4xl">
              {result.totalKg.toLocaleString("en-IN")} kg CO₂
            </p>
            <p className="mt-1 text-sm">
              ≈ the yearly uptake of {result.trees.toLocaleString("en-IN")} mature trees.
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {result.perHouseholdKg} kg × {households} households · {result.basis}
            </p>
          </div>
        </section>

        <section aria-labelledby="alert-h" className="paper p-6">
          <h2 id="alert-h" className="font-display text-3xl">
            Share a smog alert
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A ready-made message with today's live reading for your building, school or office
            group.
          </p>
          <Label htmlFor={ids.message} className="sr-only">
            Alert message
          </Label>
          <Textarea
            id={ids.message}
            readOnly
            value={message}
            rows={7}
            className="mt-3 font-mono text-xs"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void share()} disabled={!air.data}>
              <Share2 aria-hidden="true" /> Share
            </Button>
            <Button variant="outline" onClick={() => void copy()} disabled={!air.data}>
              <Copy aria-hidden="true" /> Copy
            </Button>
            <Button variant="ghost" asChild>
              <Link
                to="/assistant"
                search={{
                  q: "Draft a short, friendly notice for our residents' association about reducing smog this week",
                }}
              >
                Draft a notice with AI
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <section aria-labelledby="check-h" className="mt-10">
        <h2 id="check-h" className="font-display text-3xl">
          Neighbourhood checklist
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {CHECKLIST.map((c) => (
            <li key={c} className="paper p-4 text-sm">
              {c}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
