export type CsvDelimiter = "," | ";" | "\t" | "|";

export function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .replace(/^\uFEFF/gu, "")
    .replaceAll(/[\u200B-\u200D\uFEFF]/gu, "")
    .replaceAll("\u00BA", "o")
    .replaceAll("\u00AA", "a")
    .normalize("NFD")
    .replaceAll(/\p{M}+/gu, "")
    .replaceAll(/\s+/gu, " ")
    .toLowerCase();
}

export function unquoteCsvField(raw: string): string {
  const t = raw.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replaceAll('""', '"').trim();
  }
  return t;
}

export function splitDelimitedLine(line: string, delimiter: CsvDelimiter): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i] ?? "";
    if (inQuotes) {
      if (c === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out.map(unquoteCsvField);
}

export function bestDelimiter(line: string): CsvDelimiter {
  const candidates: readonly CsvDelimiter[] = [",", ";", "\t", "|"];
  let best: CsvDelimiter = ",";
  let bestLen = 0;
  for (const d of candidates) {
    const len = splitDelimitedLine(line, d).length;
    if (len > bestLen) {
      bestLen = len;
      best = d;
    }
  }
  return best;
}
