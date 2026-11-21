import { Activity, Home, Leaf, ShieldAlert, Users } from "lucide-react";
import type { Recommendation, RecommendationCategory } from "@/lib/domain/recommendations";
import { cn } from "@/lib/utils";

const META: Record<RecommendationCategory, { label: string; Icon: typeof Activity }> = {
  health: { label: "Health", Icon: ShieldAlert },
  routine: { label: "Daily routine", Icon: Activity },
  indoor: { label: "Indoor air", Icon: Home },
  alternative: { label: "Sustainable switch", Icon: Leaf },
  community: { label: "Community", Icon: Users },
};

const PRIORITY_LABEL = { 1: "Act today", 2: "Important", 3: "Worthwhile" } as const;

export function RecommendationCard({
  rec,
  headingLevel = 3,
}: {
  rec: Recommendation;
  headingLevel?: 2 | 3;
}) {
  const { label, Icon } = META[rec.category];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="paper flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-1.5">
          <Icon aria-hidden="true" className="size-3.5" /> {label}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            rec.priority === 1
              ? "bg-ember text-ember-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {PRIORITY_LABEL[rec.priority]}
        </span>
      </div>
      <Heading className="mt-3 text-lg font-semibold leading-snug text-foreground">
        {rec.title}
      </Heading>
      <p className="mt-2 text-sm text-foreground/85">{rec.detail}</p>
      <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Why it matters: </span>
        {rec.why}
      </p>
      {rec.impact ? (
        <div className="mt-auto pt-4">
          <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
            <p className="text-secondary-foreground">
              <span className="font-medium">{rec.impact.label}:</span>{" "}
              <span className="font-mono">{rec.impact.value}</span>
            </p>
            {rec.impact.formula ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                <span className="sr-only">Calculation: </span>
                {rec.impact.formula}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
