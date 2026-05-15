"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, SearchXIcon } from "lucide-react";

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

async function postImport(body: { kind: "url"; url: string } | { kind: "storage"; path: string }) {
  const res = await fetch("/api/onboarding/menu-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as ImportResponse;
  return { ok: res.ok, status: res.status, data };
}

export function MenuPdfImport({ menuItems, showOnboardingNav = false }: MenuPdfImportProps) {
  const router = useRouter();
  const fileId = useId();
  const [addPending, startAddTransition] = useTransition();
  const [pdfUrl, setPdfUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

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
    const matchesSearch =
      normalizedSearch.length === 0 ||
      normalizedName.includes(normalizedSearch) ||
      normalizedNotes.includes(normalizedSearch);
    const matchesIngredient = normalizedIngredient.length === 0 || normalizedNotes.includes(normalizedIngredient);
    const matchesCategory = selectedCategory === "all" || category === selectedCategory;
    const matchesMinPrice = !hasValidMinPrice || Number(item.price_cad) >= minPriceValue;
    const matchesMaxPrice = !hasValidMaxPrice || Number(item.price_cad) <= maxPriceValue;

    return matchesSearch && matchesIngredient && matchesCategory && matchesMinPrice && matchesMaxPrice;
  });

  const groupedItems = filteredItems.reduce<Map<string, MenuItemRecord[]>>((acc, item) => {
    const category = item.category.trim() || "Sans categorie";
    const existing = acc.get(category);
    if (existing) {
      existing.push(item);
      return acc;
    }
    acc.set(category, [item]);
    return acc;
  }, new Map());

  async function runAfterImport(result: ImportResponse) {
    setWarnings(result.warnings ?? []);
    if (result.itemCount != null) {
      const msg = `${result.itemCount} plat(s) importé(s). Vérifiez la liste ci-dessous.`;
      setMessage(msg);
      toast.success(msg);
    }
    await router.refresh();
  }

  async function handleUrlImport() {
    setMessage(null);
    setWarnings([]);
    setBusy(true);
    const trimmed = pdfUrl.trim();
    const { ok, data } = await postImport({ kind: "url", url: trimmed });
    setBusy(false);
    if (!ok) {
      const err = data.error ?? "Import impossible.";
      setMessage(err);
      toast.error(err);
      return;
    }
    await runAfterImport(data);
  }

  async function handleFileSelected(fileList: FileList | null) {
    setMessage(null);
    setWarnings([]);
    const file = fileList?.item(0);
    if (!file || file.size === 0) {
      return;
    }
    if (file.type !== "application/pdf") {
      const err = "Veuillez choisir un fichier PDF.";
      setMessage(err);
      toast.error(err);
      return;
    }
    if (file.size > ONBOARDING_MENU_PDF_MAX_BYTES) {
      const err = "Le fichier dépasse la taille maximale (10 Mo).";
      setMessage(err);
      toast.error(err);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      const err = "Session expirée. Reconnectez-vous.";
      setMessage(err);
      toast.error(err);
      return;
    }

    const path = `${user.id}/${crypto.randomUUID()}.pdf`;
    const { error: upError } = await supabase.storage
      .from(ONBOARDING_MENU_PDF_BUCKET)
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (upError) {
      setBusy(false);
      const userMsg = onboardingMenuPdfStorageUploadMessage(upError.message);
      setMessage(userMsg);
      toast.error(userMsg);
      return;
    }

    const { ok, data } = await postImport({ kind: "storage", path });
    setBusy(false);
    if (!ok) {
      const err = data.error ?? "Import impossible.";
      setMessage(err);
      toast.error(err);
      return;
    }
    await runAfterImport(data);
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Importez le menu au format PDF. Nous extrayons les plats et prix automatiquement ; vous pourrez
          ajuster la liste ensuite.
        </p>

        <div className="grid gap-3 rounded-lg border border-dashed p-4">
          <label htmlFor={fileId} className="text-sm font-medium">
            Fichier PDF
          </label>
          <input
            id={fileId}
            type="file"
            accept="application/pdf"
            disabled={busy}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5"
            onChange={(e) => {
              void handleFileSelected(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="menu-pdf-url" className="text-sm font-medium">
            Ou lien HTTPS vers un PDF
          </label>
          <input
            id="menu-pdf-url"
            type="url"
            value={pdfUrl}
            disabled={busy}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://…"
            className="h-11 rounded-md border bg-background px-3"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !pdfUrl.trim()}
            onClick={() => void handleUrlImport()}
          >
            Importer depuis le lien
          </Button>
        </div>

        {busy ? (
          <p className="text-sm text-muted-foreground">Analyse du menu en cours…</p>
        ) : null}
        {message ? <p className="text-sm text-foreground">{message}</p> : null}
        {warnings.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-400">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Plats ({filteredItems.length}/{menuItems.length})</h2>
        </div>

        <div className="grid gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/20 p-4">
          <div className="grid gap-2">
            <label htmlFor="menu-search" className="text-sm font-medium">
              Recherche
            </label>
            <Input
              id="menu-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nom du plat ou mot-clé"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="ingredient-filter" className="text-sm font-medium">
                Ingrédients (dans les notes)
              </label>
              <Input
                id="ingredient-filter"
                value={ingredientQuery}
                onChange={(event) => setIngredientQuery(event.target.value)}
                placeholder="Ex: poulet, ail, sans gluten"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="category-filter" className="text-sm font-medium">
                Catégorie
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="price-min" className="text-sm font-medium">
                Prix min (CAD)
              </label>
              <Input
                id="price-min"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="price-max" className="text-sm font-medium">
                Prix max (CAD)
              </label>
              <Input
                id="price-max"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="50.00"
              />
            </div>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              className="text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                setSearchQuery("");
                setIngredientQuery("");
                setSelectedCategory("all");
                setMinPrice("");
                setMaxPrice("");
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        </div>

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
                  {items.map((item) => (
                    <MenuItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/15 py-12 text-center">
            <SearchXIcon className="size-10 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Aucun plat ne correspond à vos filtres. Essayez d’élargir la recherche ou réinitialisez les filtres.
            </p>
          </div>
        )}
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
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              if (result.message) {
                toast.success(result.message);
              }
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
            <Input
              id="manual_category"
              name="category"
              required
              placeholder="Plats principaux"
              disabled={addPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual_price">Prix (CAD)</Label>
            <Input
              id="manual_price"
              name="price_cad"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="19,90"
              disabled={addPending}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="manual_notes">Notes (optionnel)</Label>
            <Textarea
              id="manual_notes"
              name="notes"
              rows={2}
              placeholder="Portion généreuse"
              disabled={addPending}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" size="sm" disabled={addPending}>
              {addPending ? (
                <>
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  Ajout…
                </>
              ) : (
                "Ajouter la ligne"
              )}
            </Button>
          </div>
        </form>
      </details>

      {showOnboardingNav ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/onboarding/profile">Retour</Link>
          </Button>
          {menuItems.length > 0 ? (
            <Button asChild>
              <Link href="/onboarding/review">Continuer</Link>
            </Button>
          ) : (
            <Button type="button" disabled>
              Continuer après import
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
