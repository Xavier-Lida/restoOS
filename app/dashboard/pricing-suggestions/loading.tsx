export default function PricingSuggestionsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-pulse">
      <div className="h-10 w-64 rounded-md bg-muted" />
      <div className="h-32 rounded-lg border bg-muted/40" />
      <div className="h-48 rounded-lg border bg-muted/40" />
      <div className="h-64 rounded-lg border bg-muted/40" />
    </div>
  );
}
