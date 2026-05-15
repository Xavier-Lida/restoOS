import { onboardingSteps } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

type StepShellProps = {
  currentPath: string;
  stepIndex: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const totalSteps = onboardingSteps.length;

export function StepShell({
  currentPath,
  stepIndex,
  title,
  subtitle,
  children,
}: StepShellProps) {
  const safeIndex = Math.min(Math.max(stepIndex, 0), totalSteps - 1);
  const progressPct = ((safeIndex + 1) / totalSteps) * 100;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">RestoPrix</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            Étape {safeIndex + 1} sur {totalSteps}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={safeIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label="Progression de l’onboarding"
          />
        </div>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </header>

      <div
        key={currentPath}
        className={cn(
          "rounded-lg border bg-card p-6 text-card-foreground shadow-sm",
          "animate-in fade-in slide-in-from-bottom-3 duration-300 fill-mode-both",
        )}
      >
        {children}
      </div>
    </main>
  );
}
