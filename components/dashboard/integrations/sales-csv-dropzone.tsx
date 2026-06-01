"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
  CheckIcon,
  CircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  BarChart3Icon,
  RotateCcwIcon,
  InfoIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImportSummary, SseEvent } from "@/app/api/integrations/sales-csv/import/route";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function isCsvFile(file: File): boolean {
  if (file.name.toLowerCase().endsWith(".csv")) return true;
  const type = file.type.toLowerCase();
  return type === "text/csv" || type === "application/csv" || type === "application/vnd.ms-excel";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Live step definitions ────────────────────────────────────────────────────

type StepId = "parsing" | "checking" | "inserting_reports" | "inserting_lines";

const STEP_LABELS: Record<StepId, string> = {
  parsing: "Analyse du CSV",
  checking: "Vérification des doublons",
  inserting_reports: "Enregistrement des journées",
  inserting_lines: "Import des lignes de vente",
};

const STEP_HINTS: Record<StepId, string> = {
  parsing: "Lecture et structuration par IA — peut prendre 15–30 sec",
  checking: "Comparaison avec les données existantes",
  inserting_reports: "Upsert des totaux journaliers",
  inserting_lines: "Insertion par blocs de 500 lignes",
};

const STEP_ORDER: StepId[] = ["parsing", "checking", "inserting_reports", "inserting_lines"];

// ─── Import state ─────────────────────────────────────────────────────────────

type ImportState =
  | { status: "idle" }
  | {
      status: "importing";
      filename: string;
      activeStep: StepId | null;
      completedSteps: Set<StepId>;
      parsedRows: number | null;
      parsedDays: number | null;
      linesProcessed: number;
      linesTotal: number;
      warnings: string[];
    }
  | { status: "done"; summary: ImportSummary }
  | { status: "error"; message: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveStep({
  id,
  isActive,
  isDone,
  extra,
}: {
  id: StepId;
  isActive: boolean;
  isDone: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : isActive
            ? "border-primary"
            : "border-muted-foreground/30",
        )}
      >
        {isDone ? (
          <CheckIcon className="size-3" />
        ) : isActive ? (
          <Loader2Icon className="size-3 animate-spin text-primary" />
        ) : (
          <CircleIcon className="size-2.5 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p
          className={cn(
            "text-sm font-medium transition-colors duration-200",
            isDone ? "text-muted-foreground" : isActive ? "text-foreground" : "text-muted-foreground/50",
          )}
        >
          {STEP_LABELS[id]}
        </p>
        {isActive && (
          <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
            {STEP_HINTS[id]}
          </p>
        )}
        {extra}
      </div>
    </div>
  );
}

function ImportReport({ summary, onReset }: { summary: ImportSummary; onReset: () => void }) {
  const hasUnmatched = summary.unmatchedPosItems.length > 0;
  const hasWarnings = summary.warnings.length > 0;
  const hasSkipped = summary.linesSkipped > 0;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-start gap-3">
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold">Import terminé</p>
          <p className="text-sm text-muted-foreground">{summary.filename}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Lignes importées</p>
          <p className="text-xl font-semibold tabular-nums">{summary.linesInserted.toLocaleString("fr-CA")}</p>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Jours couverts</p>
          <p className="text-xl font-semibold tabular-nums">{summary.newDays + summary.updatedDays}</p>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-xl font-semibold tabular-nums">{summary.totalTransactions.toLocaleString("fr-CA")}</p>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Déjà existants</p>
          <p className={cn("text-xl font-semibold tabular-nums", summary.linesSkipped > 0 && "text-amber-600 dark:text-amber-400")}>
            {summary.linesSkipped.toLocaleString("fr-CA")}
          </p>
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <InfoIcon className="size-3.5 shrink-0" />
        <span>
          Période : {formatDate(summary.periodStart)} → {formatDate(summary.periodEnd)}
          {summary.updatedDays > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              ({summary.updatedDays} jour{summary.updatedDays > 1 ? "s" : ""} écrasé{summary.updatedDays > 1 ? "s" : ""})
            </span>
          )}
        </span>
      </div>

      {/* Unmatched POS items */}
      {hasUnmatched && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {summary.unmatchedPosItems.length} article{summary.unmatchedPosItems.length > 1 ? "s" : ""} de caisse sans correspondance sur le menu
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Ces articles sont bien importés, mais ne sont associés à aucun plat du menu. Vérifie les noms dans le menu si tu veux les inclure dans les suggestions.
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {summary.unmatchedPosItems.slice(0, 10).map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <span className="shrink-0">–</span>
                    {item}
                  </li>
                ))}
                {summary.unmatchedPosItems.length > 10 && (
                  <li className="text-xs text-amber-600 dark:text-amber-500">
                    … et {summary.unmatchedPosItems.length - 10} autre{summary.unmatchedPosItems.length - 10 > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Skipped duplicates detail */}
      {hasSkipped && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            {summary.linesSkipped} ligne{summary.linesSkipped > 1 ? "s" : ""} ignorée{summary.linesSkipped > 1 ? "s" : ""} — déjà présentes dans la base (import précédent ou doublon interne).
          </span>
        </div>
      )}

      {/* Parse warnings */}
      {hasWarnings && (
        <ul className="flex flex-col gap-1">
          {summary.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <span className="shrink-0">–</span>
              {w}
            </li>
          ))}
        </ul>
      )}

      {/* Method badge */}
      <p className="text-xs text-muted-foreground/60">
        Méthode de lecture : {summary.parseMethod === "llm" ? `IA${summary.model ? ` (${summary.model})` : ""}` : "heuristique"}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild size="sm">
          <Link href="/dashboard/stats">
            <BarChart3Icon data-icon="inline-start" />
            Voir les statistiques
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcwIcon data-icon="inline-start" />
          Importer un autre CSV
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SalesCsvDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  function selectFile(file: File) {
    if (!isCsvFile(file)) {
      toast.error("Format invalide. Choisis un fichier CSV (.csv).");
      return;
    }
    setSelectedFile(file);
    setImportState({ status: "idle" });
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
    event.target.value = "";
  }

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) { dragDepthRef.current = 0; setIsDragging(false); }
  }

  function handleDragOver(event: React.DragEvent) { event.preventDefault(); }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) selectFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile || importState.status === "importing") return;

    setImportState({
      status: "importing",
      filename: selectedFile.name,
      activeStep: null,
      completedSteps: new Set(),
      parsedRows: null,
      parsedDays: null,
      linesProcessed: 0,
      linesTotal: 0,
      warnings: [],
    });

    const formData = new FormData();
    formData.set("report", selectedFile);

    let response: Response;
    try {
      response = await fetch("/api/integrations/sales-csv/import", { method: "POST", body: formData });
    } catch {
      setImportState({ status: "error", message: "Impossible de joindre le serveur." });
      return;
    }

    if (!response.ok || !response.body) {
      setImportState({ status: "error", message: "Erreur serveur inattendue." });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function handleEvent(event: SseEvent) {
      setImportState((prev) => {
        if (prev.status !== "importing") return prev;

        if (event.phase === "error") {
          return { status: "error", message: event.message };
        }

        if (event.phase === "done") {
          return { status: "done", summary: event.summary };
        }

        const next = { ...prev, completedSteps: new Set(prev.completedSteps) };

        if (event.phase === "start") {
          next.activeStep = null;
          return next;
        }

        if (event.phase === "parsing") {
          next.activeStep = "parsing";
          return next;
        }

        if (event.phase === "parsed") {
          next.completedSteps.add("parsing");
          next.parsedRows = event.rows;
          next.parsedDays = event.days;
          next.warnings = event.warnings;
          return next;
        }

        if (event.phase === "checking") {
          next.activeStep = "checking";
          return next;
        }

        if (event.phase === "inserting_reports") {
          next.completedSteps.add("checking");
          next.activeStep = "inserting_reports";
          return next;
        }

        if (event.phase === "inserting_lines") {
          next.completedSteps.add("inserting_reports");
          next.activeStep = "inserting_lines";
          next.linesProcessed = event.processed;
          next.linesTotal = event.total;
          return next;
        }

        return next;
      });
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          try {
            handleEvent(JSON.parse(line.slice(6)) as SseEvent);
          } catch { /* malformed chunk */ }
        }
      }
    } catch {
      setImportState((prev) =>
        prev.status === "importing" ? { status: "error", message: "Connexion interrompue pendant l'import." } : prev,
      );
    }
  }

  const isImporting = importState.status === "importing";

  // ── Render ───────────────────────────────────────────────────────────────────

  if (importState.status === "done") {
    return (
      <ImportReport
        summary={importState.summary}
        onReset={() => { setSelectedFile(null); setImportState({ status: "idle" }); }}
      />
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        onChange={handleInputChange}
      />

      {/* Drop zone — hidden while importing */}
      {!isImporting && (
        <button
          type="button"
          disabled={isImporting}
          aria-label="Glisser un CSV ou cliquer pour parcourir les fichiers"
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isDragging && "border-primary bg-primary/5",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <UploadIcon />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {isDragging ? "Relâche pour sélectionner" : "Glisse ton CSV ici"}
            </span>
            <span className="text-sm text-muted-foreground">ou clique pour parcourir tes fichiers</span>
          </span>
        </button>
      )}

      {/* Selected file */}
      {selectedFile && !isImporting && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <FileSpreadsheetIcon className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
            Changer
          </Button>
        </div>
      )}

      {/* Live progress panel */}
      {isImporting && (
        <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col gap-3">
            {STEP_ORDER.map((stepId) => {
              const s = importState as Extract<ImportState, { status: "importing" }>;
              const isActive = s.activeStep === stepId;
              const isDone = s.completedSteps.has(stepId);

              let extra: React.ReactNode = null;
              if (stepId === "parsing" && isDone && s.parsedRows != null) {
                extra = (
                  <p className="text-xs text-muted-foreground">
                    {s.parsedRows.toLocaleString("fr-CA")} ligne{s.parsedRows > 1 ? "s" : ""} détectée{s.parsedRows > 1 ? "s" : ""}
                    {s.parsedDays != null ? ` sur ${s.parsedDays} jour${s.parsedDays > 1 ? "s" : ""}` : ""}
                  </p>
                );
              }
              if (stepId === "inserting_lines" && (isActive || isDone) && s.linesTotal > 0) {
                const pct = Math.round((s.linesProcessed / s.linesTotal) * 100);
                extra = (
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {s.linesProcessed.toLocaleString("fr-CA")} / {s.linesTotal.toLocaleString("fr-CA")} lignes
                    </p>
                  </div>
                );
              }

              return <LiveStep key={stepId} id={stepId} isActive={isActive} isDone={isDone} extra={extra} />;
            })}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangleIcon className="size-3.5 shrink-0" />
            <span>Ne fermez pas et ne naviguez pas pendant l'import.</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {importState.status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{importState.message}</span>
        </div>
      )}

      {/* Submit */}
      {(importState.status === "idle" || importState.status === "error") && (
        <div>
          <Button type="submit" disabled={!selectedFile || isImporting}>
            Importer le CSV
          </Button>
        </div>
      )}
    </form>
  );
}
