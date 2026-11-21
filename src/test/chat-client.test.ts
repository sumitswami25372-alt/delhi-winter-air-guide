import { describe, expect, it } from "vitest";
import { parseNdjson } from "@/lib/chat-client";

// ---------------------------------------------------------------------------
// parseNdjson
// ---------------------------------------------------------------------------
describe("parseNdjson", () => {
  it("parses a single complete line", () => {
    const { lines, rest } = parseNdjson(`{"t":"delta","v":"Hello"}\n`);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({ t: "delta", v: "Hello" });
    expect(rest).toBe("");
  });

  it("returns partial last line as rest", () => {
    const { lines, rest } = parseNdjson(`{"t":"delta","v":"Hello"}\n{"t":"del`);
    expect(lines).toHaveLength(1);
    expect(rest).toBe(`{"t":"del`);
  });

  it("parses multiple complete lines", () => {
    const input = [
      `{"t":"delta","v":"Hello"}`,
      `{"t":"delta","v":" world"}`,
      `{"t":"done"}`,
      "",
    ].join("\n");
    const { lines } = parseNdjson(input);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ t: "delta", v: "Hello" });
    expect(lines[2]).toEqual({ t: "done" });
  });

  it("skips empty/whitespace-only lines", () => {
    const { lines } = parseNdjson(`\n\n{"t":"done"}\n`);
    expect(lines).toHaveLength(1);
  });

  it("skips malformed JSON without throwing", () => {
    const { lines } = parseNdjson(`not-json\n{"t":"done"}\n`);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({ t: "done" });
  });

  it("returns empty lines and empty rest for empty input", () => {
    const { lines, rest } = parseNdjson("");
    expect(lines).toHaveLength(0);
    expect(rest).toBe("");
  });

  it("handles delta with empty string value", () => {
    const { lines } = parseNdjson(`{"t":"delta","v":""}\n`);
    expect(lines[0]).toEqual({ t: "delta", v: "" });
  });

  it("handles error line type", () => {
    const { lines } = parseNdjson(`{"t":"error","message":"Rate limit exceeded"}\n`);
    expect(lines[0]).toEqual({ t: "error", message: "Rate limit exceeded" });
  });
});
