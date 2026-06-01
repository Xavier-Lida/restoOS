"use client";

import { renderAssistantMarkdown } from "@/lib/dashboard/assistant-markdown";
import { cn } from "@/lib/utils";

type AssistantMessageProps = {
  role: "user" | "assistant";
  content: string;
  refused?: boolean;
  streaming?: boolean;
};

export function AssistantMessage({ role, content, refused, streaming }: AssistantMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "max-w-full rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
        isUser
          ? "ml-auto max-w-[92%] bg-muted text-foreground"
          : refused
            ? "mr-auto max-w-[92%] border border-amber-500/30 bg-amber-500/5 text-foreground"
            : "mr-auto max-w-[92%] border border-border/80 bg-background text-foreground",
      )}
    >
      <div className="whitespace-pre-wrap break-words">
        {isUser ? content : renderAssistantMarkdown(content)}
        {streaming ? <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" /> : null}
      </div>
    </div>
  );
}
