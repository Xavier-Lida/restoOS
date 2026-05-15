"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { completeOnboardingAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";

export function CompleteOnboardingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await completeOnboardingAction();
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          if (result.message) {
            toast.success(result.message);
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      {isPending ? (
        <>
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
          Finalisation…
        </>
      ) : (
        "Terminer l’onboarding"
      )}
    </Button>
  );
}
