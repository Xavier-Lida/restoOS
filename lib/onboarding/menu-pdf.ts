import "server-only";

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

type PdfParseNode = {
  PDFParse: typeof import("pdf-parse").PDFParse;
  CanvasFactory: typeof import("pdf-parse/worker").CanvasFactory;
};

let pdfParseNode: Promise<PdfParseNode> | undefined;

async function loadPdfParseNode(): Promise<PdfParseNode> {
  if (!pdfParseNode) {
    pdfParseNode = (async () => {
      const [{ CanvasFactory }, { PDFParse }] = await Promise.all([
        import("pdf-parse/worker"),
        import("pdf-parse"),
      ]);
      return { PDFParse, CanvasFactory };
    })();
  }
  return pdfParseNode;
}

function assertPdfBuffer(buffer: Uint8Array): void {
  if (buffer.byteLength < 4 || !buffer.subarray(0, 4).every((b, i) => b === PDF_MAGIC[i])) {
    throw new Error("Le fichier n’est pas un PDF valide.");
  }
}

export type ExtractPlainTextFromPdfOptions = {
  /** Limite le nombre de pages lues (ex. scraping rapide). */
  maxPages?: number;
};

export async function extractPlainTextFromPdfBuffer(
  buffer: ArrayBuffer,
  options?: ExtractPlainTextFromPdfOptions,
): Promise<string> {
  const data = new Uint8Array(buffer);
  assertPdfBuffer(data);
  const { PDFParse, CanvasFactory } = await loadPdfParseNode();
  const parser = new PDFParse({ data, CanvasFactory });
  try {
    const result =
      options?.maxPages != null ? await parser.getText({ first: options.maxPages }) : await parser.getText();
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
