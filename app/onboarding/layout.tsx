import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAuthedUser,
  getOnboardingSnapshot,
  shouldRedirectOnboardingPath,
} from "@/lib/onboarding/server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);

  if (snapshot.onboarding.onboarding_status === "completed") {
    redirect("/dashboard");
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname");
  const redirectTo = shouldRedirectOnboardingPath(pathname, snapshot);
  if (redirectTo) {
    redirect(redirectTo);
  }

  return children;
}
