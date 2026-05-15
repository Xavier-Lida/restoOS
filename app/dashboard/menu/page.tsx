import Link from "next/link";
import { UtensilsCrossedIcon } from "lucide-react";

import { MenuPdfImport } from "@/components/onboarding/menu-pdf-import";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function DashboardMenuPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Menu</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <UtensilsCrossedIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Votre carte</h1>
            <p className="text-sm text-muted-foreground">
              Importez un PDF ou ajustez les plats comme pendant l&apos;onboarding. Les changements sont enregistrés
              sur votre compte. Pour des recommandations de prix assistées par IA, ouvrez{" "}
              <Link href="/dashboard/pricing-suggestions" className="font-medium text-primary underline underline-offset-4">
                Suggestions de prix
              </Link>
              .
            </p>
          </div>
        </div>
      </header>
      <MenuPdfImport menuItems={snapshot.menuItems} />
    </div>
  );
}
