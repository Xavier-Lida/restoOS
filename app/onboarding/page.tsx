import { redirect } from "next/navigation";

import { getAuthedUser, getNextOnboardingStep, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function OnboardingEntryPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);

  if (snapshot.onboarding.onboarding_status === "completed") {
    redirect("/dashboard");
  }

  redirect(getNextOnboardingStep(snapshot));
}
