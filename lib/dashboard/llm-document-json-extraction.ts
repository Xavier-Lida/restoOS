import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { DocumentBlockParam, ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";

import { getAnthropicApiKey, getAnthropicModel } from "@/lib/admin/anthropic-env";
import { extractPlainTextFromPdfBuffer } from "@/lib/onboarding/menu-pdf";

const DEFAULT_MAX_TEXT_CHARS = 100_000;
const DEFAULT_MIN_PDF_TEXT_CHARS = 80;

async function collectTextFromMessage(message: Anthropic.Messages.Message): Promise<string> {
  const textParts = message.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""));
  const joined = textParts.join("\n").trim();
  if (!joined) {
    throw new Error("Réponse vide du modèle.");
  }
  return joined;
}

function toImageMediaType(mime: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (mime === "image/png") {
    return "image/png";
  }
  if (mime === "image/webp") {
    return "image/webp";
  }
  if (mime === "image/gif") {
    return "image/gif";
  }
  return "image/jpeg";
}

export type LlmDocumentJsonExtractionParams<T> = {
  buffer: ArrayBuffer;
  mimeType: string;
  systemPrompt: string;
  buildUserPromptFromText: (truncatedPlainText: string) => string;
  visionUserText: string;
  textRepairSuffix: string;
  visionRepairText: string;
  parse: (raw: string) => T;
  maxTextChars?: number;
  minPdfPlainTextChars?: number;
  maxTokens?: number;
};

/**
 * PDF (texte puis vision) ou image → JSON structuré via Anthropic, avec une passe de réparation.
 */
export async function runLlmDocumentJsonExtraction<T>(
  params: LlmDocumentJsonExtractionParams<T>,
): Promise<{ result: T; model: string }> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquant.");
  }

  const model = getAnthropicModel();
  const client = new Anthropic({ apiKey, timeout: 180_000 });
  const maxTextChars = params.maxTextChars ?? DEFAULT_MAX_TEXT_CHARS;
  const minChars = params.minPdfPlainTextChars ?? DEFAULT_MIN_PDF_TEXT_CHARS;
  const maxTokens = params.maxTokens ?? 16_384;

  const runTextPath = async (plainText: string): Promise<T> => {
    const truncated =
      plainText.length > maxTextChars
        ? `${plainText.slice(0, maxTextChars)}\n\n[... texte tronqué ...]`
        : plainText;
    const userContent = params.buildUserPromptFromText(truncated);
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: 0.1,
      system: params.systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    let raw = await collectTextFromMessage(message);
    try {
      return params.parse(raw);
    } catch {
      const repairMessage = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.05,
        system: params.systemPrompt,
        messages: [
          {
            role: "user",
            content: `${userContent}\n\n${params.textRepairSuffix}`,
          },
        ],
      });
      raw = await collectTextFromMessage(repairMessage);
      return params.parse(raw);
    }
  };

  const runVisionBlocks = async (blocks: Array<DocumentBlockParam | ImageBlockParam | TextBlockParam>): Promise<T> => {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: 0.1,
      system: params.systemPrompt,
      messages: [{ role: "user", content: blocks }],
    });
    let raw = await collectTextFromMessage(message);
    try {
      return params.parse(raw);
    } catch {
      const repairBlocks: Array<DocumentBlockParam | ImageBlockParam | TextBlockParam> = [
        ...blocks.slice(0, -1),
        { type: "text", text: params.visionRepairText },
      ];
      const repairMessage = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.05,
        system: params.systemPrompt,
        messages: [{ role: "user", content: repairBlocks }],
      });
      raw = await collectTextFromMessage(repairMessage);
      return params.parse(raw);
    }
  };

  if (params.mimeType === "application/pdf") {
    let plain = "";
    try {
      plain = await extractPlainTextFromPdfBuffer(params.buffer);
    } catch {
      plain = "";
    }
    if (plain.trim().length >= minChars) {
      const result = await runTextPath(plain);
      return { result, model };
    }
    const b64 = Buffer.from(params.buffer).toString("base64");
    const docBlock: DocumentBlockParam = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
    };
    const textBlock: TextBlockParam = { type: "text", text: params.visionUserText };
    const result = await runVisionBlocks([docBlock, textBlock]);
    return { result, model };
  }

  if (params.mimeType.startsWith("image/")) {
    const b64 = Buffer.from(params.buffer).toString("base64");
    const media = toImageMediaType(params.mimeType);
    const imgBlock: ImageBlockParam = {
      type: "image",
      source: { type: "base64", media_type: media, data: b64 },
    };
    const textBlock: TextBlockParam = { type: "text", text: params.visionUserText };
    const result = await runVisionBlocks([imgBlock, textBlock]);
    return { result, model };
  }

  throw new Error(`Type de fichier non pris en charge pour l'extraction: ${params.mimeType}`);
}
