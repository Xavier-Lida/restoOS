"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, CrownIcon, Loader2Icon, ShieldIcon, ZapIcon } from "lucide-react";

import {
  saveOwnerSettingsAction,
  saveRestaurantSettingsAction,
  saveProfileSettingsAction,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileOptions } from "@/lib/onboarding/constants";
import type { OnboardingRecord } from "@/lib/onboarding/types";
import type { ProfileValue } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

const iconMap = {
  crown: CrownIcon,
  zap: ZapIcon,
  shield: ShieldIcon,
} as const;

// ─── Owner ────────────────────────────────────────────────────────────────────

export function OwnerSettingsForm({ defaultOwnerName }: { defaultOwnerName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveOwnerSettingsAction(fd);
      if (result.ok) {
        toast.success(result.message ?? "Enregistré.");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="owner_name">Nom complet</Label>
        <Input
          id="owner_name"
          name="owner_name"
          required
          defaultValue={defaultOwnerName}
          placeholder="Ex. Marie Tremblay"
          disabled={isPending}
          autoComplete="name"
        />
        <p className="text-xs text-muted-foreground">
          Apparaît dans les recommandations et les messages de suivi.
        </p>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export function RestaurantSettingsForm({ onboarding }: { onboarding: OnboardingRecord }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveRestaurantSettingsAction(fd);
      if (result.ok) {
        toast.success(result.message ?? "Enregistré.");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="address_line">Adresse</Label>
          <Input
            id="address_line"
            name="address_line"
            required
            defaultValue={onboarding.address_line ?? ""}
            placeholder="Ex. 123 rue Saint-Denis"
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={onboarding.city ?? ""}
            placeholder="Ex. Montréal"
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            name="postal_code"
            required
            defaultValue={onboarding.postal_code ?? ""}
            placeholder="Ex. H2X 1Y6"
            disabled={isPending}
          />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function ProfileSettingsForm({ initialProfile }: { initialProfile: ProfileValue | null }) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ProfileValue | null>(initialProfile);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData();
    fd.set("dominant_profile", selected);
    startTransition(async () => {
      const result = await saveProfileSettingsAction(fd);
      if (result.ok) {
        toast.success(result.message ?? "Enregistré.");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {profileOptions.map((opt) => {
          const Icon = iconMap[opt.icon as keyof typeof iconMap];
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => setSelected(opt.value)}
              className={cn(
                "relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-3" />
                </span>
              )}
              <Icon className={cn("size-5", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="font-medium">{opt.title}</span>
              <ul className="flex flex-col gap-0.5">
                {opt.bullets.map((b) => (
                  <li key={b} className="text-xs text-muted-foreground">
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <div>
        <Button type="submit" size="sm" disabled={isPending || !selected}>
          {isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          {isPending ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}
