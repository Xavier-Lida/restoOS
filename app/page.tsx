import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <div className="flex flex-col gap-6">
        <p className="text-sm font-medium text-muted-foreground">RestoPrix · MVP</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Intelligence concurrentielle pour augmenter la marge sans perdre en
          competitivite.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Connectez votre POS, suivez les prix concurrents localement, validez
          des recommandations de prix, puis exportez votre menu en CSV (et QR code) en
          quelques clics.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Demarrer</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Voir la vision produit</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
