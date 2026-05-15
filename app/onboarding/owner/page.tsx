import { OwnerForm } from "@/components/onboarding/owner-form";
import { StepShell } from "@/components/onboarding/step-shell";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function OwnerStepPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);

  return (
    <StepShell
      currentPath="/onboarding/owner"
      stepIndex={0}
      title="Qui pilote votre restaurant ?"
      subtitle="Pour vous parler de façon humaine et adaptée à votre contexte, commençons par le nom de la personne décisionnaire."
    >
      <OwnerForm defaultOwnerName={snapshot.onboarding.owner_name ?? ""} />
    </StepShell>
  );
}
