import { Link } from "@tanstack/react-router";
import { Wind } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Today" },
  { to: "/assistant", label: "Assistant" },
  { to: "/indoor", label: "Indoor air" },
  { to: "/impact", label: "Impact" },
  { to: "/family", label: "Family" },
  { to: "/community", label: "Community" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col haze-backdrop">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-foreground"
            aria-label="WinterShield AI home"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Wind aria-hidden="true" className="size-4" />
            </span>
            <span className="font-display text-2xl leading-none">WinterShield</span>
            <span className="eyebrow mt-1">AI</span>
          </Link>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    activeOptions={{ exact: n.to === "/" }}
                    className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:font-semibold data-[status=active]:text-foreground"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none"
      >
        {children}
      </main>
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            Air data: CAMS forecasts via{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://open-meteo.com/"
              rel="noreferrer"
              target="_blank"
            >
              Open-Meteo
            </a>
            . Guidance is general information, not medical advice.
          </p>
          <Link to="/methodology" className="underline underline-offset-2 hover:text-foreground">
            Methodology &amp; privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      {lead ? <p className="mt-3 text-lg text-muted-foreground">{lead}</p> : null}
    </div>
  );
}
