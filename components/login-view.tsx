"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type LoginViewProps = {
  initialError?: string | null;
  initialSuccess?: string | null;
};

export function LoginView({ initialError, initialSuccess }: LoginViewProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"login" | "signup" | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [success, setSuccess] = useState<string | null>(initialSuccess ?? null);

  async function submit(action: "/auth/login" | "/auth/signup") {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;

    setError(null);
    setSuccess(null);
    setLoading(true);
    setLoadingAction(action === "/auth/login" ? "login" : "signup");

    const formData = new FormData(formRef.current);

    try {
      const response = await fetch(action, {
        method: "POST",
        body: formData,
        redirect: "follow",
      });

      const finalUrl = new URL(response.url);
      const errorParam = finalUrl.searchParams.get("error");
      const successParam = finalUrl.searchParams.get("success");

      if (errorParam) {
        setError(decodeURIComponent(errorParam));
      } else if (successParam) {
        setSuccess(decodeURIComponent(successParam));
      } else {
        router.push(finalUrl.pathname);
        return;
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit("/auth/login");
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: "#c4d4cc" }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={loading}
          placeholder="vous@restaurant.com"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-[#1eb854] disabled:opacity-50"
          style={{
            background: "#0e1810",
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e8ede9",
          }}
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: "#c4d4cc" }}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={loading}
          placeholder="••••••••"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-[#1eb854] disabled:opacity-50"
          style={{
            background: "#0e1810",
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e8ede9",
          }}
        />
      </div>

      {/* Inline error */}
      {error && (
        <div
          className="rounded-lg border px-3 py-2.5 text-sm"
          style={{
            background: "rgba(251,113,133,0.08)",
            borderColor: "rgba(251,113,133,0.25)",
            color: "#fb7185",
          }}
        >
          {error}
        </div>
      )}

      {/* Inline success */}
      {success && (
        <div
          className="rounded-lg border px-3 py-2.5 text-sm"
          style={{
            background: "rgba(30,184,84,0.08)",
            borderColor: "rgba(30,184,84,0.25)",
            color: "#1eb854",
          }}
        >
          {success}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "#1eb854", color: "#0a0f0d" }}
        >
          {loadingAction === "login" && <Loader2 className="h-4 w-4 animate-spin" />}
          Se connecter
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => submit("/auth/signup")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: "#e8ede9" }}
        >
          {loadingAction === "signup" && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer un compte
        </button>
      </div>
    </form>
  );
}
