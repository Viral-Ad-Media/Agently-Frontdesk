import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, FlaskConical, CircleCheck, Inbox, MessageCircle, Sparkles, ChevronDown, CloudLightning, FileText, MessageSquare, Phone, Plus, Pencil, RefreshCw, Send, X } from "lucide-react";
import { useStore, moveQuote, rejectQuote, editQuoteRange, cancelBooking, resetDemo, setActiveTenant, correctOutline } from "@/lib/store";
import { jobStatus } from "@/lib/verify";
import VerificationPanel, { VerifyPill } from "@/components/frontdesk/VerificationPanel";
import AgentTrace from "@/components/frontdesk/AgentTrace";
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
import StormRadar from "@/components/frontdesk/StormRadar";
import { BeforeAfter } from "@/components/frontdesk/RepairPreview";
import Panel from "@/components/frontdesk/Panel";
import DeskAssistant from "@/components/frontdesk/DeskAssistant";
import { stormForCase, weatherFor } from "@/lib/storm";
import { tradeProfile, tradeLabel } from "@/config/trades";
import { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// The owner's one screen (Taste app-screen rules): a compact top bar with the business as scope, a noun title
// with the day in one sentence, the three numbers as one divided strip, then the work as one 12-column grid of
// cards with equal gaps: leads | calendar, storm radar | calls, then dead leads full width. Cards in a row share edges.
export default function Frontdesk() {
  const { cases: allCases, slots: allSlots, tenant, tenants, leads } = useStore();
  const [openId, setOpenId] = useState(null);
  const cases = allCases.filter((c) => c.tenantId === tenant.id);
  const slots = allSlots.filter((s) => s.tenantId === tenant.id);
  const spa = tenant.trade === "medspa";
  const prof = tradeProfile(tenant.trade);
  const people = prof.personPhoto;
  const visitWord = spa ? "consultation" : tenant.trade === "roofing" ? "inspection" : tenant.words?.visit || "visit";
  const tenantLeads = leads.filter((l) => l.tenantId === tenant.id);

  const answered = cases.filter((c) => c.messages.some((m) => m.role === "assistant")).length;
  const booked = cases.filter((c) => c.bookingSlotId).length;
  const reactivated = tenantLeads.filter((l) => l.recovered).length;
  const waiting = cases.filter((c) => c.quote && (c.quote.status === "awaiting_approval" || c.quote.status === "approved")).length;
  const schedule = slots
    .filter((s) => s.caseId)
    .map((s) => ({ ...s, case: allCases.find((c) => c.id === s.caseId) }))
    .sort((a, b) => a.start.localeCompare(b.start));

  // Two taps instead of a browser confirm box: confirm boxes are blocked or auto-dismissed in some browsers and
  // test tools, which made Reset look like it did nothing.
  const [resetStep, setResetStep] = useState("idle"); // idle | confirm | done
  const [epoch, setEpoch] = useState(0); // remounts every panel on reset, so no panel keeps old drafts in memory
  useEffect(() => {
    if (resetStep === "idle") return undefined;
    const t = setTimeout(() => setResetStep("idle"), resetStep === "confirm" ? 4000 : 2500);
    return () => clearTimeout(t);
  }, [resetStep]);
  const reset = () => {
    if (resetStep !== "confirm") return setResetStep("confirm");
    resetDemo();
    clearGatewayCache();
    setOpenId(null);
    setEpoch((n) => n + 1);
    setResetStep("done");
  };

  return (
    <div key={epoch} className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-20 border-b border-white/[0.08]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 md:gap-3 md:px-8">
          <Logo showWord={false} word={tenant.name} />
          <label className="relative min-w-0">
            <span className="sr-only">Business</span>
            <select value={tenant.id} onChange={(e) => setActiveTenant(e.target.value)} className="h-10 max-w-[180px] cursor-pointer appearance-none truncate rounded-lg bg-transparent pl-1 pr-7 text-[15px] font-semibold text-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[320px]">
              {Object.values(tenants).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <ProviderBadge className="hidden md:inline-flex" />
            <Link to="/setup" className="fd-btn-outline fd-btn-sm w-10 px-0 sm:w-auto sm:px-3" aria-label="Add a business">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add a business</span>
            </Link>
            <Link to={`/chat?tenant=${tenant.id}`} className="fd-btn-ink fd-btn-sm w-10 px-0 sm:w-auto sm:px-3" aria-label="Customer view">
              <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Customer view</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 md:px-8 md:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="mt-0.5 text-[34px] font-bold leading-[1.1] tracking-[-0.03em]">Today</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {tenant.name} · {tradeLabel(tenant.trade).toLowerCase()}
              {tenant.serviceArea ? ` · ${tenant.serviceArea}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProviderBadge className="md:hidden" />
            <Link to="/eval" className="fd-btn-sm inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground" title="Run the eval set">
              <FlaskConical className="h-4 w-4" /> <span className="hidden sm:inline">Eval</span>
            </Link>
            <button type="button" onClick={reset} className={`fd-btn-sm inline-flex items-center gap-1.5 ${resetStep === "confirm" ? "text-[hsl(var(--ios-red))]" : "text-muted-foreground hover:text-foreground"}`} title="Clear every demo lead, booking, draft and counter, for every business" aria-live="polite">
              {resetStep === "done" ? <Check className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              <span className={resetStep === "idle" ? "hidden sm:inline" : ""}>{resetStep === "confirm" ? "Tap again to reset" : resetStep === "done" ? "Demo reset" : "Reset demo"}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <section aria-label="Today in numbers" className="fd-card rise overflow-hidden lg:col-span-12">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                ["Answered", answered, "enquiries", MessageCircle, "var(--ios-blue)"],
                ["Booked", booked, `${visitWord}s`, CircleCheck, "var(--ios-green)"],
                ["Reactivated", reactivated, people ? "clients" : "jobs", Sparkles, "var(--ios-orange)"],
              ].map(([label, n, unit, Icon, tint]) => (
                <div key={label} role="group" aria-label={`${label} ${unit}`} className="min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-muted-foreground">
                    <Icon className="hidden h-4 w-4 shrink-0 sm:block" strokeWidth={2.25} style={{ color: `hsl(${tint})` }} aria-hidden /> {label}
                  </p>
                  <p key={n} className="pop mt-1.5 font-heading text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[34px]">{n}</p>
                  <p className="mt-1 truncate text-[12px] text-muted-foreground">{unit}</p>
                </div>
              ))}
            </div>
            <DailySummary flat tenant={tenant} cases={cases} slots={slots} leads={tenantLeads} />
          </section>

          <Panel title="Leads" icon={Inbox} tint="var(--ios-blue)" delay={80} meta={cases.length ? `${cases.length} total · ${waiting} waiting on you` : "Newest first"} className={`lg:col-span-8 ${openId ? "" : "lg:h-[380px]"}`} bodyClassName="overflow-y-auto">
            {cases.length === 0 ? (
              <Empty>
                No enquiries yet. Open the{" "}
                <Link to={`/chat?tenant=${tenant.id}`} className="text-foreground underline underline-offset-2">
                  customer view
                </Link>{" "}
                and start a case; it lands here.
              </Empty>
            ) : (
              <ul className="divide-y divide-border">
                {cases.map((c) => (
                  <LeadCard key={c.id} c={c} tenant={tenant} slot={c.bookingSlotId ? slots.find((s) => s.id === c.bookingSlotId) : null} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Calendar" icon={CalendarDays} tint="var(--ios-red)" delay={140} meta={schedule.length ? `${schedule.length} ${tenant.words.visit}${schedule.length === 1 ? "" : "s"} booked` : "A taken slot is never offered twice"} className={`lg:col-span-4 ${openId ? "" : "lg:h-[380px]"}`} bodyClassName="overflow-y-auto">
            {schedule.length === 0 ? (
              <Empty>Nothing booked yet. A booking made in chat appears here at once.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {schedule.map((s) => (
                  <li key={s.id} className="pop flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-secondary/60">
                    <div className="w-10 shrink-0 text-center">
                      <p className="text-[11px] font-semibold uppercase text-[hsl(var(--ios-red))]">{new Date(s.start).toLocaleDateString("en-US", { month: "short" })}</p>
                      <p className="font-heading text-[20px] font-semibold leading-none tabular-nums">{new Date(s.start).getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">
                        {fmtTime(s.start)} · {s.case?.customer?.name || (people ? "Client" : "Homeowner")}
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {s.case?.source === "reactivation" ? "Reactivated lead" : s.case?.source === "storm" ? `${weatherFor(prof.weather).noun.replace(/^./, (x) => x.toUpperCase())} check-in` : !prof.onSite ? s.case?.description || "Appointment" : s.case?.customer?.address || "Address to confirm"}
                      </p>
                    </div>
                    <button type="button" onClick={() => cancelBooking(s.caseId)} aria-label={`Cancel the ${fmtTime(s.start)} booking`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {prof.weather && <StormRadar tenant={tenant} className="lg:col-span-8" delay={200} />}
          <CallPanel tenant={tenant} delay={260} className={prof.weather ? "lg:col-span-4" : "lg:col-span-12"} />

          <ReactivationPanel tenant={tenant} delay={320} className="lg:col-span-12" />
        </div>
      </main>
      <DeskAssistant />
    </div>
  );
}

function Empty({ children }) {
  return <div className="flex h-full min-h-[160px] items-center justify-center px-6 py-8"><p className="max-w-[40ch] text-center text-[14px] text-muted-foreground">{children}</p></div>;
}

function LeadCard({ c, tenant, slot, open, onToggle }) {
  const stormRuns = useStore((s) => s.stormRuns);
  const allSlots = useStore((s) => s.slots);
  const prof = tradeProfile(tenant.trade);
  const storm = prof.weather ? stormForCase(c, stormRuns) : null;
  const wx = weatherFor(storm?.kind || prof.weather);
  const people = prof.personPhoto;
  const js = jobStatus(c, { tenant, slots: allSlots });
  const [signOff, setSignOff] = useState(null); // null | "approve" | "reject"
  const [why, setWhy] = useState("");
  const [editing, setEditing] = useState(false);
  const [outlining, setOutlining] = useState(false);
  const [low, setLow] = useState(c.quote?.low ?? "");
  const [high, setHigh] = useState(c.quote?.high ?? "");
  const q = c.quote;
  const status = q?.status;
  const spa = tenant.trade === "medspa";
  const canApprove = q && q.low !== null && (status === "draft" || status === "awaiting_approval" || status === "rejected");
  const needsReason = js.status !== "verified" && !q?.override;
  const approve = () => (needsReason ? (setSignOff("approve"), setWhy("")) : moveQuote(c.id, "approved"));
  const confirmSignOff = () => {
    if (!why.trim()) return;
    if (signOff === "approve") moveQuote(c.id, "approved", { override: why.trim() });
    else rejectQuote(c.id, why.trim());
    setSignOff(null);
  };
  const canSend = q && status === "approved";

  const save = () => {
    const l = Number(low);
    const h = Number(high);
    if (!(l > 0) || !(h >= l)) return;
    editQuoteRange(c.id, l, h);
    setEditing(false);
  };

  return (
    <li>
      <div className="flex gap-3 p-4 sm:gap-4">
        {c.photo ? (
          <OutlinedPhoto src={c.photo.dataUrl} segmentation={c.segmentation} className="h-16 w-20 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28 [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>span]:hidden" showReference={false} />
        ) : (
          <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground sm:h-20 sm:w-28">
            {c.source === "call" ? <Phone className="h-5 w-5" strokeWidth={1.5} /> : c.source === "storm" ? <CloudLightning className="h-5 w-5" strokeWidth={1.5} /> : c.source === "reactivation" ? <RefreshCw className="h-5 w-5" strokeWidth={1.5} /> : <MessageCircle className="h-5 w-5" strokeWidth={1.5} />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 truncate text-[16px] font-semibold leading-snug">
            {c.customer.name || (people ? "Client" : "Homeowner")}
            </h3>
            <span className="shrink-0 pt-0.5 text-[13px] tabular-nums text-muted-foreground">{new Date(c.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          {c.customer.address && prof.onSite && <p className="truncate text-[13px] text-muted-foreground">{c.customer.address}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {c.assessment ? <Severity value={c.assessment.severity} spa={spa} trade={tenant.trade} /> : <span className="fd-pill-neutral">{c.source === "reactivation" ? "Reactivated" : c.source === "storm" ? `${wx.noun.replace(/^./, (x) => x.toUpperCase())} check-in` : c.source === "call" ? "Phone call, needs photo" : "In conversation"}</span>}
            {c.assessment && <VerifyPill status={js.status} />}
            {q && <span className={status === "sent" ? "fd-pill-ok" : status === "approved" ? "fd-pill-strong" : "fd-pill-neutral"}>{STATUS_LABEL[status]}</span>}
            {people && c.consent && <span className="fd-pill-neutral">Photo consent</span>}
            {c.repairPreview && <span className="fd-pill-accent">Saw it repaired</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-[14px] text-muted-foreground">{c.assessment?.failedPart || c.description || "Waiting for the customer's description."}</p>
          {q && (
            <p className="mt-1.5 text-[15px]">
              {q.low !== null ? (
                <>
                  <span className="font-semibold tabular-nums">{money(q.low)} – {money(q.high)}</span> <span className="text-[13px] text-muted-foreground">draft, {Math.round((c.assessment?.confidence || 0) * 100)}% confidence</span>
                </>
              ) : (
                <span className="text-[14px] text-[hsl(var(--primary-deep))]">{q.reason || (spa ? "No published match: clinician advises at consultation." : prof.engine === "menu" ? `No published match: the ${prof.reviewer} prices it at the ${tenant.words?.visit || "visit"}.` : "No total yet. Enter the range after the inspection.")}</span>
              )}
            </p>
          )}
          {slot && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} /> {tenant.words.visit} {fmtDay(slot.start)}, {fmtTime(slot.start)}
            </p>
          )}
          {(storm || (tenant.trade === "roofing" && (c.assessment || c.photo))) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {storm && (
                <span className="fd-pill-accent max-w-full truncate">
                  <CloudLightning className="h-3.5 w-3.5 shrink-0" /> {wx.noun.replace(/^./, (x) => x.toUpperCase())} on record{storm.source === "rehearsal" ? " (rehearsal)" : ""} · {storm.event}
                </span>
              )}
              {/* Every roofing lead with a photo or an assessment gets a draft claim pack: the card, photo and draft quote. */}
              {tenant.trade === "roofing" && (
                <Link to={`/claim/${c.id}`} className="inline-flex items-center gap-1 text-[13px] text-foreground underline underline-offset-2">
                  <FileText className="h-3.5 w-3.5" /> Claim pack (draft)
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {q && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {signOff ? (
            <form
              className="flex w-full flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                confirmSignOff();
              }}
            >
              <label className="min-w-0 flex-1 basis-[240px]">
                <span className="sr-only">{signOff === "approve" ? "Reason for approving over failed checks" : "Reason for rejecting"}</span>
                <input autoFocus value={why} onChange={(e) => setWhy(e.target.value)} placeholder={signOff === "approve" ? "Why approve despite the failed checks?" : "Why reject this draft?"} className="h-10 w-full rounded-full border border-border bg-secondary px-4 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
              </label>
              <button type="submit" disabled={!why.trim()} className={signOff === "approve" ? "fd-btn-primary fd-btn-sm" : "fd-btn-ink fd-btn-sm"}>
                {signOff === "approve" ? <><Check className="h-4 w-4" /> Approve with reason</> : <><X className="h-4 w-4" /> Reject</>}
              </button>
              <button type="button" onClick={() => setSignOff(null)} className="fd-btn-outline fd-btn-sm">Cancel</button>
              {signOff === "approve" && <span className="basis-full text-[13px] text-muted-foreground">This job didn't pass every check. Your reason is saved in its audit trail.</span>}
            </form>
          ) : !editing ? (
            <>
              <button type="button" disabled={!canApprove} onClick={approve} className="fd-btn-primary fd-btn-sm">
                <Check className="h-4 w-4" /> {needsReason ? "Review & approve" : "Approve"}
              </button>
              <button type="button" disabled={status === "sent"} onClick={() => setEditing(true)} className="fd-btn-outline fd-btn-sm">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button type="button" disabled={!canSend} onClick={() => moveQuote(c.id, "sent")} className="fd-btn-ink fd-btn-sm">
                <Send className="h-4 w-4" /> Send
              </button>
              <button type="button" disabled={status === "sent" || status === "rejected"} onClick={() => (setSignOff("reject"), setWhy(""))} className="fd-btn-outline fd-btn-sm">
                <X className="h-4 w-4" /> Reject
              </button>
              <ReportButton c={c} tenant={tenant} />
              {status === "rejected" && <span className="basis-full text-[13px] text-muted-foreground">Rejected: {q.history?.at(-1)?.note}. Edit the range or correct the outline, then approve.</span>}
              {status === "sent" && <span className="basis-full text-[13px] text-muted-foreground">Sent. The customer's chat shows the confirmed range.</span>}
              {status === "awaiting_approval" && <span className="order-last basis-full text-[13px] text-muted-foreground">{q.low === null ? "Customer booked. Enter a range with Edit, then approve and send it." : spa ? "Client booked. Clinician approves the plan, then sends it." : "Customer booked. Approve the range, then send it."}</span>}
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-[14px]">
                Low $<input value={low} onChange={(e) => setLow(e.target.value)} inputMode="numeric" className="h-10 w-24 rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground" />
              </label>
              <label className="flex items-center gap-2 text-[14px]">
                High $<input value={high} onChange={(e) => setHigh(e.target.value)} inputMode="numeric" className="h-10 w-24 rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground" />
              </label>
              <button type="button" onClick={save} className="fd-btn-primary fd-btn-sm">Save range</button>
              <button type="button" onClick={() => setEditing(false)} className="fd-btn-outline fd-btn-sm">Cancel</button>
            </>
          )}
          <button type="button" onClick={onToggle} className="ml-auto inline-flex h-9 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
            {open ? "Hide assessment" : "Assessment"} <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {open && c.assessment && (
        <div className="pop space-y-4 border-t border-border p-4">
          <VerificationPanel c={c} js={js} />
          <AgentTrace c={c} />
          {c.photo && c.segmentation && status !== "sent" && (
            <div className="flex flex-wrap items-center gap-2">
              {!outlining && (
                <button type="button" onClick={() => setOutlining(true)} className="fd-btn-outline fd-btn-sm">
                  {c.segmentation.regions?.length ? "Correct the outline" : "Draw the outline"}
                </button>
              )}
              {c.segmentation.correctedByOwner && <span className="fd-pill-neutral">Outline corrected by the {tenant.words.approver}</span>}
            </div>
          )}
          {outlining ? (
            <OutlineEditor photo={c.photo.dataUrl} segmentation={c.segmentation} onSave={(poly) => { correctOutline(c.id, poly); setOutlining(false); }} onCancel={() => setOutlining(false)} />
          ) : (
            <AssessmentCard photo={c.photo?.dataUrl} segmentation={c.segmentation} measurement={c.measurement} assessment={c.assessment} quote={c.quote} tenant={tenant} flat />
          )}
          {c.repairPreview && c.photo && <BeforeAfter before={c.photo.dataUrl} after={c.repairPreview.imageDataUrl} provider={c.repairPreview.provider} />}
        </div>
      )}
    </li>
  );
}
