import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";

import { getAnthropicApiKey, getAnthropicModel } from "@/lib/admin/anthropic-env";
import type { ChartCatalogEntry } from "@/lib/dashboard/assistant-chart-resolve";
import { resolveChartsFromCatalog } from "@/lib/dashboard/assistant-chart-resolve";
import {
  assistantTurnDoneSchema,
  finalizeTurnToolInputSchema,
  type AssistantTurnDone,
  type FinalizeTurnToolInput,
} from "@/lib/schemas/assistant-turn";

const FINALIZE_TURN_TOOL: Tool = {
  name: "finalize_turn",
  description:
    "Termine le tour : graphiques à afficher (IDs du catalogue), suggestions, questions de relance, ou refus.",
  input_schema: {
    type: "object",
    properties: {
      refused: { type: "boolean", description: "true si hors sujet ou données manquantes" },
      refusalKind: { type: "string", enum: ["off_topic", "missing_data"] },
      chartIds: { type: "array", items: { type: "string" }, description: "IDs du catalogue graphiques" },
      chartTitles: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Titres personnalisés par chartId",
      },
      suggestions: { type: "array", items: { type: "string" } },
      followUpQuestions: { type: "array", items: { type: "string" } },
    },
    required: [],
  },
};

export type AssistantStreamCallbacks = {
  onDelta: (text: string) => void;
};

export async function runAssistantReply(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée.");
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: getAnthropicModel(),
    max_tokens: 2048,
    system: params.system,
    messages: params.messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse modèle sans texte.");
  }

  return textBlock.text;
}

function parseFinalizeToolInput(raw: unknown): FinalizeTurnToolInput {
  const parsed = finalizeTurnToolInputSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return {
    chartIds: [],
    suggestions: [],
    followUpQuestions: [],
  };
}

function buildTurnDone(
  answerMarkdown: string,
  toolInput: FinalizeTurnToolInput,
  catalogMap: Map<string, ChartCatalogEntry>,
): AssistantTurnDone {
  const charts =
    toolInput.refused || !toolInput.chartIds?.length
      ? []
      : resolveChartsFromCatalog(toolInput.chartIds, catalogMap, toolInput.chartTitles);

  const payload = {
    refused: toolInput.refused,
    refusalKind: toolInput.refusalKind,
    answerMarkdown: answerMarkdown.trim(),
    charts,
    suggestions: (toolInput.suggestions ?? []).slice(0, 6),
    followUpQuestions: (toolInput.followUpQuestions ?? []).slice(0, 4),
  };

  return assistantTurnDoneSchema.parse(payload);
}

export async function runAssistantStream(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  catalogMap: Map<string, ChartCatalogEntry>;
  callbacks: AssistantStreamCallbacks;
}): Promise<AssistantTurnDone> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée.");
  }

  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: getAnthropicModel(),
    max_tokens: 2048,
    system: params.system,
    messages: params.messages,
    tools: [FINALIZE_TURN_TOOL],
    tool_choice: { type: "auto" },
  });

  let answerMarkdown = "";
  let finalizeInput: FinalizeTurnToolInput | null = null;

  stream.on("text", (text) => {
    answerMarkdown += text;
    params.callbacks.onDelta(text);
  });

  const finalMessage = await stream.finalMessage();

  for (const block of finalMessage.content) {
    if (block.type === "tool_use" && block.name === "finalize_turn") {
      finalizeInput = parseFinalizeToolInput(block.input);
      break;
    }
  }

  if (!finalizeInput) {
    finalizeInput = { chartIds: [], suggestions: [], followUpQuestions: [] };
  }

  if (!answerMarkdown.trim()) {
    const textBlock = finalMessage.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      answerMarkdown = textBlock.text;
    }
  }

  if (!answerMarkdown.trim()) {
    throw new Error("Réponse modèle sans texte.");
  }

  return buildTurnDone(answerMarkdown, finalizeInput, params.catalogMap);
}
