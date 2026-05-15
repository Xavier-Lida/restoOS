import "server-only";

import { PDFParse } from "pdf-parse";

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function assertPdfBuffer(buffer: Uint8Array): void {
  if (buffer.byteLength < 4 || !buffer.subarray(0, 4).every((b, i) => b === PDF_MAGIC[i])) {
    throw new Error("Le fichier n’est pas un PDF valide.");
  }
}

export async function extractPlainTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buffer);
  assertPdfBuffer(data);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    const text = (result.text ?? "").trim();
    if (!text) {
      throw new Error(
        "Aucun texte lisible dans ce PDF. S’il s’agit d’un scan d’images, utilisez un PDF avec du texte sélectionnable ou contactez le support.",
      );
    }
    return text;
  } finally {
    await parser.destroy();
  }
}
