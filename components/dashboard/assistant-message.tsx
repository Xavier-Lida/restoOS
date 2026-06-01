"use client";

import { SparklesIcon } from "lucide-react";

import { renderAssistantMarkdown } from "@/lib/dashboard/assistant-markdown";
import { cn } from "@/lib/utils";

type AssistantMessageProps = {
  role: "user" | "assistant";
  content: string;
  refused?: boolean;
  streaming?: boolean;
};

export function AssistantMessage({ role, content, refused, streaming }: AssistantMessageProps) {
  if (role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="pr-1 text-[11px] text-muted-foreground/50">Vous</span>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-2.5 text-sm leading-relaxed text-foreground">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[92%] flex-col gap-2">
      {/* Avatar + label */}
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm shadow-primary/30">
          <SparklesIcon className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-xs font-medium text-foreground/60">Conseiller</span>
      </div>

      {/* Message card */}
      <div
        className={cn(
          "rounded-xl border px-4 py-3 text-sm leading-relaxed",
          refused
            ? "border-amber-500/30 bg-amber-500/5 text-foreground"
            : "border-border/60 bg-card text-foreground",
        )}
      >
        <div className="prose-sm whitespace-pre-wrap break-words">
          {renderAssistantMarkdown(content)}
          {streaming ? (
            <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-primary align-middle" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
