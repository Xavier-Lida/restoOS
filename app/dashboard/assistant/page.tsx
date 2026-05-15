import { AssistantChat } from "@/components/dashboard/assistant-chat";

export default function DashboardAssistantPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Assistant IA</p>
        <h1 className="text-3xl font-semibold tracking-tight">Conseiller RestoPrix</h1>
        <p className="text-sm text-muted-foreground">
          Contexte injecté automatiquement : objectif produit, fiche établissement, menu enregistré, synthèse des
          imports Square lorsque disponible.
        </p>
      </header>
      <AssistantChat />
    </div>
  );
}
