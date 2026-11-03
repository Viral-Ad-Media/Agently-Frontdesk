import { useState } from "react";
import { Check, RotateCcw, ChevronLeft, ChevronRight, MessageSquareReply, Pencil, RefreshCw, Send, Sparkles } from "lucide-react";
import { gateway } from "@/gateway";
import { useStore, setLeadMessage, editLeadMessage, moveLeadMessage, leadReply } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/quote";
import ProviderBadge from "@/components/shared/ProviderBadge";
import Panel from "@/components/frontdesk/Panel";

// Dead-lead reactivation: one personal re-opener per lead from its real history, opt-outs excluded and counted,
// owner approves and sends, a reply lands in the same thread, and a reply that books counts exactly once.
const PAGE = 8;
const STAGES = [
  ["all", "All"],
  ["new", "Not drafted"],
  ["review", "To review"],
  ["ready", "Ready to send"],
  ["sent", "Sent"],
  ["booked", "Booked"],
  ["optout", "Opted out"],
];
const stageOf = (l) => (l.optOut ? "optout" : l.recovered ? "booked" : l.message?.reply || l.message?.status === "sent" ? "sent" : l.message?.status === "approved" ? "ready" : l.message?.status === "draft" ? "review" : "new");

export default function ReactivationPanel({ tenant, className = "", delay = 0 }) {
  // Select the stable array, then filter: a selector that returns a fresh array re-renders forever.
  const allLeads = useStore((s) => s.leads);
  const leads = allLeads.filter((l) => l.tenantId === tenant.id && l.status === "dead");
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [stage, setStage] = useState("all");
  const [page, setPage] = useState(0);

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

  const counts = leads.reduce((acc, l) => ((acc[stageOf(l)] = (acc[stageOf(l)] || 0) + 1), acc), { all: leads.length });
  const filtered = stage === "all" ? leads : leads.filter((l) => stageOf(l) === stage);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = filtered.slice(p * PAGE, p * PAGE + PAGE);
  const pick = (k) => {
    setStage(k);
    setPage(0);
    setOpenId(null);
  };
  const go = (n) => {
    setPage(n);
    setOpenId(null);
  };

  return (
    <Panel
      title="Dead leads"
      icon={RotateCcw}
      tint="var(--ios-orange)"
      delay={delay}
      label="Dead-lead reactivation"
      className={className}
      meta={`${eligible.length} eligible, ${optedOut.length} opted out, ${recovered} recovered`}
      action={
        <button type="button" onClick={run} disabled={running || toDraft.length === 0} className="fd-btn-ink fd-btn-sm">
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.75} />}
          {running ? "Drafting…" : toDraft.length ? <><span className="sm:hidden">{`Draft (${toDraft.length})`}</span><span className="hidden sm:inline">{`Draft re-openers (${toDraft.length})`}</span></> : "All drafted"}
        </button>
      }
    >
      {lastRun && (
        <p className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/60 px-4 py-2 text-[13px]">
          <span>
            Drafted {lastRun.drafted} ({lastRun.generic} generic). Excluded {lastRun.excluded} opted-out lead{lastRun.excluded === 1 ? "" : "s"}. Nothing is sent until you approve it.
          </span>
          <ProviderBadge />
        </p>
      )}

      {leads.length === 0 ? (
        <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">No {tenant.trade === "medspa" ? "lapsed clients" : "old enquiries"} on file for this business yet.</p>
      ) : (
        <div>
          <div className="flex flex-wrap gap-1.5 border-b border-border p-3" role="tablist" aria-label="Filter dead leads">
            {STAGES.filter(([k]) => k === "all" || counts[k]).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={stage === k} onClick={() => pick(k)} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-all duration-300 ease-ios active:scale-95 ${stage === k ? "bg-foreground text-background shadow-sm" : "bg-secondary text-muted-foreground hover:bg-[hsl(240_9%_90%)] hover:text-foreground"}`}>
                {label} <span className="tabular-nums opacity-70">{counts[k] || 0}</span>
              </button>
            ))}
          </div>
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)_120px] gap-4 border-b border-border px-4 py-2 text-[12px] font-medium text-muted-foreground md:grid">
            <span>Name</span>
            <span>Service</span>
            <span>Last contact</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-border">
            {shown.map((l) => (
              <LeadRow key={l.id} lead={l} open={openId === l.id} onToggle={() => setOpenId(openId === l.id ? null : l.id)} />
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2">
              <p className="text-[13px] tabular-nums text-muted-foreground">
                {p * PAGE + 1}–{Math.min(filtered.length, p * PAGE + PAGE)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" disabled={p === 0} onClick={() => go(p - 1)} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-1 text-[13px] tabular-nums">{p + 1} / {pages}</span>
                <button type="button" disabled={p >= pages - 1} onClick={() => go(p + 1)} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
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
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-secondary/60 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)_120px] md:gap-4">
        <div className="min-w-0 md:contents">
          <p className={`truncate text-[14px] font-medium ${tone}`}>
            {lead.name} <span className="font-normal text-muted-foreground md:hidden">· {lead.serviceType}</span>
          </p>
          <p className="hidden truncate text-[14px] text-muted-foreground md:block">{lead.serviceType}</p>
          <p className="truncate text-[13px] text-muted-foreground md:text-[14px]">{lead.lastInteraction}</p>
        </div>
        <span className="md:flex md:justify-end">
          <span className={lead.recovered ? "fd-pill-ok" : status === "approved" ? "fd-pill-strong" : m?.reply || status === "sent" ? "fd-pill-accent" : "fd-pill-neutral"}>
            {lead.optOut ? "Opted out" : lead.recovered ? "Booked" : m?.reply ? "Replied" : status ? STATUS_LABEL[status] : "Not drafted"}
          </span>
        </span>
      </button>

      {open && !lead.optOut && (
        <div className="pop space-y-3 border-t border-border bg-secondary/50 px-4 py-4">
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
