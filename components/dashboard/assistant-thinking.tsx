"use client";

import { SparklesIcon } from "lucide-react";

type AssistantThinkingProps = {
  message: string | null;
};

export function AssistantThinking({ message }: AssistantThinkingProps) {
  if (!message) return null;

  return (
    <div className="flex max-w-[92%] flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm shadow-primary/30">
          <SparklesIcon className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-xs font-medium text-foreground/60">Conseiller</span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
        <span className="flex gap-1">
          <span className="inline-block size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
          <span className="inline-block size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
          <span className="inline-block size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
        </span>
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}
