import { RestaurantWizard } from "@/components/onboarding/restaurant-wizard";
import { StepShell } from "@/components/onboarding/step-shell";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function RestaurantStepPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);

  return (
    <StepShell
      currentPath="/onboarding/restaurant"
      stepIndex={1}
      title="Parlons de votre restaurant"
      subtitle="Quelques précisions sur l’établissement pour contextualiser la concurrence locale. Une question à la fois."
    >
      <RestaurantWizard onboarding={snapshot.onboarding} />
    </StepShell>
  );
}
