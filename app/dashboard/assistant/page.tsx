import { AssistantWorkspace } from "@/components/dashboard/assistant-workspace";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function DashboardAssistantPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const restaurantName =
    snapshot.onboarding.restaurant_name ?? snapshot.onboarding.display_name ?? "votre restaurant";

  return <AssistantWorkspace restaurantName={restaurantName} />;
}
