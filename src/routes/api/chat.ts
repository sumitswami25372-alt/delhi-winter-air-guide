import { createFileRoute } from "@tanstack/react-router";
import {
  buildInstructions,
  chatRequestSchema,
  createRateLimiter,
  isSameOriginRequest,
  type ChatStreamLine,
} from "@/lib/domain/chat";

const allow = createRateLimiter(20, 5 * 60 * 1000);
const MAX_BODY_BYTES = 64 * 1024;

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request.headers)) return json(403, "Forbidden");

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "anonymous";
        if (!allow(ip))
          return json(429, "Too many questions in a short time. Please wait a few minutes.");

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return json(413, "Request too large");
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json(400, "Invalid JSON");
        }
        const parsed = chatRequestSchema.safeParse(body);
        if (!parsed.success) return json(400, "Invalid request");

        const { streamResponse, GatewayError, PaymentRequiredError, RateLimitError } =
          await import("@lovable.dev/ai-gateway");
        const { messages, profile, air } = parsed.data;

        const encoder = new TextEncoder();
        const send = (
          controller: ReadableStreamDefaultController<Uint8Array>,
          line: ChatStreamLine,
        ) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));

        const friendly = (err: unknown) => {
          if (err instanceof RateLimitError)
            return "The assistant is busy. Please try again in a minute.";
          if (err instanceof PaymentRequiredError)
            return "The assistant is temporarily unavailable (usage limit reached).";
          if (err instanceof GatewayError)
            return "The assistant could not answer right now. Please try again.";
          return "Something went wrong while answering.";
        };

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              const events = await streamResponse(
                {
                  model: "openai/gpt-6-astra",
                  instructions: buildInstructions(profile, air),
                  input: messages.map((m) => ({ role: m.role, content: m.content })),
                  max_output_tokens: 1200,
                },
                { signal: request.signal },
              );
              for await (const event of events) {
                if (event.type === "response.output_text.delta") {
                  send(controller, { t: "delta", v: event.delta });
                }
              }
              send(controller, { t: "done" });
            } catch (err) {
              console.error("chat stream failed", err);
              send(controller, { t: "error", message: friendly(err) });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
