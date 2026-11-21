import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { AirStatus } from "@/components/app/air-status";
import { ForecastChart } from "@/components/app/forecast-chart";
import { LocationPicker } from "@/components/app/location-picker";
import { RecommendationCard } from "@/components/app/recommendation-card";
import { PageHeader } from "@/components/app/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAirQuality } from "@/hooks/use-air-quality";
import { categorizeAqi } from "@/lib/domain/aqi";
import { buildDailyPlan, buildRecommendations } from "@/lib/domain/recommendations";
import { useProfile } from "@/lib/profile-store";
import { AQI_CLASSES } from "@/lib/ui/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today's air & family plan — WinterShield AI" },
      {
        name: "description",
        content:
          "Live AQI for your city, a smog-aware daily routine and personalised actions to protect your family.",
      },
      { property: "og:title", content: "Today's air & family plan — WinterShield AI" },
      {
        property: "og:description",
        content: "Live AQI, a smog-aware daily routine and personalised family actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { profile, update } = useProfile();
  const [changing, setChanging] = useState(false);
  const air = useAirQuality(profile.location);

  const plan = useMemo(
    () => (air.data ? buildDailyPlan(air.data, profile) : []),
    [air.data, profile],
  );
  const recs = useMemo(
    () => (air.data ? buildRecommendations(air.data, profile) : []),
    [air.data, profile],
  );

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Breathe easier through the smog season"
        lead="Live air readings, a routine planned around the cleanest hours, and actions tailored to your household."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{profile.location.name}</strong>
        </p>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={changing}
          onClick={() => setChanging((v) => !v)}
        >
          {changing ? "Close" : "Change location"}
        </Button>
        <Link to="/family" className="text-sm text-primary underline underline-offset-2">
          Edit household profile
        </Link>
      </div>
      {changing ? (
        <div className="paper mb-6 p-5">
          <LocationPicker
            onSelect={(place) => {
              update((p) => ({ ...p, location: place }));
              setChanging(false);
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <AirStatus place={profile.location} query={air} />
        <section aria-labelledby="forecast-h" className="paper p-6">
          <h2 id="forecast-h" className="font-display text-2xl">
            Next 24 hours
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">Hourly US AQI forecast</p>
          {air.isPending ? (
            <div className="space-y-2 py-4" aria-busy="true" aria-label="Loading forecast">
              <Skeleton className="h-44 w-full" />
            </div>
          ) : air.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Forecast could not be loaded. Please refresh or try again later.
            </p>
          ) : air.data ? (
            <ForecastChart points={air.data.hourly} />
          ) : (
            <p className="text-sm text-muted-foreground">No forecast data available.</p>
          )}
        </section>
      </div>

      {plan.length > 0 ? (
        <section aria-labelledby="plan-h" className="mt-10">
          <h2 id="plan-h" className="font-display text-3xl">
            Your low-exposure day
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {plan.map((b) => (
              <li key={b.id} className="paper p-4">
                <p className="text-sm font-semibold">{b.label}</p>
                {b.avgAqi !== null ? (
                  <p
                    className={cn(
                      "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                      AQI_CLASSES[categorizeAqi(b.avgAqi).level],
                    )}
                  >
                    AQI ≈ <span className="font-mono">{b.avgAqi}</span> ·{" "}
                    {categorizeAqi(b.avgAqi).label}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-foreground/85">{b.advice}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {recs.length > 0 ? (
        <section aria-labelledby="recs-h" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="recs-h" className="font-display text-3xl">
                What to do for your household
              </h2>
              <p className="text-sm text-muted-foreground">
                Ranked by urgency for today's air and your profile.
              </p>
            </div>
            <Button asChild>
              <Link to="/assistant">
                <MessageCircle aria-hidden="true" /> Ask the assistant
              </Link>
            </Button>
          </div>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recs.slice(0, 9).map((r) => (
              <li key={r.id}>
                <RecommendationCard rec={r} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
