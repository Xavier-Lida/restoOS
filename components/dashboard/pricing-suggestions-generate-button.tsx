"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type PricingSuggestionsGenerateButtonProps = {
  disabled?: boolean;
};

export function PricingSuggestionsGenerateButton({ disabled }: PricingSuggestionsGenerateButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Génération en cours…" : "Générer des suggestions"}
    </Button>
  );
}
