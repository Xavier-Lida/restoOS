import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import Image from "next/image";

import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

const BAR_HEIGHTS = [28, 35, 32, 42, 38, 45, 40, 55, 50, 62, 58, 65, 60, 70, 68, 76, 80, 72, 88, 95, 82, 100];

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background px-6">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/">
            <Image
              src="/logo/restoOS-logo-transparent-2400.png"
              alt="RestoOs"
              width={240}
              height={64}
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Connexion
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Démarrer
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left */}
          <div className="flex flex-col gap-8">
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white xl:text-6xl 2xl:text-7xl">
              Augmentez votre
              <br />
              marge <span className="text-primary">sans</span>
              <br />
              <span className="text-primary">perdre</span> vos clients.
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              RestoOS connecte votre POS, lit les prix de vos concurrents
              locaux et vous propose le bon prix, plat par plat. Vous validez,
              vous exportez, la marge suit.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Démarrer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              {/* Title bar */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
                <p className="ml-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Bistro Montcalm</span>
                  {" · tableau de bord · 30 jours"}
                </p>
              </div>

              <div className="space-y-3 p-4">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-popover p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Marge additionnelle
                    </p>
                    <p className="mt-2 text-2xl font-bold text-primary">+4 823 $</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">ce mois-ci · ROI 24×</p>
                  </div>
                  <div className="rounded-xl border border-border bg-popover p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Index stratégique
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      78{" "}
                      <span className="text-base font-normal text-muted-foreground">/100</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">#2 sur 12 dans votre zone</p>
                  </div>
                </div>

                {/* Chart */}
                <div className="rounded-xl border border-border bg-popover p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Ventes nettes</p>
                    <p className="text-xs text-muted-foreground">22 499 $ · +8,4 %</p>
                  </div>
                  <div className="flex h-20 items-end gap-[3px]">
                    {BAR_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          background:
                            h >= 88
                              ? "var(--color-primary)"
                              : h >= 60
                                ? "color-mix(in srgb, var(--color-primary) 55%, transparent)"
                                : "color-mix(in srgb, var(--color-primary) 25%, transparent)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Price suggestions */}
                <div className="relative rounded-xl border border-border bg-popover p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Prix proposés à valider</p>
                    <p className="text-xs font-medium text-primary">4 alertes</p>
                  </div>
                  <div className="space-y-2.5 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/75">Tartare de bœuf</span>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="line-through text-xs text-muted-foreground/60">24 $</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="font-medium text-foreground">26 $</span>
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                          +2 $
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-foreground/75">Pavé de saumon</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-foreground/75">Burger maison</span>
                    </div>
                  </div>

                  {/* Floating ROI badge */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none text-foreground">24×</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">retour sur abonnement</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
