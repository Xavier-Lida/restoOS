import Image from "next/image";
import Link from "next/link";
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

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ background: "#0f1910" }}
    >
      {/* Logo */}
      <Link href="/">
        <Image
          src="/logo/restoOS-logo-transparent-2400.png"
          alt="RestoOs"
          width={280}
          height={72}
          className="object-contain"
        />
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl border p-8 shadow-2xl"
        style={{ background: "#131f18", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-bold" style={{ color: "#ffffff" }}>
            Bienvenue
          </h1>
          <p className="text-sm" style={{ color: "#9cb0a5" }}>
            Connectez-vous à votre espace RestoOs.
          </p>
        </div>

        <LoginView initialError={params.error} initialSuccess={params.success} />
      </div>
    </div>
  );
}
