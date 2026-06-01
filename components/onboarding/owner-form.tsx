"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { saveOwnerAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OwnerFormProps = {
  defaultOwnerName: string;
};

export function OwnerForm({ defaultOwnerName }: OwnerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setError(null);
        startTransition(async () => {
          const fd = new FormData(form);
          const result = await saveOwnerAction(fd);
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="owner_name">Nom complet</Label>
        <Input
          id="owner_name"
          name="owner_name"
          required
          defaultValue={defaultOwnerName}
          placeholder="Ex. Marie Tremblay"
          disabled={isPending}
          autoComplete="name"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          Ce nom apparaîtra dans les recommandations et les messages de suivi.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
              Enregistrement…
            </>
          ) : (
            "Continuer"
          )}
        </Button>
      </div>
    </form>
  );
}
