import { AssistantWorkspace } from "@/components/dashboard/assistant-workspace";

export default function DashboardAssistantPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 pb-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Assistant IA</p>
        <h1 className="text-3xl font-semibold tracking-tight">Conseiller RestOS</h1>
      </header>
      <AssistantWorkspace />
    </div>
  );
}
