import { categorizeAqi, type AqiLevel } from "@/lib/domain/aqi";
import { cn } from "@/lib/utils";
import { AQI_CLASSES, AQI_FILL_VAR, AQI_SCALE } from "@/lib/ui/constants";



export function AqiBadge({ aqi, className }: { aqi: number; className?: string }) {
  const cat = categorizeAqi(aqi);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        AQI_CLASSES[cat.level],
        className,
      )}
    >
      <span className="font-mono">{Math.round(aqi)}</span>
      <span>{cat.label}</span>
    </span>
  );
}

const SCALE: { level: AqiLevel; label: string; range: string }[] = [
  { level: "good", label: "Good", range: "0–50" },
  { level: "moderate", label: "Moderate", range: "51–100" },
  { level: "sensitive", label: "Sensitive", range: "101–150" },
  { level: "unhealthy", label: "Unhealthy", range: "151–200" },
  { level: "very-unhealthy", label: "Very unhealthy", range: "201–300" },
  { level: "hazardous", label: "Hazardous", range: "301+" },
];

export function AqiScale({ current }: { current: number }) {
  const active = categorizeAqi(current).level;
  return (
    <ol className="grid grid-cols-3 gap-1 sm:grid-cols-6" aria-label="US AQI scale">
      {SCALE.map((s) => (
        <li
          key={s.level}
          aria-current={s.level === active ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1.5 text-[11px] leading-tight",
            AQI_CLASSES[s.level],
            s.level === active ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : "opacity-70",
          )}
        >
          <span className="block font-semibold">{s.label}</span>
          <span className="font-mono">{s.range}</span>
        </li>
      ))}
    </ol>
  );
}
