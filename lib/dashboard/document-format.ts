export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} o`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} Ko`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatDisplayDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-CA", { dateStyle: "medium" });
}

export function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });
}

export function formatAmountCad(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "—";
  }
  return `${amount.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf" || mime.endsWith("/pdf");
}
