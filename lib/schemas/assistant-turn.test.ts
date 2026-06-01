import { describe, expect, it } from "vitest";

import { assistantTurnDoneSchema } from "@/lib/schemas/assistant-turn";

describe("assistantTurnDoneSchema", () => {
  it("accepts a valid done payload", () => {
    const result = assistantTurnDoneSchema.safeParse({
      answerMarkdown: "Ventes **1 200 $** pour *Poutine*.",
      charts: [],
      suggestions: ["Voir le menu"],
      followUpQuestions: ["Et sur 90 jours ?"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects too many follow-ups", () => {
    const result = assistantTurnDoneSchema.safeParse({
      answerMarkdown: "Ok",
      charts: [],
      suggestions: [],
      followUpQuestions: ["a", "b", "c", "d", "e"],
    });
    expect(result.success).toBe(false);
  });
});
