import { Brain, CheckCircle2, ShieldAlert } from "lucide-react";
import { CAPABILITY_MODEL } from "@/gateway";

const summary = (tool, r) => {
  if (!r) return "";
  if (tool === "check_calendar") return r.open?.length ? r.open.map((s) => `${s.day} ${s.time}`).join(", ") : "no open slot";
  if (tool === "rate_card") return r.services ? r.services.map((s) => `${s.name} $${s.from}-${s.to}`).join(", ") : r.published ? `${Object.entries(r.materialsPerM2 || {}).map(([k, v]) => `${k} $${v}/m²`).join(", ")}; labour $${r.labourPerHour}/h` : "no published rates";
  if (tool === "business_facts") return [r.serviceArea, r.firstVisit, ...(r.facts || [])].filter(Boolean).join(" · ") || "nothing on record";
  if (tool === "customer_history") return r.earlier?.length ? `${r.earlier.length} earlier enquiry` : r.addressKnown ? "none for this address" : "address not known yet";
  if (tool === "storm_reports") return r.reports?.length ? `${r.reports.length} report(s)` : "none on record";
  return "";
};

// Owner view: for each customer turn where the desk looked something up, its plan, each tool it called
// with what came back, and whether the answer passed the grounding check (proven facts only).
export default function AgentTrace({ c }) {
  const turns = [];
  c.messages.forEach((m, i) => {
    if (m.role !== "assistant" || !m.trace?.steps?.some((s) => s.tool || s.label === "Grounding check failed")) return;
    const asked = [...c.messages.slice(0, i)].reverse().find((x) => x.role === "user")?.content;
    turns.push({ asked, reply: m.content, trace: m.trace });
  });
  if (!turns.length) return null;
  return (
    <section aria-label="How the desk answered" className="overflow-hidden rounded-lg border border-border">
      <header className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
        <Brain className="h-4 w-4 text-[hsl(var(--primary))]" />
        <h4 className="text-[15px] font-semibold">How the desk answered</h4>
        <span className="ml-auto text-[12px] text-muted-foreground">{CAPABILITY_MODEL.agentStep} · plan, look up, answer</span>
      </header>
      <ol className="divide-y divide-border bg-card">
        {turns.map((t, n) => (
          <li key={n} className="space-y-2 px-4 py-3 text-[13px]">
            <p>
              <span className="text-muted-foreground">Customer asked:</span> <span className="font-medium">“{t.asked}”</span>
            </p>
            <ol className="space-y-1.5 border-l border-border pl-3">
              {t.trace.steps.map((s, k) => (
                <li key={k}>
                  <span className="font-medium">{s.label}</span>
                  {s.thought && <span className="text-muted-foreground">: {s.thought}</span>}
                  {s.tool && <span className="block text-[12px] text-muted-foreground">Found: {summary(s.tool, s.result)}</span>}
                </li>
              ))}
            </ol>
            <p className="flex items-center gap-1.5">
              {t.trace.grounded ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ios-green))]" /> Every time and price in the reply came from a lookup.
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-[hsl(var(--ios-orange))]" /> A detail no lookup proved was held back.
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
