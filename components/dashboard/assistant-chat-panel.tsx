"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  ArrowRightIcon,
  ArrowUpDownIcon,
  DollarSignIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";

import { AssistantBetaBadge } from "@/components/dashboard/assistant-beta-badge";
import { AssistantMessage } from "@/components/dashboard/assistant-message";
import { AssistantSuggestionChips } from "@/components/dashboard/assistant-suggestion-chips";
import { AssistantThinking } from "@/components/dashboard/assistant-thinking";
import type { AssistantChatMessage } from "@/lib/schemas/assistant-turn";
import { cn } from "@/lib/utils";

const INITIAL_SUGGESTIONS = [
  {
    label: "Quels plats sont sous-tarifés ?",
    sub: "Repérer la marge laissée sur la table",
    icon: DollarSignIcon,
    prompt: "Quels plats sont sous-tarifés ?",
  },
  {
    label: "Résume mes ventes (30 j)",
    sub: "Tendance, plats forts, alertes",
    icon: TrendingUpIcon,
    prompt: "Résume mes ventes des 30 derniers jours",
  },
  {
    label: "Comparer mon best-seller au marché",
    sub: "Votre prix vs. la zone",
    icon: ArrowUpDownIcon,
    prompt: "Compare mon plat le plus vendu au marché local",
  },
  {
    label: "Gain des suggestions en attente",
    sub: "Impact marge estimé",
    icon: SparklesIcon,
    prompt: "Quel est le gain estimé si j'applique les suggestions de prix en attente ?",
  },
] as const;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = messages.length === 0 && !streamingContent;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, statusMessage]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const inputBox = (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/30">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez votre question…"
          disabled={busy}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm outline-none placeholder:text-muted-foreground/60",
            "min-h-[52px] max-h-[160px]",
          )}
        />
        <div className="flex items-center justify-end px-3 pb-3">
          <button
            type="button"
            onClick={onSend}
            disabled={busy || !input.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              input.trim() && !busy
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground/50 cursor-default",
            )}
          >
            {busy ? "Envoi…" : "Envoyer"}
            {!busy && <ArrowRightIcon className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] flex-col">
        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
          <div className="flex items-center gap-2">
            <Image
              src="/logo/restoOS-icon-1024.png"
              alt="RestoOs"
              width={64}
              height={64}
              className="size-16 object-contain"
              priority
            />
            <AssistantBetaBadge />
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Comment puis-je vous aider&nbsp;?</h1>
            <p className="max-w-md text-base text-muted-foreground">
              Posez une question sur vos prix, votre menu, vos ventes ou le marché.
              Les chiffres de votre compte sont injectés automatiquement.
            </p>
          </div>

          {/* Suggestion cards 2×2 */}
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {INITIAL_SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  type="button"
                  disabled={busy}
                  onClick={() => onChipSelect(s.prompt)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 text-left",
                    "transition-colors hover:border-primary/30 hover:bg-muted/30",
                    busy && "cursor-default opacity-50",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-snug">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input pinned at bottom */}
        <div className="mx-auto w-full max-w-2xl px-4 pb-6">
          {error ? (
            <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {inputBox}
        </div>
      </div>
    );
  }

  // ── Conversation state ─────────────────────────────────────────────────────
  return (
    <div className={cn("flex h-full min-h-0 flex-col", compact ? "gap-3" : "gap-4")}>
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1 pr-1"
      >
        {messages.map((m, i) => (
          <AssistantMessage key={`${m.role}-${i}`} role={m.role} content={m.content} refused={m.refused} />
        ))}
        {streamingContent !== null ? (
          <AssistantMessage role="assistant" content={streamingContent} streaming />
        ) : null}
        {busy && streamingContent === null ? <AssistantThinking message={statusMessage} /> : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {chips.length > 0 || followUps.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3">
          <AssistantSuggestionChips
            items={[...chips, ...followUps].slice(0, 3)}
            onSelect={onChipSelect}
            disabled={busy}
          />
        </div>
      ) : null}

      {inputBox}
    </div>
  );
}
