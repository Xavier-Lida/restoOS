"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { saveRestaurantAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type OnboardingRecord } from "@/lib/onboarding/types";

type RestaurantWizardProps = {
  onboarding: OnboardingRecord;
};

export function RestaurantWizard({ onboarding }: RestaurantWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors({});
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await saveRestaurantAction(fd);
          if (!result.ok) {
            toast.error(result.message);
            const field = result.message.includes("nom") ? "restaurant_name"
              : result.message.includes("adresse") ? "address_line"
              : result.message.includes("ville") ? "city"
              : result.message.includes("postal") ? "postal_code"
              : "form";
            setErrors({ [field]: result.message });
            return;
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="restaurant_name">Nom du restaurant</Label>
          <Input
            id="restaurant_name"
            name="restaurant_name"
            required
            defaultValue={onboarding.restaurant_name ?? onboarding.display_name ?? ""}
            placeholder="Ex. Bistro Montcalm"
            disabled={isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {errors.restaurant_name ? (
            <p className="text-sm text-destructive">{errors.restaurant_name}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Tel qu'il apparaît pour vos clients.</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="address_line">Adresse</Label>
          <Input
            id="address_line"
            name="address_line"
            required
            defaultValue={onboarding.address_line ?? ""}
            placeholder="123, rue Saint-Jean"
            disabled={isPending}
          />
          {errors.address_line ? (
            <p className="text-sm text-destructive">{errors.address_line}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={onboarding.city ?? ""}
            placeholder="Québec"
            disabled={isPending}
          />
          {errors.city ? <p className="text-sm text-destructive">{errors.city}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            name="postal_code"
            required
            defaultValue={onboarding.postal_code ?? ""}
            placeholder="G1R 1P1"
            disabled={isPending}
          />
          {errors.postal_code ? (
            <p className="text-sm text-destructive">{errors.postal_code}</p>
          ) : null}
        </div>
      </div>

      {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}

      <div className="flex flex-wrap gap-3 pt-1">
        <Button asChild type="button" variant="outline" disabled={isPending}>
          <Link href="/onboarding/owner">Retour</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
              Enregistrement…
            </>
          ) : (
            "Continuer"
          )}
        </Button>
      </div>
    </form>
  );
}
