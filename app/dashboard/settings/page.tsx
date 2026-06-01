import { Settings2Icon } from "lucide-react";

import {
  OwnerSettingsForm,
  RestaurantSettingsForm,
  ProfileSettingsForm,
} from "@/components/dashboard/settings-forms.client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import type { ProfileValue } from "@/lib/onboarding/types";

export default async function SettingsPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const { onboarding } = snapshot;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <Settings2Icon className="size-4.5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Modifiez les informations du propriétaire, du restaurant et votre profil de prix.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Propriétaire</CardTitle>
          <CardDescription>Nom de la personne décisionnaire du restaurant.</CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerSettingsForm defaultOwnerName={onboarding.owner_name ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant</CardTitle>
          <CardDescription>Nom, adresse et localisation de l'établissement.</CardDescription>
        </CardHeader>
        <CardContent>
          <RestaurantSettingsForm onboarding={onboarding} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil de prix</CardTitle>
          <CardDescription>
            Oriente la stratégie tarifaire des suggestions IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm
            initialProfile={onboarding.dominant_profile as ProfileValue | null}
          />
        </CardContent>
      </Card>
    </main>
  );
}
