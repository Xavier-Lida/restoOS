import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isAdminEmail } from "@/lib/admin/emails";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  if (snapshot.onboarding.onboarding_status !== "completed") {
    redirect("/onboarding");
  }

  const showAdminLink = isAdminEmail(user.email);

  return <DashboardShell showAdminLink={showAdminLink}>{children}</DashboardShell>;
}
