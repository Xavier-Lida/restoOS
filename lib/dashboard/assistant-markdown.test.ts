import { describe, expect, it } from "vitest";

import { parseAssistantMarkdown } from "@/lib/dashboard/assistant-markdown";

describe("parseAssistantMarkdown", () => {
  it("parses bold and italic segments", () => {
    const segments = parseAssistantMarkdown("Prix **12,50 $** pour *Burger*");
    expect(segments).toEqual([
      { type: "text", value: "Prix " },
      { type: "bold", value: "12,50 $" },
      { type: "text", value: " pour " },
      { type: "italic", value: "Burger" },
    ]);
  });

  it("handles newlines in plain text", () => {
    const segments = parseAssistantMarkdown("Ligne 1\nLigne 2");
    expect(segments.some((s) => s.type === "text" && s.value.includes("\n"))).toBe(true);
  });
});
