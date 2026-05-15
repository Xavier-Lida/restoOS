import { cn } from "@/lib/utils";

type ProfileChoiceCardProps = {
  value: string;
  title: string;
  subtitle: string;
  guidance: string;
  checked: boolean;
  /** Affichage lecture seule (ex. assistant une carte à la fois). */
  presentationOnly?: boolean;
};

export function ProfileChoiceCard({
  value,
  title,
  subtitle,
  guidance,
  checked,
  presentationOnly,
}: ProfileChoiceCardProps) {
  if (presentationOnly) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border p-4 transition",
          checked ? "border-primary bg-primary/10" : "border-border bg-muted/40",
        )}
      >
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="text-sm">{guidance}</p>
      </div>
    );
  }

  return (
    <label
      htmlFor={`profile-${value}`}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition",
        checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        <input
          id={`profile-${value}`}
          name="dominant_profile"
          type="radio"
          value={value}
          defaultChecked={checked}
          className="size-4"
        />
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <p className="text-sm">{guidance}</p>
    </label>
  );
}
