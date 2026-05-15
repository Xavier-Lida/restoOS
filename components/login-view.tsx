"use client";

import { useMemo } from "react";

import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginViewProps = {
  errorMessage?: string | null;
  successMessage?: string | null;
};

export function LoginView({ errorMessage, successMessage }: LoginViewProps) {
  const flashes: FlashPayload[] = useMemo(() => {
    const list: FlashPayload[] = [];
    if (errorMessage) {
      list.push({ variant: "error", message: errorMessage });
    }
    if (successMessage) {
      list.push({ variant: "success", message: successMessage });
    }
    return list;
  }, [errorMessage, successMessage]);

  return (
    <>
      <FlashToaster flashes={flashes} />
      <form action="/auth/login" method="post" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button type="submit">Se connecter</Button>
          <Button type="submit" formAction="/auth/signup" variant="outline">
            Créer un compte
          </Button>
        </div>
      </form>
    </>
  );
}
