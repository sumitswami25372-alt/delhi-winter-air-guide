import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPlaces } from "@/lib/air.functions";
import type { Place } from "@/lib/domain/profile";

export function LocationPicker({ onSelect }: { onSelect: (place: Place) => void }) {
  const search = useServerFn(searchPlaces);
  const [query, setQuery] = useState("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const inputId = useId();
  const statusId = useId();
  const mutation = useMutation({ mutationFn: (q: string) => search({ data: { query: q } }) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) mutation.mutate(query.trim());
  };

  const useMyLocation = () => {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        onSelect({
          name: "My location",
          country: "",
          // Rounded to ~1 km so a precise home location is never stored.
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
        }),
      () => setGeoError("Location permission was denied. Search for your city instead."),
      { maximumAge: 600000, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        role="search"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={inputId}>Search city or town</Label>
          <Input
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Lahore, Kathmandu, Lucknow"
            autoComplete="off"
            aria-describedby={statusId}
            maxLength={80}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending || query.trim().length < 2}>
          <Search aria-hidden="true" /> Search
        </Button>
        <Button type="button" variant="outline" onClick={useMyLocation}>
          <LocateFixed aria-hidden="true" /> Use my location
        </Button>
      </form>
      <p id={statusId} role="status" className="text-sm text-muted-foreground">
        {mutation.isPending
          ? "Searching…"
          : mutation.isError
            ? "Search failed. Please try again."
            : mutation.data
              ? `${mutation.data.length} place${mutation.data.length === 1 ? "" : "s"} found`
              : (geoError ?? "")}
      </p>
      {mutation.data && mutation.data.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Search results">
          {mutation.data.map((p) => (
            <li key={`${p.latitude},${p.longitude}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect({
                    name: p.name,
                    country: p.country,
                    latitude: p.latitude,
                    longitude: p.longitude,
                  });
                  mutation.reset();
                  setQuery("");
                }}
                className="flex w-full items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-muted-foreground">
                    {[p.region, p.country].filter(Boolean).join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
