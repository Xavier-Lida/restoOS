import Link from "next/link";
import { ArrowRight, Check, TrendingUp } from "lucide-react";
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
    <div className="min-h-screen" style={{ background: "#0f1910", color: "#e8ede9" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b px-6"
        style={{ background: "#0f1910", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/">
              <Image
                src="/logo/restoOS-logo-transparent-2400.png"
                alt="RestoOs"
                width={240}
                height={64}
                className="object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm transition-colors" style={{ color: "#9cb0a5" }}>
              Connexion
            </Link>
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#1eb854", color: "#0a0f0d" }}
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
            {/* Heading */}
            <h1
              className="text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl 2xl:text-7xl"
              style={{ color: "#ffffff" }}
            >
              Augmentez votre
              <br />
              marge{" "}
              <span style={{ color: "#1eb854" }}>sans</span>
              <br />
              <span style={{ color: "#1eb854" }}>perdre</span> vos clients.
            </h1>

            {/* Subtitle */}
            <p className="max-w-lg text-lg leading-relaxed" style={{ color: "#9cb0a5" }}>
              RestoPrix connecte votre POS, lit les prix de vos concurrents
              locaux et vous propose le bon prix, plat par plat. Vous validez,
              vous exportez, la marge suit.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-base font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#1eb854", color: "#0a0f0d" }}
              >
                Démarrer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="flex items-center justify-center">
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
              style={{ background: "#131f18", borderColor: "rgba(255,255,255,0.1)" }}
            >
              {/* Title bar */}
              <div
                className="flex items-center gap-2 border-b px-4 py-3"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
                <p className="ml-2 text-sm" style={{ color: "#9cb0a5" }}>
                  <span style={{ color: "#e8ede9", fontWeight: 600 }}>Bistro Montcalm</span>
                  {" · tableau de bord · 30 jours"}
                </p>
              </div>

              <div className="space-y-3 p-4">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl border p-4"
                    style={{ background: "#0e1810", borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "#6b8f7e" }}
                    >
                      Marge additionnelle
                    </p>
                    <p className="mt-2 text-2xl font-bold" style={{ color: "#1eb854" }}>
                      +4 823 $
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "#6b8f7e" }}>
                      ce mois-ci · ROI 24×
                    </p>
                  </div>
                  <div
                    className="rounded-xl border p-4"
                    style={{ background: "#0e1810", borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "#6b8f7e" }}
                    >
                      Index stratégique
                    </p>
                    <p className="mt-2 text-2xl font-bold" style={{ color: "#e8ede9" }}>
                      78{" "}
                      <span className="text-base font-normal" style={{ color: "#9cb0a5" }}>
                        /100
                      </span>
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "#6b8f7e" }}>
                      #2 sur 12 dans votre zone
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div
                  className="rounded-xl border p-4"
                  style={{ background: "#0e1810", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "#e8ede9" }}>
                      Ventes nettes
                    </p>
                    <p className="text-xs" style={{ color: "#9cb0a5" }}>
                      22 499 $ · +8,4 %
                    </p>
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
                              ? "#1eb854"
                              : h >= 60
                                ? "rgba(30,184,84,0.55)"
                                : "rgba(30,184,84,0.25)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Price suggestions */}
                <div
                  className="relative rounded-xl border p-4"
                  style={{ background: "#0e1810", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "#e8ede9" }}>
                      Prix proposés à valider
                    </p>
                    <p className="text-xs font-medium" style={{ color: "#1eb854" }}>
                      4 alertes
                    </p>
                  </div>
                  <div className="space-y-2.5 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "#c4d4cc" }}>
                        Tartare de bœuf
                      </span>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span
                          className="line-through text-xs"
                          style={{ color: "#6b8f7e" }}
                        >
                          24 $
                        </span>
                        <span className="text-xs" style={{ color: "#9cb0a5" }}>
                          →
                        </span>
                        <span className="font-medium" style={{ color: "#e8ede9" }}>
                          26 $
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-xs font-semibold"
                          style={{
                            background: "rgba(30,184,84,0.18)",
                            color: "#1eb854",
                          }}
                        >
                          +2 $
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm" style={{ color: "#c4d4cc" }}>
                        Pavé de saumon
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm" style={{ color: "#c4d4cc" }}>
                        Burger maison
                      </span>
                    </div>
                  </div>

                  {/* Floating ROI badge */}
                  <div
                    className="absolute bottom-4 right-4 flex items-center gap-2.5 rounded-xl border px-3 py-2 shadow-xl"
                    style={{
                      background: "#1a2a1e",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: "rgba(30,184,84,0.2)" }}
                    >
                      <TrendingUp className="h-4 w-4" style={{ color: "#1eb854" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none" style={{ color: "#e8ede9" }}>
                        24×
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: "#9cb0a5" }}>
                        retour sur abonnement
                      </p>
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
