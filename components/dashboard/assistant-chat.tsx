"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || busy) {
      return;
    }

    setError(null);
    setBusy(true);
    const previous = messages;
    const nextMessages: ChatMessage[] = [...previous, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");

    try {
      const res = await fetch("/api/dashboard/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur réseau.");
        setMessages(previous);
        return;
      }
      if (!data.reply) {
        setError("Réponse vide.");
        setMessages(previous);
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Impossible de joindre le serveur.");
      setMessages(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-[320px] flex-col gap-3 rounded-lg border bg-card p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Posez une question sur vos prix, votre menu ou votre stratégie. L&apos;assistant utilise le contexte
            RestoPrix (onboarding, menu, import Square si présent). Les données marché détaillées arriveront dans une
            prochaine version.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
                  : "mr-auto max-w-[85%] rounded-lg border bg-background px-3 py-2 text-sm"
              }
            >
              {m.content}
            </div>
          ))
        )}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          disabled={busy}
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          {busy ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </div>
  );
}
