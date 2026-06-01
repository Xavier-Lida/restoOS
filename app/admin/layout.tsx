import { assertAdminUser } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdminUser();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              RestoOs · Admin
            </p>
            <p className="text-sm text-muted-foreground">Outils internes</p>
          </div>
          <a href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Retour au dashboard
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
