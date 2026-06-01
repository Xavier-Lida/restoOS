"use client";

import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AssistantSuggestionChipsProps = {
  items: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
  variant?: "default" | "followup";
  className?: string;
};

export function AssistantSuggestionChips({
  items,
  onSelect,
  disabled,
  variant = "default",
  className,
}: AssistantSuggestionChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className={cn(
            "flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-left text-xs transition-colors",
            variant === "followup"
              ? "border-border/50 bg-transparent text-foreground/70 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              : "border-border/50 bg-transparent text-foreground/70 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
            disabled && "cursor-default opacity-50",
          )}
        >
          <ArrowRightIcon className="size-3 shrink-0 text-primary" />
          <span>{item}</span>
        </button>
      ))}
    </div>
  );
}
