"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { saveProfileAction } from "@/app/onboarding/actions";
import { ProfileChoiceCard } from "@/components/onboarding/profile-choice-card";
import { Button } from "@/components/ui/button";
import { profileOptions } from "@/lib/onboarding/constants";
import { type ProfileValue } from "@/lib/onboarding/types";

type ProfileWizardProps = {
  initialProfile: ProfileValue | null;
};

export function ProfileWizard({ initialProfile }: ProfileWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const startIndex = useMemo(() => {
    const idx = profileOptions.findIndex((o) => o.value === initialProfile);
    return idx >= 0 ? idx : 0;
  }, [initialProfile]);

  const [cardIndex, setCardIndex] = useState(startIndex);
  const option = profileOptions[cardIndex];
  const lastIndex = profileOptions.length - 1;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("dominant_profile", option.value);
        startTransition(async () => {
          const result = await saveProfileAction(fd);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          if (result.message) {
            toast.success(result.message);
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      <ProfileChoiceCard
        value={option.value}
        title={option.title}
        subtitle={option.subtitle}
        guidance={option.guidance}
        checked
        presentationOnly
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button asChild type="button" variant="outline" size="sm" disabled={isPending}>
            <Link href="/onboarding/restaurant">Retour</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cardIndex === 0 || isPending}
            onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
          >
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cardIndex === lastIndex || isPending}
            onClick={() => setCardIndex((i) => Math.min(lastIndex, i + 1))}
          >
            Suivant
          </Button>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
              Enregistrement…
            </>
          ) : (
            "Continuer avec ce profil"
          )}
        </Button>
      </div>
    </form>
  );
}
