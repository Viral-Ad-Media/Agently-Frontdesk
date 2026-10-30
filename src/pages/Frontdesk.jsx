import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, MessageSquare, Pencil, RefreshCw, Send, X } from "lucide-react";
import { useStore, moveQuote, editQuoteRange, cancelBooking, resetDemo, setActiveTenant, correctOutline } from "@/lib/store";
import { clearGatewayCache } from "@/gateway";
import { STATUS_LABEL } from "@/lib/quote";
import Logo from "@/components/shared/Logo";
import ProviderBadge from "@/components/shared/ProviderBadge";
import OutlinedPhoto from "@/components/frontdesk/OutlinedPhoto";
import Severity from "@/components/frontdesk/Severity";
import AssessmentCard from "@/components/frontdesk/AssessmentCard";
import ReactivationPanel from "@/components/frontdesk/ReactivationPanel";
import CallPanel from "@/components/frontdesk/CallPanel";
import DailySummary from "@/components/frontdesk/DailySummary";
import ReportButton from "@/components/frontdesk/ReportButton";
import OutlineEditor from "@/components/frontdesk/OutlineEditor";
import { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// The owner's one screen: three numbers, lead cards with one-tap approve / edit / send, the calendar, and reactivation.
export default function Frontdesk() {
  const { cases: allCases, slots: allSlots, tenant, tenants, leads } = useStore();
  const [openId, setOpenId] = useState(null);
  const cases = allCases.filter((c) => c.tenantId === tenant.id);
  const slots = allSlots.filter((s) => s.tenantId === tenant.id);
  const spa = tenant.trade === "medspa";

  const answered = cases.filter((c) => c.messages.some((m) => m.role === "assistant")).length;
  const booked = cases.filter((c) => c.bookingSlotId).length;
  const reactivated = leads.filter((l) => l.tenantId === tenant.id && l.recovered).length;
  const schedule = slots
    .filter((s) => s.caseId)
    .map((s) => ({ ...s, case: allCases.find((c) => c.id === s.caseId) }))
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
          <Logo word={tenant.name} />
          <div className="flex items-center gap-2">
            <ProviderBadge className="hidden sm:inline-flex" />
            <label className="hidden items-center gap-2 text-[13px] text-muted-foreground sm:flex">
              Tenant
              <select value={tenant.id} onChange={(e) => setActiveTenant(e.target.value)} className="h-9 rounded-xl border border-border bg-card px-2 text-[13px] text-foreground outline-none focus:border-foreground" aria-label="Switch demo tenant">
                {Object.values(tenants).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.trade === "medspa" ? "med spa" : t.trade}
                  </option>
                ))}
              </select>
            </label>
            <Link to={`/chat?tenant=${tenant.id}`} className="fd-btn-outline h-9 px-3 text-[13px]">
              <MessageSquare className="h-4 w-4" /> Customer view
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl">Today at the desk</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">{tenant.name} · {spa ? "med spa" : "roofing"}</p>
          </div>
          <button type="button" onClick={() => window.confirm("Clear every demo case, booking and re-opener and start fresh? (Cached AI results are kept so re-runs stay free; hold Shift to clear those too.)") && (resetDemo(), window.event?.shiftKey && clearGatewayCache())} className="fd-btn-outline h-9 px-3 text-[13px] text-muted-foreground">
            <RefreshCw className="h-4 w-4" /> Reset demo data
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Enquiries answered", answered],
            [spa ? "Consultations booked" : "Appointments booked", booked],
            [spa ? "Clients reactivated" : "Jobs reactivated", reactivated],
          ].map(([label, n]) => (
            <div key={label} className="border-t border-border pt-3">
              <p className="font-heading text-4xl tabular-nums">{n}</p>
              <p className="mt-1 text-[14px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <DailySummary tenant={tenant} cases={cases} slots={slots} leads={leads.filter((l) => l.tenantId === tenant.id)} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="text-lg">Leads <span className="text-muted-foreground">· newest first</span></h2>
            <div className="mt-4 space-y-4">
              {cases.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-6 text-[15px] text-muted-foreground">
                  No enquiries yet. Open the{" "}
                  <Link to={`/chat?tenant=${tenant.id}`} className="text-primary underline">
                    customer view
                  </Link>{" "}
                  and start a case to see a lead land here.
                </p>
              )}
              {cases.map((c) => (
                <LeadCard key={c.id} c={c} tenant={tenant} slot={c.bookingSlotId ? slots.find((s) => s.id === c.bookingSlotId) : null} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} />
              ))}
            </div>
          </section>

          <div className="space-y-10">
            <section>
              <h2 className="text-lg">Calendar <span className="text-muted-foreground">· {tenant.words.visit}s</span></h2>
              <div className="mt-4 space-y-3">
                {schedule.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-[15px] text-muted-foreground">Nothing booked yet. A booking made in chat appears here instantly.</p>}
                {schedule.map((s) => (
                  <div key={s.id} className="fd-card flex gap-4 p-4">
                    <div className="shrink-0 border-r border-border pr-4 text-center">
                      <p className="font-heading text-2xl leading-none">{new Date(s.start).getDate()}</p>
                      <p className="mt-1 font-spec text-[10px] uppercase text-muted-foreground">{new Date(s.start).toLocaleDateString("en-US", { month: "short" })}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px]">
                        {fmtTime(s.start)}–{fmtTime(s.end)} · {s.case?.customer?.name || (spa ? "Client" : "Homeowner")}
                      </p>
                      <p className="truncate text-[14px] text-muted-foreground">{spa ? s.case?.description || "Consultation" : s.case?.customer?.address || "Address unknown"}</p>
                      <p className="mt-1 font-spec text-[11px] uppercase text-muted-foreground">
                        {s.case?.source === "reactivation" ? "Reactivated lead" : s.case?.assessment?.failedPart || "Assessment pending"}
                      </p>
                    </div>
                    <button type="button" onClick={() => cancelBooking(s.caseId)} aria-label="Cancel booking" className="self-start text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <p className="text-[12px] text-muted-foreground">Slots offered in chat and this list read the same calendar. A taken slot is never offered twice.</p>
              </div>
            </section>

            <CallPanel tenant={tenant} />
            <ReactivationPanel tenant={tenant} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadCard({ c, tenant, slot, open, onToggle }) {
  const [editing, setEditing] = useState(false);
  const [outlining, setOutlining] = useState(false);
  const [low, setLow] = useState(c.quote?.low ?? "");
  const [high, setHigh] = useState(c.quote?.high ?? "");
  const q = c.quote;
  const status = q?.status;
  const spa = tenant.trade === "medspa";
  const canApprove = q && q.low !== null && (status === "draft" || status === "awaiting_approval");
  const canSend = q && status === "approved";

  const save = () => {
    const l = Number(low);
    const h = Number(high);
    if (!(l > 0) || !(h >= l)) return;
    editQuoteRange(c.id, l, h);
    setEditing(false);
  };

  return (
    <article className="fd-card overflow-hidden">
      <div className="flex gap-4 p-4">
        {c.photo ? (
          <OutlinedPhoto src={c.photo.dataUrl} segmentation={c.segmentation} className="h-24 w-32 shrink-0 [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>span]:hidden" showReference={false} />
        ) : (
          <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-secondary px-2 text-center font-spec text-[11px] uppercase text-muted-foreground">{c.source === "reactivation" ? "From a re-opener" : c.source === "call" ? "Phone call" : "No photo yet"}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {c.assessment ? <Severity value={c.assessment.severity} spa={spa} /> : <span className="rounded-full border border-border px-2.5 py-1 font-spec text-[11px] uppercase text-muted-foreground">{c.source === "reactivation" ? "Reactivated" : c.source === "call" ? "Phone call · needs photo" : "In conversation"}</span>}
            {q && <span className="rounded-full border border-border px-2.5 py-1 font-spec text-[11px] uppercase">{STATUS_LABEL[status]}</span>}
            {spa && c.consent && <span className="rounded-full border border-border px-2.5 py-1 font-spec text-[11px] uppercase text-muted-foreground">Photo consent</span>}
            <span className="ml-auto font-spec text-[11px] uppercase text-muted-foreground">{new Date(c.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <h3 className="mt-2 truncate text-lg">
            {c.customer.name || (spa ? "Client" : "Homeowner")}
            {c.customer.address && !spa ? ` · ${c.customer.address}` : ""}
          </h3>
          <p className="truncate text-[14px] text-muted-foreground">{c.assessment?.failedPart || c.description || "Waiting for the customer's description."}</p>
          {q && (
            <p className="mt-1 text-[15px]">
              {q.low !== null ? (
                <>
                  Draft {money(q.low)} – {money(q.high)} <span className="text-muted-foreground">· confidence {Math.round((c.assessment?.confidence || 0) * 100)}%</span>
                </>
              ) : (
                <span className="text-[hsl(var(--primary-deep))]">{q.reason || (spa ? "No published match: clinician advises at consultation." : "No total yet. Enter the range after the inspection.")}</span>
              )}
            </p>
          )}
          {slot && (
            <p className="mt-1 font-spec text-[11px] uppercase text-muted-foreground">
              {tenant.words.visit} {fmtDay(slot.start)} {fmtTime(slot.start)}
            </p>
          )}
        </div>
      </div>

      {q && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3">
          {!editing ? (
            <>
              <button type="button" disabled={!canApprove} onClick={() => moveQuote(c.id, "approved")} className="fd-btn-primary">
                <Check className="h-4 w-4" /> Approve
              </button>
              <button type="button" disabled={status === "sent"} onClick={() => setEditing(true)} className="fd-btn-outline">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button type="button" disabled={!canSend} onClick={() => moveQuote(c.id, "sent")} className="fd-btn-ink">
                <Send className="h-4 w-4" /> Send
              </button>
              <ReportButton c={c} tenant={tenant} />
              {status === "sent" && <span className="text-[13px] text-muted-foreground">Sent. The customer's chat shows the confirmed range.</span>}
              {status === "awaiting_approval" && <span className="text-[13px] text-muted-foreground">{q.low === null ? "Customer booked. Enter a range with Edit, then approve and send it." : spa ? "Client booked. Clinician approves the plan, then sends it." : "Customer booked. Approve the range, then send it."}</span>}
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-[14px]">
                Low $<input value={low} onChange={(e) => setLow(e.target.value)} inputMode="numeric" className="h-10 w-24 rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground" />
              </label>
              <label className="flex items-center gap-2 text-[14px]">
                High $<input value={high} onChange={(e) => setHigh(e.target.value)} inputMode="numeric" className="h-10 w-24 rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground" />
              </label>
              <button type="button" onClick={save} className="fd-btn-primary">Save range</button>
              <button type="button" onClick={() => setEditing(false)} className="fd-btn-outline">Cancel</button>
            </>
          )}
          <button type="button" onClick={onToggle} className="ml-auto text-[13px] text-muted-foreground underline-offset-2 hover:underline">
            {open ? "Hide assessment" : "Show assessment"}
          </button>
        </div>
      )}

      {open && c.assessment && (
        <div className="space-y-4 border-t border-border p-4">
          {c.photo && c.segmentation && status !== "sent" && (
            <div className="flex flex-wrap items-center gap-2">
              {!outlining && (
                <button type="button" onClick={() => setOutlining(true)} className="fd-btn-outline">
                  {c.segmentation.regions?.length ? "Correct the outline" : "Draw the outline"}
                </button>
              )}
              {c.segmentation.correctedByOwner && <span className="font-spec text-[11px] uppercase text-muted-foreground">Outline corrected by the {tenant.words.approver}</span>}
            </div>
          )}
          {outlining ? (
            <OutlineEditor photo={c.photo.dataUrl} segmentation={c.segmentation} onSave={(poly) => { correctOutline(c.id, poly); setOutlining(false); }} onCancel={() => setOutlining(false)} />
          ) : (
            <AssessmentCard photo={c.photo?.dataUrl} segmentation={c.segmentation} measurement={c.measurement} assessment={c.assessment} quote={c.quote} tenant={tenant} flat />
          )}
        </div>
      )}
    </article>
  );
}
