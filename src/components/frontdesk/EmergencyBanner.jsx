import { AlertTriangle, PhoneCall } from "lucide-react";

// Shown the moment the assessment flags a genuine immediate danger. Make it safe before anything else.
export default function EmergencyBanner({ emergency }) {
  if (!emergency?.isEmergency) return null;
  const hotline = emergency.hotline || "911";
  return (
    <section className="rounded-lg border-2 border-destructive bg-destructive/5 p-5" role="alert">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="font-spec text-[11px] uppercase text-destructive">Safety first</p>
          <h3 className="text-lg">Make this safe before anything else</h3>
        </div>
      </div>
      {emergency.reason && <p className="mt-3 text-[15px]">{emergency.reason}</p>}
      {emergency.actions?.length > 0 && (
        <ol className="mt-3 space-y-1.5 text-[15px]">
          {emergency.actions.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-spec text-xs text-destructive">{String(i + 1).padStart(2, "0")}</span>
              {a}
            </li>
          ))}
        </ol>
      )}
      <a href={`tel:${hotline}`} className="fd-btn mt-4 bg-destructive text-destructive-foreground hover:opacity-90">
        <PhoneCall className="h-4 w-4" /> Call {hotline}
      </a>
    </section>
  );
}
