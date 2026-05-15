import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicApiKey, getAnthropicModel } from "@/lib/admin/anthropic-env";

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
