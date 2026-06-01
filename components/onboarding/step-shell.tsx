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
      {/* Header nav */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-tight text-foreground">RestoOs</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {safeIndex + 1} / {totalSteps}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={safeIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label="Progression de l'onboarding"
          />
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-between">
          {onboardingSteps.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "size-2 rounded-full transition-all duration-300",
                  i < safeIndex
                    ? "bg-primary"
                    : i === safeIndex
                    ? "size-2.5 bg-primary ring-2 ring-primary/30"
                    : "bg-muted-foreground/30",
                )}
              />
              <p
                className={cn(
                  "hidden text-[10px] transition-colors duration-200 sm:block",
                  i === safeIndex ? "font-medium text-foreground" : "text-muted-foreground/60",
                )}
              >
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Title */}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </header>

      {/* Card */}
      <div
        key={currentPath}
        className={cn(
          "rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
          "animate-in fade-in slide-in-from-bottom-4 duration-300 fill-mode-both",
        )}
      >
        {children}
      </div>
    </main>
  );
}
