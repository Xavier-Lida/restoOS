"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type GenerateApiSuccess = {
  ok: true;
  count: number;
  redirectTo: string;
};

type GenerateApiFailure = {
  ok: false;
  code: string;
  message: string;
  detail?: string;
  redirectTo?: string;
};

type PricingSuggestionsGeneratePanelProps = {
  disabled?: boolean;
};

export function PricingSuggestionsGeneratePanel({ disabled }: PricingSuggestionsGeneratePanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  async function handleGenerate() {
    if (disabled || loading) {
      return;
    }
    setLoading(true);
    setLastError(null);

    try {
      const res = await fetch("/api/dashboard/pricing-suggestions/generate", {
        method: "POST",
        credentials: "include",
      });

      let body: GenerateApiSuccess | GenerateApiFailure | null = null;
      try {
        body = (await res.json()) as GenerateApiSuccess | GenerateApiFailure;
      } catch {
        body = null;
      }

      if (!body) {
        const text = `Réponse invalide du serveur (${res.status}).`;
        setLastError(text);
        toast.error(text);
        return;
      }

      if (body.ok) {
        toast.success(
          body.count > 0
            ? `${body.count} suggestion${body.count > 1 ? "s" : ""} générée${body.count > 1 ? "s" : ""}.`
            : "Suggestions générées.",
        );
        router.push(body.redirectTo);
        router.refresh();
        return;
      }

      setLastError(body.message);
      toast.error(body.message);
      if (body.redirectTo) {
        router.push(body.redirectTo);
        router.refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de joindre le serveur.";
      setLastError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      {lastError ? (
        <Alert variant="destructive" className="w-full">
          <AlertTitle>Échec de la génération</AlertTitle>
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="button" disabled={disabled || loading} onClick={() => void handleGenerate()}>
        {loading ? "Génération en cours (30–90 s)…" : "Générer des suggestions"}
      </Button>
      {loading ? (
        <p className="max-w-sm text-right text-xs text-muted-foreground">
          Appel IA en cours. Ne quitte pas la page ; l&apos;indicateur « Rendering » peut disparaître avant la fin.
        </p>
      ) : null}
    </div>
  );
}
