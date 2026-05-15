import { MenuPdfImport } from "@/components/onboarding/menu-pdf-import";
import { StepShell } from "@/components/onboarding/step-shell";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function MenuStepPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);

  return (
    <StepShell
      currentPath="/onboarding/menu"
      stepIndex={3}
      title="Votre menu en PDF"
      subtitle="Déposez le fichier ou collez un lien sécurisé (HTTPS). Nous lisons le contenu et proposons une liste que vous pouvez corriger avant la suite."
    >
      <MenuPdfImport menuItems={snapshot.menuItems} showOnboardingNav />
    </StepShell>
  );
}
