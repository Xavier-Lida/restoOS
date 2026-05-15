import { bestDelimiter, normalizeHeader, splitDelimitedLine, type CsvDelimiter } from "@/lib/square/csv-line";
import { parseAmount } from "@/lib/square/sale-items-csv";

type ParsedCsvRow = {
  label: string;
  value: string;
};

export type ParsedSquareSummary = {
  periodStart: string | null;
  periodEnd: string | null;
  reportDay: string;
  grossSalesCad: number;
  netSalesCad: number;
  totalSalesCad: number;
  taxesCad: number;
  tipsCad: number;
  paymentsTotalCad: number;
  transactionsCount: number;
  metrics: Record<string, string>;
};

const amountLabels = {
  grossSalesCad: "Ventes brutes",
  netSalesCad: "Ventes nettes",
  totalSalesCad: "Total des ventes",
  taxesCad: "Taxes",
  tipsCad: "Pourboires",
  paymentsTotalCad: "Total des paiements encaissés",
} as const;

type SquareCsvFormat = "summary" | "itemized";

type HeaderRole =
  | "date"
  | "gross"
  | "discounts"
  | "net"
  | "tax"
  | "total"
  | "paymentId"
  | "transactionId";

const HEADER_ROLE_PATTERNS: Record<HeaderRole, readonly string[]> = {
  date: [
    "date",
    "fecha",
    "datum",
    "sale date",
    "transaction date",
    "order date",
    "purchase date",
    "utc date",
    "date de la transaction",
    "date de vente",
    "reporting date",
    "date de commande",
  ],
  gross: ["prix brut", "gross sales", "ventes brutes", "montant brut", "extended price"],
  discounts: ["reductions", "discounts", "discount", "rabais"],
  net: ["ventes nettes", "net sales", "net", "credit card net sales", "sales net"],
  tax: ["taxes", "tax", "taxe", "montant de la taxe"],
  total: ["ventes totales", "total sales", "total", "montant total", "grand total"],
  paymentId: ["id de paiement", "no de paiement", "payment id", "payment ids"],
  transactionId: ["no de transaction", "id de la transaction", "transaction id", "transaction ids"],
};

function parseCsvLine(line: string): ParsedCsvRow | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^"((?:""|[^"])*)","((?:""|[^"])*)"$/u.exec(trimmed);
  if (!match) {
    return null;
  }
  return {
    label: match[1].replaceAll('""', '"').trim(),
    value: match[2].replaceAll('""', '"').trim(),
  };
}

export function parseCadAmount(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }
  return parseAmount(raw);
}

function parseInteger(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }
  const digits = raw.replaceAll(/[^\d-]/gu, "");
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateRangeFromFilename(fileName: string): { start: string | null; end: string | null } {
  const normalizedName = fileName.normalize("NFD").replaceAll(/[\u0300-\u036f]/gu, "");
  const match = /(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})\.csv$/iu.exec(normalizedName);
  if (!match) {
    return { start: null, end: null };
  }
  return {
    start: match[1],
    end: match[2],
  };
}

function resolveReportDay(periodStart: string | null, periodEnd: string | null): string {
  if (periodEnd) {
    return periodEnd;
  }
  if (periodStart) {
    return periodStart;
  }
  return new Date().toISOString().slice(0, 10);
}

function headerColumnIndex(headers: string[], role: HeaderRole): number | null {
  const normalizedHeaders = headers.map(normalizeHeader);
  const patterns = HEADER_ROLE_PATTERNS[role];
  for (let i = 0; i < normalizedHeaders.length; i += 1) {
    const h = normalizedHeaders[i] ?? "";
    const skipTaxMetadata =
      role === "tax" && (h === "type de taxe" || h.startsWith("type de taxe") || h.includes("tax type"));
    if (skipTaxMetadata) {
      continue;
    }
    for (const p of patterns) {
      const prefixMatch = h.startsWith(`${p} (`) || h.startsWith(`${p},`);
      if (h === p || prefixMatch) {
        return i;
      }
    }
  }
  return null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value.trim());
}

function parseDateCellToIso(raw: string): string | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }
  if (isIsoDate(s)) {
    return s.trim();
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(s);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = slash[3] ?? "";
    if (a > 12) {
      return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    if (b > 12) {
      return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }
  const dashEu = /^(\d{1,2})-(\d{1,2})-(\d{4})$/u.exec(s);
  if (dashEu) {
    const a = Number(dashEu[1]);
    const b = Number(dashEu[2]);
    const y = dashEu[3] ?? "";
    if (a > 12) {
      return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    if (b > 12) {
      return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }
  return null;
}

type DayAccumulator = {
  grossSalesCad: number;
  netSalesCad: number;
  totalSalesCad: number;
  taxesCad: number;
  discountsCad: number;
  paymentIds: Set<string>;
  transactionIds: Set<string>;
  rowCount: number;
};

function emptyDayAccumulator(): DayAccumulator {
  return {
    grossSalesCad: 0,
    netSalesCad: 0,
    totalSalesCad: 0,
    taxesCad: 0,
    discountsCad: 0,
    paymentIds: new Set(),
    transactionIds: new Set(),
    rowCount: 0,
  };
}

type ItemizedHeaderMatch = {
  headerLineIndex: number;
  delimiter: CsvDelimiter;
  headers: string[];
};

function findItemizedHeaderMatch(lines: string[]): ItemizedHeaderMatch | null {
  const maxScan = Math.min(lines.length, 120);
  for (let i = 0; i < maxScan; i += 1) {
    const line = (lines[i] ?? "").trim().replace(/^\uFEFF/gu, "");
    if (!line) {
      continue;
    }
    const delimiter = bestDelimiter(line);
    const headers = splitDelimitedLine(line, delimiter);
    if (headers.length < 4) {
      continue;
    }
    const dateIdx = headerColumnIndex(headers, "date");
    const netIdx = headerColumnIndex(headers, "net");
    const grossIdx = headerColumnIndex(headers, "gross");
    const totalIdx = headerColumnIndex(headers, "total");
    if (dateIdx === null) {
      continue;
    }
    if (netIdx === null && grossIdx === null && totalIdx === null) {
      continue;
    }
    return { headerLineIndex: i, delimiter, headers };
  }
  return null;
}

function detectSquareCsvFormat(content: string): SquareCsvFormat | null {
  const lines = content.split(/\r?\n/gu);
  const itemizedHeader = findItemizedHeaderMatch(lines);
  if (itemizedHeader) {
    return "itemized";
  }

  const summaryProbe = lines
    .slice(0, 12)
    .map(parseCsvLine)
    .filter((row): row is ParsedCsvRow => Boolean(row));
  const summaryLike = summaryProbe.length >= 3;
  if (summaryLike) {
    return "summary";
  }

  return null;
}

function parseSummaryFormat(content: string, fileName: string): ParsedSquareSummary[] {
  const lines = content.split(/\r?\n/gu);
  const entries = lines
    .map(parseCsvLine)
    .filter((row): row is ParsedCsvRow => Boolean(row));

  const metrics = Object.fromEntries(entries.map((entry) => [entry.label, entry.value]));
  const dateRange = parseDateRangeFromFilename(fileName);
  const reportDay = resolveReportDay(dateRange.start, dateRange.end);

  return [
    {
      periodStart: dateRange.start,
      periodEnd: dateRange.end,
      reportDay,
      grossSalesCad: parseCadAmount(metrics[amountLabels.grossSalesCad]),
      netSalesCad: parseCadAmount(metrics[amountLabels.netSalesCad]),
      totalSalesCad: parseCadAmount(metrics[amountLabels.totalSalesCad]),
      taxesCad: parseCadAmount(metrics[amountLabels.taxesCad]),
      tipsCad: parseCadAmount(metrics[amountLabels.tipsCad]),
      paymentsTotalCad: parseCadAmount(metrics[amountLabels.paymentsTotalCad]),
      transactionsCount: parseInteger(metrics["Nombre total de ventes"]),
      metrics,
    },
  ];
}

function parseItemizedFormat(content: string, fileName: string): ParsedSquareSummary[] {
  const lines = content.split(/\r?\n/gu);
  const headerMatch = findItemizedHeaderMatch(lines);
  if (headerMatch === null) {
    throw new Error(
      "CSV article Square non reconnu: colonnes Date et montants (Ventes nettes / Prix brut / Ventes totales) introuvables.",
    );
  }
  const { headerLineIndex, delimiter, headers } = headerMatch;

  const dateIdx = headerColumnIndex(headers, "date");
  const grossIdx = headerColumnIndex(headers, "gross");
  const discountIdx = headerColumnIndex(headers, "discounts");
  const netIdx = headerColumnIndex(headers, "net");
  const taxIdx = headerColumnIndex(headers, "tax");
  const totalIdx = headerColumnIndex(headers, "total");
  const paymentIdx = headerColumnIndex(headers, "paymentId");
  const transactionIdx = headerColumnIndex(headers, "transactionId");

  const missingCore = dateIdx === null || (netIdx === null && grossIdx === null && totalIdx === null);
  if (missingCore) {
    throw new Error(
      "CSV article Square non reconnu: colonnes Date et montants (Ventes nettes / Prix brut / Ventes totales) introuvables.",
    );
  }

  const byDay = new Map<string, DayAccumulator>();

  for (const line of lines.slice(headerLineIndex + 1)) {
    if (!line.trim()) {
      continue;
    }
    const cols = splitDelimitedLine(line, delimiter);
    const dayRaw = dateIdx !== null ? cols[dateIdx] : "";
    const day = parseDateCellToIso(dayRaw);
    if (day === null) {
      continue;
    }

    const bucket = byDay.get(day) ?? emptyDayAccumulator();
    byDay.set(day, bucket);

    const grossRaw = grossIdx !== null ? cols[grossIdx] : "";
    const netRaw = netIdx !== null ? cols[netIdx] : "";
    const totalRaw = totalIdx !== null ? cols[totalIdx] : "";
    const taxRaw = taxIdx !== null ? cols[taxIdx] : "";
    const discountRaw = discountIdx !== null ? cols[discountIdx] : "";

    bucket.grossSalesCad += parseCadAmount(grossRaw);
    bucket.netSalesCad += parseCadAmount(netRaw);
    bucket.totalSalesCad += parseCadAmount(totalRaw);
    bucket.taxesCad += parseCadAmount(taxRaw);
    bucket.discountsCad += parseCadAmount(discountRaw);
    bucket.rowCount += 1;

    const paymentId = paymentIdx !== null ? (cols[paymentIdx]?.trim() ?? "") : "";
    const transactionId = transactionIdx !== null ? (cols[transactionIdx]?.trim() ?? "") : "";

    const recordFingerprint: Record<"payment" | "transaction", () => void> = {
      payment: () => {
        bucket.paymentIds.add(paymentId);
      },
      transaction: () => {
        bucket.transactionIds.add(transactionId);
      },
    };

    const fingerprintKey: keyof typeof recordFingerprint | null = paymentId
      ? "payment"
      : transactionId
        ? "transaction"
        : null;
    const runFingerprint = fingerprintKey ? recordFingerprint[fingerprintKey] : null;
    runFingerprint?.();
  }

  if (byDay.size === 0) {
    throw new Error(
      "Aucune ligne de vente valide: verifie la colonne Date (AAAA-MM-JJ, JJ/MM/AAAA, ou MM/JJ/AAAA selon l'export Square).",
    );
  }

  const sortedDays = [...byDay.keys()].sort();
  const periodStart = sortedDays[0] ?? null;
  const periodEnd = sortedDays[sortedDays.length - 1] ?? null;

  return sortedDays.map((day) => {
    const agg = byDay.get(day) ?? emptyDayAccumulator();
    const distinctPayments = agg.paymentIds.size;
    const distinctTx = agg.transactionIds.size;
    const transactionCountBySource: Record<"payments" | "transactions" | "rows", number> = {
      payments: distinctPayments,
      transactions: distinctTx,
      rows: agg.rowCount,
    };
    const transactionSource: keyof typeof transactionCountBySource =
      distinctPayments > 0 ? "payments" : distinctTx > 0 ? "transactions" : "rows";
    const transactionsCount = transactionCountBySource[transactionSource];

    const paymentsTotalCad = agg.totalSalesCad > 0 ? agg.totalSalesCad : agg.netSalesCad + agg.taxesCad;

    return {
      periodStart,
      periodEnd,
      reportDay: day,
      grossSalesCad: agg.grossSalesCad,
      netSalesCad: agg.netSalesCad,
      totalSalesCad: agg.totalSalesCad,
      taxesCad: agg.taxesCad,
      tipsCad: 0,
      paymentsTotalCad,
      transactionsCount,
      metrics: {
        import_format: "square_itemized",
        source_filename: fileName,
        aggregated_rows: String(agg.rowCount),
        discounts_cad: String(agg.discountsCad),
        parser_version: "3",
      },
    };
  });
}

export function parseSquareSalesCsv(content: string, fileName: string): ParsedSquareSummary[] {
  const bomStripped = content.replace(/^\uFEFF/gu, "");
  const format = detectSquareCsvFormat(bomStripped);
  if (format === null) {
    throw new Error(
      "CSV Square non reconnu. Utilise soit le recapitulatif des ventes (deux colonnes label/valeur), soit l'export detaille des articles (colonnes Date, Ventes nettes, etc.).",
    );
  }
  const parseByFormat: Record<SquareCsvFormat, () => ParsedSquareSummary[]> = {
    summary: () => parseSummaryFormat(bomStripped, fileName),
    itemized: () => parseItemizedFormat(bomStripped, fileName),
  };
  return parseByFormat[format]();
}
