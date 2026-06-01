"use client";

import { useEffect, useRef } from "react";

import { AssistantMessage } from "@/components/dashboard/assistant-message";
import { AssistantSuggestionChips } from "@/components/dashboard/assistant-suggestion-chips";
import { AssistantThinking } from "@/components/dashboard/assistant-thinking";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantChatMessage } from "@/lib/schemas/assistant-turn";
import { cn } from "@/lib/utils";

const INITIAL_SUGGESTIONS = [
  "Quels plats semblent sous-tarifés ?",
  "Résume mes ventes des 30 derniers jours",
  "Compare mon plat le plus vendu au marché",
  "Quel gain si j'applique les suggestions en attente ?",
];

type AssistantChatPanelProps = {
  messages: AssistantChatMessage[];
  streamingContent: string | null;
  statusMessage: string | null;
  busy: boolean;
  error: string | null;
  chips: string[];
  followUps: string[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onChipSelect: (text: string) => void;
  compact?: boolean;
};

export function AssistantChatPanel({
  messages,
  streamingContent,
  statusMessage,
  busy,
  error,
  chips,
  followUps,
  input,
  onInputChange,
  onSend,
  onChipSelect,
  compact,
}: AssistantChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0 && !streamingContent;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent, statusMessage]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", compact ? "gap-3" : "gap-4")}>
      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto",
          isEmpty ? "justify-center" : "justify-end",
        )}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 px-2 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Posez une question sur vos prix, votre menu, vos ventes ou le marché. Les chiffres de votre compte
              sont injectés automatiquement.
            </p>
            <AssistantSuggestionChips
              items={INITIAL_SUGGESTIONS}
              onSelect={onChipSelect}
              disabled={busy}
              className="justify-center"
            />
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <AssistantMessage
                key={`${m.role}-${i}`}
                role={m.role}
                content={m.content}
                refused={m.refused}
              />
            ))}
            {streamingContent ? (
              <AssistantMessage role="assistant" content={streamingContent} streaming />
            ) : null}
            {busy && !streamingContent ? <AssistantThinking message={statusMessage} /> : null}
          </>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!isEmpty && (chips.length > 0 || followUps.length > 0) ? (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          {chips.length > 0 ? (
            <AssistantSuggestionChips items={chips} onSelect={onChipSelect} disabled={busy} />
          ) : null}
          {followUps.length > 0 ? (
            <AssistantSuggestionChips
              items={followUps}
              onSelect={onChipSelect}
              disabled={busy}
              variant="followup"
            />
          ) : null}
        </div>
      ) : null}

      <form
        className="flex shrink-0 flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Votre message…"
          disabled={busy}
          rows={compact ? 2 : 3}
          className="min-h-[72px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button type="submit" disabled={busy || !input.trim()} className="self-end">
          {busy ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </div>
  );
}
