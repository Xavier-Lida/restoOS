import { redirect } from "next/navigation";

import { LoginView } from "@/components/login-view";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const snapshot = await getOnboardingSnapshot(user.id);
    const destination =
      snapshot.onboarding.onboarding_status === "completed" ? "/dashboard" : "/onboarding";
    redirect(destination);
  }

  const params = (await searchParams) ?? {};
  const errorMessage = params.error;
  const successMessage = params.success;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
      <div className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Auth Supabase</p>
          <h1 className="text-3xl font-semibold tracking-tight">Connexion restaurateur</h1>
          <p className="text-muted-foreground">
            Connectez-vous pour accéder au dashboard RestoPrix.
          </p>
        </div>

        <LoginView errorMessage={errorMessage} successMessage={successMessage} />
      </div>
    </main>
  );
}
