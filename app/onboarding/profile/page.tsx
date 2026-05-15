import { ProfileWizard } from "@/components/onboarding/profile-wizard";
import { StepShell } from "@/components/onboarding/step-shell";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import { type ProfileValue } from "@/lib/onboarding/types";

export default async function ProfileStepPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const initialProfile = snapshot.onboarding.dominant_profile as ProfileValue | null;

  return (
    <StepShell
      currentPath="/onboarding/profile"
      stepIndex={2}
      title="Quel est votre style de prix ?"
      subtitle="Il n’y a pas de bonne ou mauvaise réponse. Parcourez les trois profils, puis validez celui qui vous ressemble le plus."
    >
      <ProfileWizard initialProfile={initialProfile} />
    </StepShell>
  );
}
