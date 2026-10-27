import { PROVIDER, PROVIDER_LABEL } from "@/gateway";

// Honest provider label, shown wherever AI output appears.
export default function ProviderBadge({ className = "" }) {
  const tone = PROVIDER === "mock" ? "border-amber-500/40 bg-amber-500/10 text-amber-800" : "border-border bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-spec text-[11px] uppercase ${tone} ${className}`} title="Which AI provider produced this">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {PROVIDER_LABEL}
    </span>
  );
}
