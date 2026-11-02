import { CalendarCheck, FileText, History, CloudLightning, Building2, ShieldAlert } from "lucide-react";

const ICON = { check_calendar: CalendarCheck, rate_card: FileText, customer_history: History, storm_reports: CloudLightning, business_facts: Building2 };

// Under a desk reply in the customer chat: what the desk looked up before answering. Shown only when it
// actually used a tool, so ordinary qualifying questions stay clean.
export default function AgentChecks({ trace }) {
  const used = (trace?.steps || []).filter((s) => s.tool);
  if (!used.length && trace?.grounded !== false) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="What the desk checked">
      {used.map((s, i) => {
        const Icon = ICON[s.tool] || FileText;
        return (
          <span key={i} className="fd-pill-neutral">
            <Icon className="h-3.5 w-3.5" /> {s.label}
          </span>
        );
      })}
      {trace?.grounded === false && (
        <span className="fd-pill bg-[hsl(var(--ios-orange)/0.16)] text-[hsl(var(--ios-orange))]">
          <ShieldAlert className="h-3.5 w-3.5" /> Held back an unproven detail
        </span>
      )}
    </div>
  );
}
