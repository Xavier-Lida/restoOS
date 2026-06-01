"use client";

import { Button } from "@/components/ui/button";
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
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <Button
          key={item}
          type="button"
          variant={variant === "followup" ? "outline" : "secondary"}
          size="sm"
          disabled={disabled}
          className="h-auto max-w-full whitespace-normal px-3 py-1.5 text-left text-xs font-normal"
          onClick={() => onSelect(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}
