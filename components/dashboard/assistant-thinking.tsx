"use client";

import { Loader2 } from "lucide-react";

type AssistantThinkingProps = {
  message: string | null;
};

export function AssistantThinking({ message }: AssistantThinkingProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
      <span className="animate-pulse">{message}</span>
    </div>
  );
}
