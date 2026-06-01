import "server-only";

import { isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import { extractPlainTextFromPdfBuffer } from "@/lib/onboarding/menu-pdf";
import { extractMenuItemsWithLlm } from "@/lib/admin/scrape-llm";
import { type MinimalScrapeItem, type ScrapeExtractionMeta } from "@/lib/admin/scrape-types";

export type { MinimalScrapeItem, ScrapeExtractionMeta } from "@/lib/admin/scrape-types";

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

function isPdfUrl(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase();
  return path.endsWith(".pdf") || path.includes(".pdf?");
}

function bufferStartsWithPdfMagic(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) {
    return false;
  }
  const head = new Uint8Array(buffer.slice(0, 4));
  return head.every((byte, index) => byte === PDF_MAGIC[index]);
}

function isPdfResponse(contentType: string, url: string, buffer: ArrayBuffer): boolean {
  if (contentType.toLowerCase().includes("application/pdf")) {
    return true;
  }
  if (isPdfUrl(url)) {
    return true;
  }
  return bufferStartsWithPdfMagic(buffer);
}

function htmlToPlainText(html: string): string {
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  return withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeExtractedLine(line: string): string {
  return line.replace(/\t+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function extractItemsFromPlainText(text: string): MinimalScrapeItem[] {
  const lines = text
    .split(/\n+/)
    .map((line) => normalizeExtractedLine(line))
    .filter((line) => line.length > 0);

  const items: MinimalScrapeItem[] = [];
  let currentCategory = "Autres";
  const maxItems = 250;

  for (const line of lines) {
    if (items.length >= maxItems) {
      break;
    }
    if (line.length < 2 || line.length > 220) {
      continue;
    }

    const looksLikeHeading =
      /^[A-ZÀ-Ÿ0-9][A-ZÀ-Ÿ0-9\s'’\-]{2,45}$/.test(line) &&
      !/\d/.test(line) &&
      line.split(/\s+/).length <= 6;
    if (looksLikeHeading) {
      currentCategory = line;
      continue;
    }

    const dollarMatch = line.match(
      /(\d+[.,]\d{2})\s*\$|\$\s*(\d+[.,]\d{2})|(\d+[.,]\d{2})\s*CAD/i,
    );

    let price: number | null = null;
    let nameFromLine: string | null = null;

    if (dollarMatch) {
      const rawPrice = dollarMatch[1] ?? dollarMatch[2] ?? dollarMatch[3];
      const parsed = Number.parseFloat(rawPrice.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 500) {
        continue;
      }
      price = parsed;
      const priceToken = dollarMatch[0];
      nameFromLine = line
        .replace(priceToken, "")
        .replace(/^[\s\-–—·•]+|[\s\-–—·•]+$/g, "")
        .trim();
    } else {
      const tailMatch = line.match(/^(.{2,180}?)\s+(\d+[.,]\d{2})\s*$/);
      if (tailMatch) {
        const parsed = Number.parseFloat(tailMatch[2].replace(",", "."));
        const nameCandidate = tailMatch[1].replace(/[.\s·•]+$/g, "").trim();
        const hasLetter = /[A-Za-zÀ-ÿ]/.test(nameCandidate);
        const looksLikeTimeOrHours =
          /\d{1,2}\s*h\s*\d{2}/i.test(line) || /\d{1,2}:\d{2}/.test(line);
        if (
          !Number.isNaN(parsed) &&
          parsed >= 1 &&
          parsed <= 500 &&
          hasLetter &&
          !looksLikeTimeOrHours &&
          nameCandidate.length >= 2
        ) {
          price = parsed;
          nameFromLine = nameCandidate;
        }
      }
    }

    if (price == null || !nameFromLine || nameFromLine.length < 2) {
      continue;
    }

    items.push({ name: nameFromLine, category: currentCategory, price });
  }

  return items;
}

async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  return extractPlainTextFromPdfBuffer(buffer, { maxPages: 15 });
}

function buildPreviewWithMeta(text: string, meta: ScrapeExtractionMeta): string {
  let head: string;
  if (meta.method === "llm" || meta.method === "llm+fallback") {
    const warnSnippet =
      meta.warnings && meta.warnings.length > 0
        ? ` warnings=${JSON.stringify(meta.warnings.slice(0, 8))}`
        : "";
    head = `[Extraction ${meta.method}] modele=${meta.model ?? "?"} confidence=${
      meta.confidence != null ? meta.confidence.toFixed(2) : "?"
    }${warnSnippet}\n\n`;
  } else {
    head = "[Extraction heuristique uniquement - pas de ANTHROPIC_API_KEY]\n\n";
  }
  return head + text.slice(0, 6000);
}

async function extractItemsSmart(fullText: string): Promise<{
  items: MinimalScrapeItem[];
  marketItems: Awaited<ReturnType<typeof extractMenuItemsWithLlm>>["marketItems"];
  restaurantMeta: Awaited<ReturnType<typeof extractMenuItemsWithLlm>>["restaurant"];
  meta: ScrapeExtractionMeta;
}> {
  if (isAnthropicConfigured()) {
    const llm = await extractMenuItemsWithLlm(fullText);
    let items = llm.items;
    let marketItems = llm.marketItems;
    let meta: ScrapeExtractionMeta = {
      method: "llm",
      model: llm.model,
      confidence: llm.confidence,
      warnings: llm.warnings,
    };
    if (items.length === 0) {
      const fallback = extractItemsFromPlainText(fullText);
      if (fallback.length > 0) {
        items = fallback;
        meta = {
          ...meta,
          method: "llm+fallback",
          warnings: [...(meta.warnings ?? []), "0 item LLM: repli heuristique applique."],
        };
      }
    }
    return { items, marketItems, restaurantMeta: llm.restaurant, meta };
  }

  return {
    items: extractItemsFromPlainText(fullText),
    marketItems: [],
    restaurantMeta: undefined,
    meta: { method: "heuristic" },
  };
}

export async function runMinimalHtmlScrape(url: string): Promise<{
  preview: string;
  items: MinimalScrapeItem[];
  marketItems: Awaited<ReturnType<typeof extractMenuItemsWithLlm>>["marketItems"];
  restaurantMeta: Awaited<ReturnType<typeof extractMenuItemsWithLlm>>["restaurant"];
  meta: ScrapeExtractionMeta;
}> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must be http or https.");
  }

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "RestoOsAdminBot/0.1 (+https://restoos.ca; contact: admin)",
      "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_PDF_BYTES) {
    throw new Error(`Fichier trop volumineux (max ${MAX_PDF_BYTES / (1024 * 1024)} Mo).`);
  }

  if (isPdfResponse(contentType, url, arrayBuffer)) {
    let pdfText: string;
    try {
      pdfText = await extractTextFromPdfBuffer(arrayBuffer);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur PDF inconnue";
      throw new Error(`Lecture PDF impossible: ${message}`);
    }

    const normalized = pdfText.replace(/\r\n/g, "\n").trim();
    if (normalized.length < 40) {
      const meta: ScrapeExtractionMeta = isAnthropicConfigured()
        ? { method: "llm", warnings: ["PDF: texte trop court pour LLM"] }
        : { method: "heuristic" };
      return {
        preview:
          "[PDF] Texte extrait tres court ou vide. Le fichier est peut-etre scanne (image) : il faudra OCR ou vision plus tard.",
        items: [],
        marketItems: [],
        restaurantMeta: undefined,
        meta,
      };
    }

    const { items, marketItems, restaurantMeta, meta } = await extractItemsSmart(normalized);
    const preview = buildPreviewWithMeta(normalized, meta);
    return { preview, items, marketItems, restaurantMeta, meta };
  }

  const html = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  const text = htmlToPlainText(html);
  const { items, marketItems, restaurantMeta, meta } = await extractItemsSmart(text);
  const preview = buildPreviewWithMeta(text, meta);

  return { preview, items, marketItems, restaurantMeta, meta };
}
