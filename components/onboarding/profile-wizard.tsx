"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, CheckIcon, CrownIcon, ZapIcon, ShieldIcon } from "lucide-react";

import { saveProfileAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { profileOptions } from "@/lib/onboarding/constants";
import { type ProfileValue } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

const iconMap = {
  crown: CrownIcon,
  zap: ZapIcon,
  shield: ShieldIcon,
} as const;

type ProfileWizardProps = {
  initialProfile: ProfileValue | null;
};

export function ProfileWizard({ initialProfile }: ProfileWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ProfileValue | null>(initialProfile ?? null);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return;
        const fd = new FormData();
        fd.set("dominant_profile", selected);
        startTransition(async () => {
          const result = await saveProfileAction(fd);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {profileOptions.map((option) => {
          const isSelected = selected === option.value;
          const Icon = iconMap[option.icon as keyof typeof iconMap];
          return (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => setSelected(option.value as ProfileValue)}
              className={cn(
                "relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                "hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/8 shadow-sm"
                  : "border-border bg-background",
              )}
            >
              {isSelected ? (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-3" />
                </span>
              ) : null}

              <Icon
                className={cn(
                  "size-6 transition-colors duration-200",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              />

              <p className="pr-6 text-sm font-semibold leading-tight">{option.title}</p>

              <ul className="grid gap-1">
                {option.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0 leading-none">–</span>
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <Button asChild type="button" variant="outline" disabled={isPending}>
          <Link href="/onboarding/restaurant">Retour</Link>
        </Button>
        <Button type="submit" disabled={isPending || !selected}>
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
