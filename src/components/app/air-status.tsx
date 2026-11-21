import { AlertTriangle, RefreshCw } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categorizeAqi, findCleanestWindow, pm25TimesWhoGuideline } from "@/lib/domain/aqi";
import { formatHour, type AirSnapshot } from "@/lib/domain/recommendations";
import type { Place } from "@/lib/domain/profile";
import { cn } from "@/lib/utils";
import { AQI_CLASSES, AqiScale } from "./aqi";

function Pollutant({
  label,
  value,
  unit = "µg/m³",
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-base text-foreground">
        {value === null ? "—" : Math.round(value)}{" "}
        <span className="text-xs text-muted-foreground">{unit}</span>
      </dd>
    </div>
  );
}

export function AirStatus({ place, query }: { place: Place; query: UseQueryResult<AirSnapshot> }) {
  if (query.isPending) {
    return (
      <section aria-busy="true" aria-label="Loading live air quality" className="paper p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-24 w-48" />
        <Skeleton className="mt-4 h-10 w-full" />
      </section>
    );
  }
  if (query.isError) {
    return (
      <section role="alert" className="paper flex flex-col items-start gap-3 p-6">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle aria-hidden="true" className="size-5 text-destructive" />
          Live air data for {place.name} could not be loaded.
        </p>
        <p className="text-sm text-muted-foreground">
          Recommendations need live readings. Check your connection and try again.
        </p>
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw aria-hidden="true" /> Try again
        </Button>
      </section>
    );
  }
  const air = query.data;
  const cat = categorizeAqi(air.current.aqi);
  const window = findCleanestWindow(air.hourly.slice(0, 24), 2);
  return (
    <section aria-labelledby="air-now" className="paper overflow-hidden">
      <div className={cn("relative px-6 py-6", AQI_CLASSES[cat.level])}>
        <p className="eyebrow !text-current opacity-80">
          Live · {place.name}
          {place.country ? `, ${place.country}` : ""}
        </p>
        <h2 id="air-now" className="sr-only">
          Air quality now
        </h2>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p
            className="font-display text-8xl leading-none"
            aria-label={`US AQI ${Math.round(air.current.aqi)}`}
          >
            {Math.round(air.current.aqi)}
          </p>
          <div className="pb-2">
            <p className="text-2xl font-semibold">{cat.label}</p>
            <p className="max-w-md text-sm opacity-90">{cat.summary}</p>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-6">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Pollutant label="PM2.5" value={air.current.pm25} />
          <Pollutant label="PM10" value={air.current.pm10} />
          <Pollutant label="NO₂" value={air.current.no2} />
          <Pollutant label="Ozone" value={air.current.o3} />
        </dl>
        <p className="text-sm">
          PM2.5 is <strong className="font-mono">{pm25TimesWhoGuideline(air.current.pm25)}×</strong>{" "}
          the WHO 24-hour guideline (15 µg/m³).
          {window ? (
            <>
              {" "}
              Cleanest 2 hours ahead:{" "}
              <strong>
                {formatHour(window.start)}–{formatHour(window.end)}
              </strong>{" "}
              (≈{window.avgPm25} µg/m³).
            </>
          ) : null}
        </p>
        <AqiScale current={air.current.aqi} />
        <p className="text-xs text-muted-foreground">
          Updated {air.current.time.replace("T", " ")} ({air.timezone}). Modelled CAMS data at
          ~10–40 km resolution; local monitors can differ.
        </p>
      </div>
    </section>
  );
}
