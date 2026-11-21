import type { ChatRequest, ChatStreamLine } from "./domain/chat";

/** Parse NDJSON lines from a buffer; returns parsed lines and the unfinished remainder. */
export function parseNdjson(buffer: string): { lines: ChatStreamLine[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  const lines: ChatStreamLine[] = [];
  for (const part of parts) {
    if (!part.trim()) continue;
    try {
      lines.push(JSON.parse(part) as ChatStreamLine);
    } catch {
      /* skip malformed line */
    }
  }
  return { lines, rest };
}

export async function streamChat(
  body: ChatRequest,
  onDelta: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = "The assistant could not answer right now.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { lines, rest } = parseNdjson(buffer);
    buffer = rest;
    for (const line of lines) {
      if (line.t === "delta") onDelta(line.v);
      else if (line.t === "error") throw new Error(line.message);
    }
  }
}
