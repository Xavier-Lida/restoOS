import Link from "next/link";

import { CompleteOnboardingButton } from "@/components/onboarding/complete-onboarding-button";
import { StepShell } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { profileOptions } from "@/lib/onboarding/constants";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function ReviewStepPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const profileLabel =
    profileOptions.find((option) => option.value === snapshot.onboarding.dominant_profile)?.title ??
    "Non défini";

  return (
    <StepShell
      currentPath="/onboarding/review"
      stepIndex={4}
      title="Validation finale"
      subtitle="Voici le portrait que nous avons construit avec vous. Vérifiez chaque bloc avant de terminer l’onboarding."
    >
      <div className="grid gap-4">
        <section className="rounded-md border p-4">
          <p className="font-medium">Propriétaire</p>
          <p className="text-sm text-muted-foreground">{snapshot.onboarding.owner_name ?? "—"}</p>
          <Button asChild variant="link" className="px-0">
            <Link href="/onboarding/owner">Modifier</Link>
          </Button>
        </section>

        <section className="rounded-md border p-4">
          <p className="font-medium">Restaurant</p>
          <p className="text-sm text-muted-foreground">
            {snapshot.onboarding.restaurant_name ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {snapshot.onboarding.address_line ?? "—"}, {snapshot.onboarding.city ?? "—"}{" "}
            {snapshot.onboarding.postal_code ?? "—"}
          </p>
          <Button asChild variant="link" className="px-0">
            <Link href="/onboarding/restaurant">Modifier</Link>
          </Button>
        </section>

        <section className="rounded-md border p-4">
          <p className="font-medium">Profil stratégique</p>
          <p className="text-sm text-muted-foreground">{profileLabel}</p>
          <Button asChild variant="link" className="px-0">
            <Link href="/onboarding/profile">Modifier</Link>
          </Button>
        </section>

        <section className="rounded-md border p-4">
          <p className="font-medium">Menu</p>
          <p className="text-sm text-muted-foreground">
            {snapshot.menuItems.length} plat(s) enregistré(s)
          </p>
          <Button asChild variant="link" className="px-0">
            <Link href="/onboarding/menu">Modifier</Link>
          </Button>
        </section>

        <div className="flex gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/onboarding/menu">Retour</Link>
          </Button>
          <CompleteOnboardingButton />
        </div>
      </div>
    </StepShell>
  );
}
