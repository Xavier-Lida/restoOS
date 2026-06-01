import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export default async function DashboardExportPage() {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const count = snapshot.menuItems.length;
  const restaurant = snapshot.onboarding.restaurant_name ?? "Votre restaurant";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Export CSV du menu</h1>
        <p className="text-sm text-muted-foreground">
          Téléchargez un fichier CSV à partir des {count} plat(s) enregistré(s) pour{" "}
          <span className="font-medium text-foreground">{restaurant}</span>. Vous n'aurez qu'à importer le fichier dans votre logiciel de caisse, afin de mettre à jour votre menu.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {count === 0
              ? "Ajoutez des plats dans la section Menu avant d'exporter."
              : "Le fichier inclut les catégories, noms, prix (CAD) et notes saisies, triés par catégorie."}
          </p>
          {count > 0 ? (
            <Button asChild>
              <a href="/api/dashboard/menu-csv" download>
                Télécharger le CSV
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/dashboard/menu">Aller au menu</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
