import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, Square, User } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AqiBadge } from "@/components/app/aqi";
import { RichText } from "@/components/app/rich-text";
import { PageHeader } from "@/components/app/site-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAirQuality } from "@/hooks/use-air-quality";
import { findCleanestWindow } from "@/lib/domain/aqi";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES, type ChatRequest } from "@/lib/domain/chat";
import { formatHour } from "@/lib/domain/recommendations";
import { streamChat } from "@/lib/chat-client";
import { useProfile } from "@/lib/profile-store";
import { z } from "zod";

const searchSchema = z.object({ q: z.string().max(MAX_MESSAGE_CHARS).optional() });

export const Route = createFileRoute("/assistant")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "AI smog assistant — WinterShield AI" },
      {
        name: "description",
        content:
          "Ask an AI assistant for smog-day routines, indoor air fixes and greener alternatives tailored to your family.",
      },
      { property: "og:title", content: "AI smog assistant — WinterShield AI" },
      {
        property: "og:description",
        content: "Personalised answers on winter smog, indoor air and low-emission living.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Plan tomorrow for my family around the smog",
  "How do I build a DIY air purifier cheaply?",
  "Is it safe for my kids to play outside today?",
  "What's the greenest way to heat our home this winter?",
  "Draft a message to my building group about not burning leaves",
];

function AssistantPage() {
  const { profile } = useProfile();
  const air = useAirQuality(profile.location);
  const [messages, setMessages] = useState<Msg[]>([]);
  const { q } = Route.useSearch();
  const [input, setInput] = useState(q ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const hintId = useId();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const airContext = (): ChatRequest["air"] => {
    if (!air.data) return null;
    const w = findCleanestWindow(air.data.hourly.slice(0, 24), 2);
    return {
      aqi: air.data.current.aqi,
      pm25: air.data.current.pm25,
      pm10: air.data.current.pm10,
      no2: air.data.current.no2,
      cleanestWindow: w ? `${formatHour(w.start)}–${formatHour(w.end)} (${w.avgPm25} µg/m³)` : null,
      observedAt: air.data.current.time,
    };
  };

  const ask = async (text: string) => {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || busy) return;
    setError(null);
    const history = [...messages, { role: "user" as const, content: question }].slice(
      -MAX_MESSAGES,
    );
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        { messages: history, profile, air: airContext() },
        (delta) =>
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant")
              next[next.length - 1] = { ...last, content: last.content + delta };
            return next;
          }),
        controller.signal,
      );
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
      // Drop an empty assistant bubble but keep any partial answer.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
      setInput((current) => current || question);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(input);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Assistant"
        title="Ask WinterShield"
        lead="Answers use your household profile and live air readings, and explain the effect of each suggestion."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-label="Conversation" className="paper flex min-h-[28rem] flex-col">
          <div
            role="log"
            aria-live="polite"
            aria-busy={busy}
            aria-label="Assistant conversation"
            className="flex-1 space-y-4 overflow-y-auto p-5"
          >
            {messages.length === 0 ? (
              <div>
                <p className="text-muted-foreground">Try one of these, or ask your own question:</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-auto whitespace-normal py-1.5 text-left"
                        onClick={() => void ask(s)}
                      >
                        {s}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                        : "max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm text-foreground"
                    }
                  >
                    <p className="sr-only">
                      {m.role === "user" ? "You said:" : "WinterShield said:"}
                    </p>
                    <span
                      aria-hidden="true"
                      className="mb-1 flex items-center gap-1 text-[11px] opacity-70"
                    >
                      {m.role === "user" ? <User className="size-3" /> : <Bot className="size-3" />}
                      {m.role === "user" ? "You" : "WinterShield"}
                    </span>
                    {m.content ? (
                      <RichText text={m.content} />
                    ) : (
                      <p className="text-muted-foreground">Thinking…</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          {error ? (
            <p
              role="alert"
              className="mx-5 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="border-t border-border p-4">
            <Label htmlFor={inputId} className="sr-only">
              Your question
            </Label>
            <Textarea
              id={inputId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MAX_MESSAGE_CHARS}
              rows={2}
              placeholder="Ask about today's air, your home, your commute…"
              aria-describedby={hintId}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p id={hintId} className="text-xs text-muted-foreground">
                Enter to send, Shift+Enter for a new line. Not medical advice.
              </p>
              {busy ? (
                <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
                  <Square aria-hidden="true" /> Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim()}>
                  <Send aria-hidden="true" /> Send
                </Button>
              )}
            </div>
          </form>
        </section>
        <aside aria-labelledby="ctx-h" className="paper h-fit space-y-3 p-5 text-sm">
          <h2 id="ctx-h" className="font-semibold">
            What the assistant knows
          </h2>
          <p>
            <span className="text-muted-foreground">Place:</span> {profile.location.name}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Air now:</span>
            {air.data ? (
              <AqiBadge aqi={air.data.current.aqi} />
            ) : air.isError ? (
              "unavailable"
            ) : (
              "loading…"
            )}
          </p>
          <p>
            <span className="text-muted-foreground">Household:</span> {profile.household.adults}{" "}
            adults, {profile.household.children} children, {profile.household.seniors} seniors
          </p>
          <p className="text-xs text-muted-foreground">
            Your question and this summary are sent to the AI model to answer. Nothing is saved on
            our side — the conversation disappears when you leave this page.
          </p>
        </aside>
      </div>
    </>
  );
}
