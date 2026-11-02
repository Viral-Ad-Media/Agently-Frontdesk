import { useState } from "react";
import { Check, ChevronDown, MessageSquareReply, Pencil, RefreshCw, Send, Sparkles } from "lucide-react";
import { gateway } from "@/gateway";
import { useStore, setLeadMessage, editLeadMessage, moveLeadMessage, leadReply } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/quote";
import ProviderBadge from "@/components/shared/ProviderBadge";

// Dead-lead reactivation: one personal re-opener per lead from its real history, opt-outs excluded and counted,
// owner approves and sends, a reply lands in the same thread, and a reply that books counts exactly once.
const CAP = 6;

export default function ReactivationPanel({ tenant }) {
  // Select the stable array, then filter: a selector that returns a fresh array re-renders forever.
  const allLeads = useStore((s) => s.leads);
  const leads = allLeads.filter((l) => l.tenantId === tenant.id && l.status === "dead");
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const optedOut = leads.filter((l) => l.optOut);
  const eligible = leads.filter((l) => !l.optOut);
  const toDraft = eligible.filter((l) => !l.message);
  const recovered = leads.filter((l) => l.recovered).length;

  const run = async () => {
    setRunning(true);
    let drafted = 0;
    let generic = 0;
    // Four at a time: fast on a real provider, gentle on its rate limits.
    for (let i = 0; i < toDraft.length; i += 4) {
      await Promise.all(
        toDraft.slice(i, i + 4).map(async (lead) => {
          try {
            const r = await gateway.reactivateMessage({ lead, tenant });
            setLeadMessage(lead.id, { message: r.message, generic: r.generic, provider: r.providerLabel });
            drafted++;
            if (r.generic) generic++;
          } catch (e) {
            console.warn("reactivateMessage failed", lead.id, e);
          }
        })
      );
    }
    setLastRun({ drafted, generic, excluded: optedOut.length, at: new Date() });
    setRunning(false);
  };

  const shown = showAll ? leads : leads.slice(0, CAP);

  return (
    <section aria-label="Dead-lead reactivation">
      <div className="fd-section-head">
        <div className="min-w-0">
          <h2 className="fd-section-title">Dead leads</h2>
          <p className="fd-section-meta mt-0.5">
            {eligible.length} eligible, {optedOut.length} opted out, {recovered} recovered
          </p>
        </div>
        <button type="button" onClick={run} disabled={running || toDraft.length === 0} className="fd-btn-ink fd-btn-sm">
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.75} />}
          {running ? "Drafting…" : toDraft.length ? `Draft re-openers (${toDraft.length})` : "All drafted"}
        </button>
      </div>
      {lastRun && (
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-[13px]">
          <span>
            Drafted {lastRun.drafted} ({lastRun.generic} generic). Excluded {lastRun.excluded} opted out. Nothing is sent until you approve it.
          </span>
          <ProviderBadge />
        </p>
      )}

      {leads.length === 0 ? (
        <p className="fd-empty">No {tenant.trade === "medspa" ? "lapsed clients" : "old enquiries"} on file for this business yet.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {shown.map((l) => (
              <LeadRow key={l.id} lead={l} open={openId === l.id} onToggle={() => setOpenId(openId === l.id ? null : l.id)} />
            ))}
          </ul>
          {leads.length > CAP && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="flex h-11 w-full items-center justify-center gap-1 border-t border-border text-[13px] font-medium text-muted-foreground hover:text-foreground">
              {showAll ? "Show fewer" : `Show all ${leads.length}`} <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function LeadRow({ lead, open, onToggle }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(lead.message?.text || "");
  const m = lead.message;
  const status = m?.status;

  const tone = lead.optOut ? "text-muted-foreground line-through" : "";
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-secondary/50">
        <div className="min-w-0">
          <p className={`truncate text-[14px] font-medium ${tone}`}>
            {lead.name} <span className="font-normal text-muted-foreground">· {lead.serviceType}</span>
          </p>
          <p className="truncate text-[13px] text-muted-foreground">{lead.lastInteraction}</p>
        </div>
        <span className={lead.recovered ? "fd-pill-ok" : status === "approved" ? "fd-pill-strong" : m?.reply || status === "sent" ? "fd-pill-accent" : "fd-pill-neutral"}>
          {lead.optOut ? "Opted out" : lead.recovered ? "Booked" : m?.reply ? "Replied" : status ? STATUS_LABEL[status] : "Not drafted"}
        </span>
      </button>

      {open && !lead.optOut && (
        <div className="space-y-3 border-t border-border bg-background px-4 py-4">
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">History</span> · {lead.history.map((h) => `${h.when}: ${h.topic}`).join(" · ")}
            {lead.previousQuote ? ` · previous quote $${lead.previousQuote}` : ""}
          </p>
          {!m ? (
            <p className="text-[14px] text-muted-foreground">No re-opener drafted yet. Run "Draft re-openers" above.</p>
          ) : editing ? (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card p-3 text-[15px] outline-none focus:border-foreground" />
              <div className="flex gap-2">
                <button type="button" onClick={() => { editLeadMessage(lead.id, text); setEditing(false); }} className="fd-btn-primary fd-btn-sm">Save</button>
                <button type="button" onClick={() => setEditing(false)} className="fd-btn-outline fd-btn-sm">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[15px]">{m.text}</p>
              <p className="text-[12px] text-muted-foreground">
                {m.generic ? "Generic re-opener (no usable history)" : "Personal, from this lead's history"} · {m.provider}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={status !== "draft"} onClick={() => moveLeadMessage(lead.id, "approved")} className="fd-btn-primary fd-btn-sm">
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button type="button" disabled={status === "sent"} onClick={() => { setText(m.text); setEditing(true); }} className="fd-btn-outline fd-btn-sm">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button type="button" disabled={status !== "approved"} onClick={() => moveLeadMessage(lead.id, "sent")} className="fd-btn-ink fd-btn-sm">
                  <Send className="h-4 w-4" /> Send
                </button>
              </div>
              {status === "sent" && !m.reply && (
                <div className="rounded-lg border border-dashed border-border p-3">
                  <p className="text-[12px] font-medium text-muted-foreground">Demo control · play the lead's reply</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => leadReply(lead.id, "Yes please, can you come and take a look this week?", { books: true })} className="fd-btn-outline fd-btn-sm">
                      <MessageSquareReply className="h-4 w-4" /> Reply: "Yes, book me in"
                    </button>
                    <button type="button" onClick={() => leadReply(lead.id, "Not right now, thanks.", { books: false })} className="fd-btn-outline fd-btn-sm">
                      Reply: "Not now"
                    </button>
                  </div>
                </div>
              )}
              {m.reply && (
                <div className="rounded-lg bg-secondary p-3 text-[14px]">
                  <span className="font-medium text-muted-foreground">Reply · </span>
                  {m.reply.text}
                  {lead.recovered && <span className="block mt-1 text-[13px] text-[hsl(var(--primary-deep))]">Booked into the next open slot. Counted once as a recovered job.</span>}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {open && lead.optOut && <p className="border-t border-border px-4 py-3 text-[14px] text-muted-foreground">This person asked for no further contact. They are never drafted, counted here only as excluded.</p>}
    </li>
  );
}
