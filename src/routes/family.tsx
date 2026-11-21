import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { LocationPicker } from "@/components/app/location-picker";
import { PageHeader } from "@/components/app/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAirQuality } from "@/hooks/use-air-quality";
import { memberGuidance } from "@/lib/domain/family";
import {
  COOKING_FUELS,
  COOKING_LABELS,
  HEATING_LABELS,
  HEATING_TYPES,
  profileSchema,
  TRANSPORT_LABELS,
  TRANSPORT_MODES,
  type Profile,
} from "@/lib/domain/profile";
import { useProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family profile & member guidance — WinterShield AI" },
      {
        name: "description",
        content:
          "Tell WinterShield about your household to get smog advice for children, elders and anyone with health conditions.",
      },
      { property: "og:title", content: "Family profile — WinterShield AI" },
      {
        property: "og:description",
        content: "Personalised smog guidance for every member of your household.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FamilyPage,
});

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function Field({ label, children, id }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

function FamilyPage() {
  const { profile, save, reset } = useProfile();
  const [draft, setDraft] = useState<Profile>(profile);
  useEffect(() => setDraft(profile), [profile]);
  const air = useAirQuality(profile.location);
  const guidance = memberGuidance(profile, air.data?.current.aqi ?? null);
  const id = {
    adults: useId(),
    children: useId(),
    seniors: useId(),
    area: useId(),
    height: useId(),
    cadr: useId(),
    heating: useId(),
    cooking: useId(),
    mode: useId(),
    km: useId(),
    days: useId(),
    time: useId(),
  };

  const set = <K extends keyof Profile>(key: K, patch: Partial<Profile[K]>) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  const int = (v: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = profileSchema.safeParse(draft);
    if (!result.success) {
      toast.error("Some values are out of range. Please check the form.");
      return;
    }
    save(result.data);
    toast.success("Household profile saved on this device.");
  };

  return (
    <>
      <PageHeader
        eyebrow="Family"
        title="Your household"
        lead="Recommendations adapt to who lives with you, your home and how you get around. Everything stays on this device."
      />

      <section aria-labelledby="guidance-h" className="mb-10">
        <h2 id="guidance-h" className="font-display text-3xl">
          Guidance for each family member
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guidance.map((g) => (
            <li key={g.id} className="paper p-5">
              <h3 className="font-semibold">{g.who}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-foreground/85">
                {g.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={onSubmit} className="space-y-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="font-display text-3xl">
          Edit profile
        </h2>

        <fieldset className="paper p-5">
          <legend className="px-1 font-semibold">Location</legend>
          <p className="mb-3 text-sm">
            Current: <strong>{draft.location.name}</strong>
            {draft.location.country ? `, ${draft.location.country}` : ""}
          </p>
          <LocationPicker onSelect={(place) => setDraft((d) => ({ ...d, location: place }))} />
        </fieldset>

        <fieldset className="paper grid gap-4 p-5 sm:grid-cols-3">
          <legend className="px-1 font-semibold">Who lives here</legend>
          <Field label="Adults (18–64)" id={id.adults}>
            <Input
              id={id.adults}
              type="number"
              min={0}
              max={20}
              value={draft.household.adults}
              onChange={(e) => set("household", { adults: int(e.target.value, 20) })}
            />
          </Field>
          <Field label="Children (under 18)" id={id.children}>
            <Input
              id={id.children}
              type="number"
              min={0}
              max={20}
              value={draft.household.children}
              onChange={(e) => set("household", { children: int(e.target.value, 20) })}
            />
          </Field>
          <Field label="Seniors (65+)" id={id.seniors}>
            <Input
              id={id.seniors}
              type="number"
              min={0}
              max={20}
              value={draft.household.seniors}
              onChange={(e) => set("household", { seniors: int(e.target.value, 20) })}
            />
          </Field>
          <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
            <Check
              label="Someone is pregnant"
              checked={draft.household.pregnant}
              onChange={(v) => set("household", { pregnant: v })}
            />
            <Check
              label="Someone has asthma or a lung condition"
              checked={draft.household.respiratoryCondition}
              onChange={(v) => set("household", { respiratoryCondition: v })}
            />
            <Check
              label="Someone has a heart condition"
              checked={draft.household.heartCondition}
              onChange={(v) => set("household", { heartCondition: v })}
            />
            <Check
              label="We have pets"
              checked={draft.household.pets}
              onChange={(v) => set("household", { pets: v })}
            />
          </div>
        </fieldset>

        <fieldset className="paper grid gap-4 p-5 sm:grid-cols-3">
          <legend className="px-1 font-semibold">Home</legend>
          <Field label="Floor area (m²)" id={id.area}>
            <Input
              id={id.area}
              type="number"
              min={5}
              max={1000}
              value={draft.home.areaSqm}
              onChange={(e) =>
                set("home", { areaSqm: Math.min(1000, Math.max(5, Number(e.target.value) || 5)) })
              }
            />
          </Field>
          <Field label="Ceiling height (m)" id={id.height}>
            <Input
              id={id.height}
              type="number"
              step={0.1}
              min={2}
              max={6}
              value={draft.home.ceilingHeightM}
              onChange={(e) =>
                set("home", {
                  ceilingHeightM: Math.min(6, Math.max(2, Number(e.target.value) || 2)),
                })
              }
            />
          </Field>
          <Field label="Heating" id={id.heating}>
            <select
              id={id.heating}
              className={selectClass}
              value={draft.home.heating}
              onChange={(e) =>
                set("home", { heating: e.target.value as Profile["home"]["heating"] })
              }
            >
              {HEATING_TYPES.map((h) => (
                <option key={h} value={h}>
                  {HEATING_LABELS[h]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cooking fuel" id={id.cooking}>
            <select
              id={id.cooking}
              className={selectClass}
              value={draft.home.cookingFuel}
              onChange={(e) =>
                set("home", { cookingFuel: e.target.value as Profile["home"]["cookingFuel"] })
              }
            >
              {COOKING_FUELS.map((c) => (
                <option key={c} value={c}>
                  {COOKING_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Check
              label="We have an air purifier"
              checked={draft.home.hasPurifier}
              onChange={(v) => set("home", { hasPurifier: v })}
            />
            {draft.home.hasPurifier ? (
              <Field label="Purifier CADR (m³/h, on the box)" id={id.cadr}>
                <Input
                  id={id.cadr}
                  type="number"
                  min={0}
                  max={2000}
                  value={draft.home.purifierCadrM3h}
                  onChange={(e) => set("home", { purifierCadrM3h: int(e.target.value, 2000) })}
                />
              </Field>
            ) : null}
            <Check
              label="We burn incense, dhoop or candles"
              checked={draft.home.burnsIncenseOrCandles}
              onChange={(v) => set("home", { burnsIncenseOrCandles: v })}
            />
            <Check
              label="Someone smokes indoors"
              checked={draft.home.indoorSmoking}
              onChange={(v) => set("home", { indoorSmoking: v })}
            />
          </div>
        </fieldset>

        <fieldset className="paper grid gap-4 p-5 sm:grid-cols-3">
          <legend className="px-1 font-semibold">Getting around and exercise</legend>
          <Field label="Main commute" id={id.mode}>
            <select
              id={id.mode}
              className={selectClass}
              value={draft.commute.mode}
              onChange={(e) =>
                set("commute", { mode: e.target.value as Profile["commute"]["mode"] })
              }
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {TRANSPORT_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="One-way distance (km)" id={id.km}>
            <Input
              id={id.km}
              type="number"
              min={0}
              max={200}
              value={draft.commute.oneWayKm}
              onChange={(e) =>
                set("commute", {
                  oneWayKm: Math.min(200, Math.max(0, Number(e.target.value) || 0)),
                })
              }
            />
          </Field>
          <Field label="Commute days per week" id={id.days}>
            <Input
              id={id.days}
              type="number"
              min={0}
              max={7}
              value={draft.commute.daysPerWeek}
              onChange={(e) => set("commute", { daysPerWeek: int(e.target.value, 7) })}
            />
          </Field>
          <Check
            label="We exercise outdoors"
            checked={draft.lifestyle.exercisesOutdoors}
            onChange={(v) => set("lifestyle", { exercisesOutdoors: v })}
          />
          <Field label="Usual exercise time" id={id.time}>
            <select
              id={id.time}
              className={selectClass}
              value={draft.lifestyle.exerciseTime}
              onChange={(e) =>
                set("lifestyle", {
                  exerciseTime: e.target.value as Profile["lifestyle"]["exerciseTime"],
                })
              }
            >
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="anytime">Any time</option>
            </select>
          </Field>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save profile</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              toast.success("Your saved data was deleted from this device.");
            }}
          >
            <Trash2 aria-hidden="true" /> Delete my data
          </Button>
          <p className="text-sm text-muted-foreground">
            Saved only in this browser. No account needed.
          </p>
        </div>
      </form>
    </>
  );
}
