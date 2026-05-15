"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { saveRestaurantWizardStepAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type OnboardingRecord } from "@/lib/onboarding/types";

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function initialStepIndex(onboarding: OnboardingRecord): number {
  if (!hasText(onboarding.restaurant_name)) {
    return 0;
  }
  if (!hasText(onboarding.address_line)) {
    return 1;
  }
  if (!hasText(onboarding.city)) {
    return 2;
  }
  if (!hasText(onboarding.postal_code)) {
    return 3;
  }
  return 3;
}

const steps = [
  {
    fieldLabel: "Nom du restaurant",
    placeholder: "Ex. Bistro Montcalm",
    helper: "Tel qu’il apparaît pour vos clients.",
    defaultKey: "restaurant_name" as keyof OnboardingRecord,
  },
  {
    fieldLabel: "Adresse (rue et numéro)",
    placeholder: "123, rue Saint-Jean",
    helper: "Sans ville ni code postal pour l’instant.",
    defaultKey: "address_line" as keyof OnboardingRecord,
  },
  {
    fieldLabel: "Ville",
    placeholder: "Québec",
    helper: "",
    defaultKey: "city" as keyof OnboardingRecord,
  },
  {
    fieldLabel: "Code postal",
    placeholder: "G1R 1P1",
    helper: "",
    defaultKey: "postal_code" as keyof OnboardingRecord,
  },
] as const;

type RestaurantWizardProps = {
  onboarding: OnboardingRecord;
};

export function RestaurantWizard({ onboarding }: RestaurantWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(() => initialStepIndex(onboarding));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = steps[stepIndex];
  const defaultValue = useMemo(() => {
    const raw = onboarding[current.defaultKey];
    return typeof raw === "string" ? raw : "";
  }, [onboarding, current.defaultKey]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const value = new FormData(form).get("value")?.toString().trim() ?? "";
        setError(null);
        if (!value) {
          setError("Ce champ est requis.");
          return;
        }

        startTransition(async () => {
          const fd = new FormData();
          fd.set("step", String(stepIndex));
          fd.set("value", value);
          const result = await saveRestaurantWizardStepAction(fd);
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          if (result.message) {
            toast.success(result.message);
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
            return;
          }
          if (stepIndex < 3) {
            await router.refresh();
            setStepIndex((s) => s + 1);
          }
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="restaurant_wizard_value">{current.fieldLabel}</Label>
        <Input
          id="restaurant_wizard_value"
          name="value"
          key={`${stepIndex}-${current.defaultKey}`}
          required
          defaultValue={defaultValue}
          placeholder={current.placeholder}
          disabled={isPending}
        />
        {current.helper ? (
          <p className="text-sm text-muted-foreground">{current.helper}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild type="button" variant="outline" disabled={isPending}>
          <Link href="/onboarding/owner">Retour</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
              Enregistrement…
            </>
          ) : stepIndex === 3 ? (
            "Continuer"
          ) : (
            "Suivant"
          )}
        </Button>
      </div>
    </form>
  );
}
