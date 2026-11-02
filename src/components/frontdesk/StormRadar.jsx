import { useEffect, useState } from "react";
import { Check, MessageSquareReply, Pencil, RefreshCw, Send, Sparkles } from "lucide-react";
import { gateway } from "@/gateway";
import { useStore, startStormRun, setStormDraft, editStormDraft, moveStormDraft, moveAllStormDrafts, stormReply } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/quote";
import { fetchLiveStorms, rehearsalStorm, customersInStorm, stormWhen, leadArea } from "@/lib/storm";
import ProviderBadge from "@/components/shared/ProviderBadge";
import StormMap from "@/components/frontdesk/StormMap";
import Panel from "@/components/frontdesk/Panel";

const fmtClock = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "unknown");

// Storm Radar: live severe-weather alerts on a map with the roofer's customers. When a storm path covers
// customers, one tap drafts a personal check-in for each; opt-outs are excluded and counted; the owner
// approves and sends; a reply that books lands on the calendar carrying the storm for the claim pack.
export default function StormRadar({ tenant, className = "" }) {
  const allLeads = useStore((s) => s.leads);
  const runs = useStore((s) => s.stormRuns);
  const leads = allLeads.filter((l) => l.tenantId === tenant.id);
  const [live, setLive] = useState({ state: "loading", storms: [], at: null, error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [rehearsal] = useState(() => rehearsalStorm());

  const load = async () => {
    setLive((l) => ({ ...l, state: "loading", error: null }));
    try {
      const storms = await fetchLiveStorms("TX");
      setLive({ state: "ok", storms, at: new Date(), error: null });
    } catch (e) {
      setLive({ state: "error", storms: [], at: new Date(), error: e.message || "The weather service could not be reached." });
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const [mapH, setMapH] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 240 : 340));
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setMapH(mq.matches ? 240 : 340);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const options = [...live.storms.slice(0, 6), rehearsal];
  // Default: the first live storm that covers a customer, otherwise the rehearsal storm.
  const firstHit = live.storms.find((s) => customersInStorm(leads, s).hit.length > 0);
  const storm = options.find((s) => s.id === selectedId) || firstHit || rehearsal;
  const { hit, optedOut } = customersInStorm(leads, storm);
  const run = runs.find((r) => r.tenantId === tenant.id && r.storm.id === storm.id);
  const drafts = run ? run.drafts : {};
  const toDraft = hit.filter((l) => !drafts[l.id]);
  const draftList = hit.filter((l) => drafts[l.id]);
  const approvedCount = draftList.filter((l) => drafts[l.id].status === "approved").length;
  const draftCount = draftList.filter((l) => drafts[l.id].status === "draft").length;
  const sentCount = draftList.filter((l) => drafts[l.id].status === "sent").length;
  const booked = draftList.filter((l) => drafts[l.id].caseId).length;
  const isRehearsal = storm.source === "rehearsal";

  const draftAll = async () => {
    setDrafting(true);
    const runId = startStormRun({ tenantId: tenant.id, storm, leadIds: hit.map((l) => l.id), excludedIds: optedOut.map((l) => l.id) });
    for (let i = 0; i < toDraft.length; i += 4) {
      await Promise.all(
        toDraft.slice(i, i + 4).map(async (lead) => {
          try {
            const r = await gateway.reactivateMessage({ lead, tenant, storm: { event: storm.event, area: leadArea(lead), when: stormWhen(storm), hailIn: storm.hailIn, windMph: storm.windMph } });
            setStormDraft(runId, lead.id, { message: r.message, provider: r.providerLabel });
          } catch (e) {
            console.warn("storm check-in failed", lead.id, e);
          }
        })
      );
    }
    setDrafting(false);
  };

  return (
    <Panel
      title="Storm radar"
      className={className}
      meta={
        <>
          {live.state === "loading" && "Checking the National Weather Service for Texas…"}
          {live.state === "ok" && (live.storms.length ? `${live.storms.length} live storm alert${live.storms.length === 1 ? "" : "s"} with a path in Texas` : "No live storm warnings in Texas right now")}
          {live.state === "error" && `Live alerts unavailable: ${live.error}`}
          {live.at && ` · checked ${fmtClock(live.at)}`}
        </>
      }
      action={
        <button type="button" onClick={load} disabled={live.state === "loading"} className="fd-btn-outline fd-btn-sm">
          <RefreshCw className={`h-4 w-4 ${live.state === "loading" ? "animate-spin" : ""}`} strokeWidth={1.75} /> <span className="hidden sm:inline">Check now</span>
        </button>
      }
    >
      <div className="no-scrollbar flex gap-2 overflow-x-auto p-3" role="radiogroup" aria-label="Pick a storm">
        {options.map((s) => {
          const on = s.id === storm.id;
          const n = customersInStorm(leads, s).hit.length;
          return (
            <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setSelectedId(s.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors duration-150 ${on ? "border-foreground bg-background" : "border-border hover:border-foreground/40"}`}>
              <span className="block text-[12px] text-muted-foreground">{s.source === "rehearsal" ? "Rehearsal, not a real alert" : `Live · ${s.severity}`}</span>
              <span className="block max-w-[220px] truncate font-medium">{s.event}</span>
              <span className="block max-w-[220px] truncate text-muted-foreground">
                {s.source === "rehearsal" ? "Dallas-Fort Worth" : s.areaDesc.split(";").slice(0, 2).join(",")} · {n} customer{n === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-0 border-t border-border xl:grid-cols-[1.5fr_1fr]">
        <div className="p-3 xl:border-r xl:border-border">
          <StormMap leads={leads} storm={storm} height={mapH} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary-deep))]" /> In the path</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" /> Opted out</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/55" /> Outside</span>
            <span>Customer locations are approximate (synthetic demo addresses).</span>
          </div>
        </div>

        <div className="space-y-4 border-t border-border p-4 xl:border-t-0">
          <div>
            <p className="text-[12px] text-muted-foreground">{isRehearsal ? "Rehearsal storm · synthetic" : storm.sender}</p>
            <p className="mt-1 text-[15px] font-medium leading-snug">{storm.headline}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
              <div><dt className="text-muted-foreground">Hail</dt><dd className="tabular-nums">{storm.hailIn ? `${storm.hailIn} in` : "not reported"}</dd></div>
              <div><dt className="text-muted-foreground">Gusts</dt><dd className="tabular-nums">{storm.windMph ? `${storm.windMph} mph` : "not reported"}</dd></div>
              <div><dt className="text-muted-foreground">Started</dt><dd>{fmtWhen(storm.onset)}</dd></div>
              <div><dt className="text-muted-foreground">Until</dt><dd>{fmtWhen(storm.ends)}</dd></div>
            </dl>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                ["In the path", hit.length],
                ["Opted out", optedOut.length],
                ["Booked", booked],
              ].map(([label, n]) => (
                <div key={label} className="px-3 first:pl-0">
                  <p className="font-heading text-[26px] font-semibold leading-none tabular-nums">{n}</p>
                  <p className="mt-1 truncate text-[12px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={draftAll} disabled={drafting || toDraft.length === 0} className="fd-btn-primary mt-4 w-full justify-center">
              {drafting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.75} />}
              {drafting ? "Drafting check-ins…" : toDraft.length ? `Draft storm check-ins (${toDraft.length})` : hit.length ? "All check-ins drafted" : "No customers in this path"}
            </button>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {optedOut.length ? `${optedOut.length} opted-out ${optedOut.length === 1 ? "person is" : "people are"} in the path and will never be contacted. ` : ""}
              Nothing is sent until you approve it.
            </p>
          </div>
        </div>
      </div>

      {draftList.length > 0 && (
        <div className="border-t border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex flex-wrap items-center gap-2 text-[14px]">
              {draftList.length} check-ins · {draftCount} to review · {approvedCount} approved · {sentCount} sent <ProviderBadge />
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!draftCount} onClick={() => moveAllStormDrafts(run.id, "draft", "approved")} className="fd-btn-outline fd-btn-sm">
                <Check className="h-4 w-4" /> Approve all ({draftCount})
              </button>
              <button type="button" disabled={!approvedCount} onClick={() => moveAllStormDrafts(run.id, "approved", "sent")} className="fd-btn-ink fd-btn-sm">
                <Send className="h-4 w-4" /> Send approved ({approvedCount})
              </button>
            </div>
          </div>
          <ul className="mt-3 max-h-[520px] divide-y divide-border overflow-y-auto pr-1">
            {draftList.map((l) => (
              <CheckinRow key={l.id} runId={run.id} lead={l} d={drafts[l.id]} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function CheckinRow({ runId, lead, d }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(d.text);
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium">
            {lead.name} <span className="font-normal text-muted-foreground">· {leadArea(lead)} · {lead.status === "active" ? "customer" : "old enquiry"}</span>
          </p>
          {!editing && <p className="mt-1 text-[14px]">{d.text}</p>}
        </div>
        <span className={d.caseId ? "fd-pill-ok" : d.status === "approved" ? "fd-pill-strong" : d.reply || d.status === "sent" ? "fd-pill-accent" : "fd-pill-neutral"}>{d.caseId ? "Booked" : d.reply ? "Replied" : STATUS_LABEL[d.status]}</span>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card p-3 text-[15px] outline-none focus:border-foreground" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { editStormDraft(runId, lead.id, text); setEditing(false); }} className="fd-btn-primary fd-btn-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="fd-btn-outline fd-btn-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {d.status !== "sent" && (
            <>
              <button type="button" disabled={d.status !== "draft"} onClick={() => moveStormDraft(runId, lead.id, "approved")} className="fd-btn-outline fd-btn-sm"><Check className="h-4 w-4" /> Approve</button>
              <button type="button" onClick={() => { setText(d.text); setEditing(true); }} className="fd-btn-outline fd-btn-sm"><Pencil className="h-4 w-4" /> Edit</button>
              <button type="button" disabled={d.status !== "approved"} onClick={() => moveStormDraft(runId, lead.id, "sent")} className="fd-btn-ink fd-btn-sm"><Send className="h-4 w-4" /> Send</button>
            </>
          )}
          {d.status === "sent" && !d.reply && (
            <>
              <span className="basis-full text-[12px] font-medium text-muted-foreground">Demo control · play the reply</span>
              <button type="button" onClick={() => stormReply(runId, lead.id, "YES please, can someone come look at it?", { books: true })} className="fd-btn-outline fd-btn-sm"><MessageSquareReply className="h-4 w-4" /> "YES"</button>
              <button type="button" onClick={() => stormReply(runId, lead.id, "We're fine, thanks for checking.")} className="fd-btn-outline fd-btn-sm">"We're fine"</button>
            </>
          )}
        </div>
      )}
      {d.reply && (
        <p className="mt-2 rounded-lg bg-secondary p-3 text-[14px]">
          <span className="font-medium text-muted-foreground">Reply · </span>
          {d.reply.text}
          {d.caseId && <span className="mt-1 block text-[13px] text-[hsl(var(--primary-deep))]">Booked into the next open inspection. The storm is on the case for the claim pack.</span>}
        </p>
      )}
    </li>
  );
}
