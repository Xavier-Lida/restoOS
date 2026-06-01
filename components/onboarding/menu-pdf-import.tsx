"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2Icon,
  SearchXIcon,
  UploadCloudIcon,
  FileTextIcon,
  LinkIcon,
  CheckIcon,
  CircleIcon,
  AlertTriangleIcon,
} from "lucide-react";

import { addMenuItemAction } from "@/app/onboarding/actions";
import { MenuItemRow } from "@/components/onboarding/menu-item-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  ONBOARDING_MENU_PDF_BUCKET,
  ONBOARDING_MENU_PDF_MAX_BYTES,
} from "@/lib/onboarding/menu-import-constants";
import { onboardingMenuPdfStorageUploadMessage } from "@/lib/onboarding/menu-pdf-storage-errors";
import { type MenuItemRecord } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

type MenuPdfImportProps = {
  menuItems: MenuItemRecord[];
  showOnboardingNav?: boolean;
};

type ImportResponse = {
  itemCount?: number;
  warnings?: string[];
  confidence?: number;
  model?: string;
  error?: string;
};

type ImportStepId = "upload" | "analyze" | "save";

type ImportStepDef = {
  id: ImportStepId;
  label: string;
  hint: string;
};

const FILE_STEPS: ImportStepDef[] = [
  { id: "upload", label: "Envoi du fichier", hint: "Transfert vers nos serveurs" },
  { id: "analyze", label: "Analyse par IA", hint: "Lecture du PDF et détection des plats et prix — 15 à 30 sec" },
  { id: "save", label: "Enregistrement", hint: "Mise à jour de votre menu" },
];

const URL_STEPS: ImportStepDef[] = [
  { id: "upload", label: "Téléchargement", hint: "Récupération du PDF depuis le lien" },
  { id: "analyze", label: "Analyse par IA", hint: "Lecture du PDF et détection des plats et prix — 15 à 30 sec" },
  { id: "save", label: "Enregistrement", hint: "Mise à jour de votre menu" },
];

const TOTAL_ESTIMATED_SEC = 35;

async function postImport(body: { kind: "url"; url: string } | { kind: "storage"; path: string }) {
  const res = await fetch("/api/onboarding/menu-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as ImportResponse;
  return { ok: res.ok, status: res.status, data };
}

function ImportProgress({
  steps,
  activeIdx,
  fakeProgress,
  elapsedSec,
}: {
  steps: ImportStepDef[];
  activeIdx: number;
  fakeProgress: number;
  elapsedSec: number;
}) {
  const remaining = Math.max(0, TOTAL_ESTIMATED_SEC - elapsedSec);

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm animate-in fade-in duration-300">
      {/* Steps */}
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={step.id} className="flex items-start gap-3">
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
              <div className="flex flex-col gap-0.5">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isDone
                      ? "text-muted-foreground line-through"
                      : isActive
                      ? "text-foreground"
                      : "text-muted-foreground/50",
                  )}
                >
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${fakeProgress}%` }}
          />
        </div>
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {fakeProgress < 100
            ? remaining > 0
              ? `~${remaining}s restantes`
              : "Finalisation…"
            : "Terminé"}
        </p>
      </div>

      {/* Warning */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        <AlertTriangleIcon className="size-3.5 shrink-0" />
        <span>Ne fermez pas et ne naviguez pas pendant l'import.</span>
      </div>
    </div>
  );
}

export function MenuPdfImport({ menuItems, showOnboardingNav = false }: MenuPdfImportProps) {
  const router = useRouter();
  const fileId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addPending, startAddTransition] = useTransition();
  const [pdfUrl, setPdfUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showUrlSection, setShowUrlSection] = useState(false);

  // Progress state
  const [importSteps, setImportSteps] = useState<ImportStepDef[]>(FILE_STEPS);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function startProgressTracking(steps: ImportStepDef[]) {
    setImportSteps(steps);
    setActiveStepIdx(0);
    setFakeProgress(0);
    setElapsedSec(0);
    startTimeRef.current = Date.now();

    // Tick every second: update elapsed + fake progress (0→85% over 35s)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      setElapsedSec(elapsed);
      const target = Math.min(85, (elapsed / TOTAL_ESTIMATED_SEC) * 85);
      setFakeProgress(target);
    }, 1000);
  }

  function advanceToStep(idx: number) {
    const t = setTimeout(() => setActiveStepIdx(idx), 0);
    stepTimeoutsRef.current.push(t);
  }

  function scheduleStepAfterMs(idx: number, ms: number) {
    const t = setTimeout(() => setActiveStepIdx(idx), ms);
    stepTimeoutsRef.current.push(t);
  }

  function finishProgress() {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    stepTimeoutsRef.current.forEach(clearTimeout);
    stepTimeoutsRef.current = [];
    setActiveStepIdx(FILE_STEPS.length); // all done
    setFakeProgress(100);
  }

  function resetProgress() {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    stepTimeoutsRef.current.forEach(clearTimeout);
    stepTimeoutsRef.current = [];
    setFakeProgress(0);
    setElapsedSec(0);
    setActiveStepIdx(0);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      stepTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const categories = [...new Set(menuItems.map((item) => item.category.trim() || "Sans categorie"))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const minPriceValue = minPrice.trim() ? Number(minPrice.replace(",", ".")) : null;
  const maxPriceValue = maxPrice.trim() ? Number(maxPrice.replace(",", ".")) : null;
  const hasValidMinPrice = minPriceValue != null && Number.isFinite(minPriceValue);
  const hasValidMaxPrice = maxPriceValue != null && Number.isFinite(maxPriceValue);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const normalizedIngredient = ingredientQuery.trim().toLocaleLowerCase();

  const filteredItems = menuItems.filter((item) => {
    const category = item.category.trim() || "Sans categorie";
    const normalizedName = item.item_name.toLocaleLowerCase();
    const normalizedNotes = (item.notes ?? "").toLocaleLowerCase();
    return (
      (normalizedSearch.length === 0 ||
        normalizedName.includes(normalizedSearch) ||
        normalizedNotes.includes(normalizedSearch)) &&
      (normalizedIngredient.length === 0 || normalizedNotes.includes(normalizedIngredient)) &&
      (selectedCategory === "all" || category === selectedCategory) &&
      (!hasValidMinPrice || Number(item.price_cad) >= minPriceValue) &&
      (!hasValidMaxPrice || Number(item.price_cad) <= maxPriceValue)
    );
  });

  const groupedItems = filteredItems.reduce<Map<string, MenuItemRecord[]>>((acc, item) => {
    const category = item.category.trim() || "Sans categorie";
    const existing = acc.get(category);
    if (existing) { existing.push(item); return acc; }
    acc.set(category, [item]);
    return acc;
  }, new Map());

  async function runAfterImport(result: ImportResponse) {
    finishProgress();
    setWarnings(result.warnings ?? []);
    if (result.itemCount != null) {
      const msg = `${result.itemCount} plat(s) importé(s). Vérifiez la liste ci-dessous.`;
      setMessage(msg);
      setMessageIsError(false);
    }
    await router.refresh();
  }

  async function handleUrlImport() {
    setMessage(null);
    setWarnings([]);
    setBusy(true);
    const trimmed = pdfUrl.trim();

    startProgressTracking(URL_STEPS);
    // Step 0 "Téléchargement" is active; after ~4s advance to "Analyse"
    scheduleStepAfterMs(1, 4000);
    // After ~25s advance to "Enregistrement"
    scheduleStepAfterMs(2, 25000);

    const { ok, data } = await postImport({ kind: "url", url: trimmed });
    setBusy(false);
    if (!ok) {
      resetProgress();
      const err = data.error ?? "Import impossible.";
      setMessage(err);
      setMessageIsError(true);
      toast.error(err);
      return;
    }
    await runAfterImport(data);
  }

  async function handleFileSelected(fileList: FileList | null) {
    setMessage(null);
    setWarnings([]);
    const file = fileList?.item(0);
    if (!file || file.size === 0) return;

    if (file.type !== "application/pdf") {
      const err = "Veuillez choisir un fichier PDF.";
      setMessage(err);
      setMessageIsError(true);
      toast.error(err);
      return;
    }
    if (file.size > ONBOARDING_MENU_PDF_MAX_BYTES) {
      const err = "Le fichier dépasse la taille maximale (10 Mo).";
      setMessage(err);
      setMessageIsError(true);
      toast.error(err);
      return;
    }

    setSelectedFileName(file.name);
    setBusy(true);
    startProgressTracking(FILE_STEPS); // step 0 = upload

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      resetProgress();
      const err = "Session expirée. Reconnectez-vous.";
      setMessage(err);
      setMessageIsError(true);
      toast.error(err);
      return;
    }

    const path = `${user.id}/${crypto.randomUUID()}.pdf`;
    const { error: upError } = await supabase.storage
      .from(ONBOARDING_MENU_PDF_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: false });

    if (upError) {
      setBusy(false);
      resetProgress();
      const userMsg = onboardingMenuPdfStorageUploadMessage(upError.message);
      setMessage(userMsg);
      setMessageIsError(true);
      toast.error(userMsg);
      return;
    }

    // Upload done → advance to "Analyse"
    advanceToStep(1);
    // After ~25s into analysis, advance to "Enregistrement"
    scheduleStepAfterMs(2, 25000);

    const { ok, data } = await postImport({ kind: "storage", path });
    setBusy(false);
    if (!ok) {
      resetProgress();
      const err = data.error ?? "Import impossible.";
      setMessage(err);
      setMessageIsError(true);
      toast.error(err);
      return;
    }
    await runAfterImport(data);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    void handleFileSelected(e.dataTransfer.files);
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        {busy ? (
          <ImportProgress
            steps={importSteps}
            activeIdx={activeStepIdx}
            fakeProgress={fakeProgress}
            elapsedSec={elapsedSec}
          />
        ) : (
          <>
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Zone de dépôt pour votre PDF de menu"
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              className={cn(
                "group flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isDragOver
                  ? "border-primary bg-primary/8 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
              )}
            >
              <input
                ref={fileInputRef}
                id={fileId}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => {
                  void handleFileSelected(e.target.files);
                  e.target.value = "";
                }}
              />

              {selectedFileName ? (
                <>
                  <FileTextIcon className="size-10 text-primary" />
                  <p className="text-sm font-medium">{selectedFileName}</p>
                  <p className="text-xs text-muted-foreground">Cliquez pour changer de fichier</p>
                </>
              ) : (
                <>
                  <UploadCloudIcon
                    className={cn(
                      "size-10 transition-colors duration-200",
                      isDragOver ? "text-primary" : "text-muted-foreground group-hover:text-primary/70",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {isDragOver ? "Relâchez pour importer" : "Glissez votre menu PDF ici"}
                    </p>
                    <p className="text-xs text-muted-foreground">ou cliquez pour parcourir — max 10 Mo</p>
                  </div>
                </>
              )}
            </div>

            {/* URL section */}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setShowUrlSection((v) => !v)}
                className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LinkIcon className="size-3.5" />
                {showUrlSection ? "Masquer le lien HTTPS" : "Importer depuis un lien HTTPS"}
              </button>
              {showUrlSection ? (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    id="menu-pdf-url"
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-11 rounded-md border bg-background px-3 text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!pdfUrl.trim()}
                    onClick={() => void handleUrlImport()}
                  >
                    Importer depuis le lien
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Messages */}
        {!busy && message ? (
          <p className={cn("text-sm", messageIsError ? "text-destructive" : "text-foreground")}>{message}</p>
        ) : null}
        {!busy && warnings.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-400">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        ) : null}
      </section>

      {/* Menu items list */}
      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Plats ({filteredItems.length}/{menuItems.length})</h2>

        {menuItems.length > 0 ? (
          <div className="grid gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/20 p-4">
            <div className="grid gap-2">
              <label htmlFor="menu-search" className="text-sm font-medium">Recherche</label>
              <Input
                id="menu-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom du plat ou mot-clé"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="ingredient-filter" className="text-sm font-medium">Ingrédients (notes)</label>
                <Input
                  id="ingredient-filter"
                  value={ingredientQuery}
                  onChange={(e) => setIngredientQuery(e.target.value)}
                  placeholder="Ex: poulet, ail, sans gluten"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="category-filter" className="text-sm font-medium">Catégorie</label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="price-min" className="text-sm font-medium">Prix min (CAD)</label>
                <Input id="price-min" type="number" min="0" step="0.01" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="price-max" className="text-sm font-medium">Prix max (CAD)</label>
                <Input id="price-max" type="number" min="0" step="0.01" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="50.00" />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-fit text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => { setSearchQuery(""); setIngredientQuery(""); setSelectedCategory("all"); setMinPrice(""); setMaxPrice(""); }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : null}

        {filteredItems.length > 0 ? (
          <div className="grid gap-6">
            {[...groupedItems.entries()].map(([category, items]) => (
              <section key={category} className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                    {category}
                  </h3>
                  <p className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {items.length} item(s)
                  </p>
                </div>
                <ul className="grid gap-3">
                  {items.map((item) => <MenuItemRow key={item.id} item={item} />)}
                </ul>
              </section>
            ))}
          </div>
        ) : menuItems.length > 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/15 py-12 text-center">
            <SearchXIcon className="size-10 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Aucun plat ne correspond à vos filtres.
            </p>
          </div>
        ) : null}
      </section>

      <details className="rounded-md border p-4 text-sm">
        <summary className="cursor-pointer font-medium">Ajouter une ligne à la main</summary>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            startAddTransition(async () => {
              const fd = new FormData(form);
              const result = await addMenuItemAction(fd);
              if (!result.ok) { toast.error(result.message); return; }
              if (result.message) toast.success(result.message);
              form.reset();
              await router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual_item_name">Nom du plat</Label>
            <Input id="manual_item_name" name="item_name" required placeholder="Burger maison" disabled={addPending} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual_category">Catégorie</Label>
            <Input id="manual_category" name="category" required placeholder="Plats principaux" disabled={addPending} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual_price">Prix (CAD)</Label>
            <Input id="manual_price" name="price_cad" type="number" min="0" step="0.01" required placeholder="19,90" disabled={addPending} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="manual_notes">Notes (optionnel)</Label>
            <Textarea id="manual_notes" name="notes" rows={2} placeholder="Portion généreuse" disabled={addPending} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" size="sm" disabled={addPending}>
              {addPending ? (
                <><Loader2Icon className="animate-spin" data-icon="inline-start" />Ajout…</>
              ) : "Ajouter la ligne"}
            </Button>
          </div>
        </form>
      </details>

      {showOnboardingNav ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild variant="outline" disabled={busy}>
            <Link href="/onboarding/profile">Retour</Link>
          </Button>
          {menuItems.length > 0 ? (
            <Button asChild disabled={busy}>
              <Link href="/onboarding/review">Continuer</Link>
            </Button>
          ) : (
            <Button type="button" disabled>Continuer après import</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
