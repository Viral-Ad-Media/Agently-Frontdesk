import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { stormForCase, stormFacts } from "@/lib/storm";
import { trustFor } from "@/lib/trust";
import { SQFT_PER_M2 } from "@/lib/rateCard";
import OutlinedPhoto from "@/components/frontdesk/OutlinedPhoto";
import { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";

const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const whole = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "unknown");
const day = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not given");
const STORM = /\b(hail|wind|gust|storm|tornado|hurricane|tree|limb)\b/i;

function causeOfLoss(c, storm) {
  if (storm) return `${storm.event} (weather service record)`;
  const text = `${c.description || ""} ${c.assessment?.failedPart || ""} ${c.assessment?.summary || ""}`;
  const m = text.match(STORM);
  if (!m) return "Not stated";
  const w = m[1].toLowerCase();
  return `${w === "gust" ? "Wind" : w[0].toUpperCase() + w.slice(1)} damage (as reported by the homeowner)`;
}

function Field({ label, children, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[14px]">{children}</dd>
    </div>
  );
}

// The insurance claim pack: one printable document a homeowner can hand to their adjuster. It puts the
// weather on record next to the damage evidence and the itemised draft estimate. Facts and their sources
// only: it never predicts what an insurer will decide.
export default function ClaimPack() {
  const { id } = useParams();
  const { cases, tenants, stormRuns, slots } = useStore();
  const c = cases.find((x) => x.id === id);
  if (!c) {
    return (
      <div className="mx-auto max-w-[720px] p-8">
        <p>This case is not in this browser. Claim packs are built from the front desk's own records.</p>
        <Link to="/frontdesk" className="mt-4 inline-block text-primary underline">Back to the front desk</Link>
      </div>
    );
  }
  const tenant = tenants[c.tenantId];
  const storm = stormForCase(c, stormRuns);
  const slot = slots.find((s) => s.id === c.bookingSlotId);
  const q = c.quote;
  const ins = c.insurance?.claiming ? c.insurance : null;
  const rehearsal = storm?.source === "rehearsal";
  const trust = trustFor(tenant);
  const ref = `CP-${new Date(c.createdAt).toISOString().slice(2, 10).replace(/-/g, "")}-${c.id.slice(-4).toUpperCase()}`;
  const area = c.measurement?.areaM2;
  const subtotal = (q?.lines || []).reduce((n, l) => n + (Number(l.amount) || 0), 0);
  const confirmed = q?.status === "sent";

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="mx-auto flex max-w-[860px] items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link to="/frontdesk" className="fd-btn-outline h-9 px-3 text-[13px]"><ArrowLeft className="h-4 w-4" /> Front desk</Link>
        <button type="button" onClick={() => window.print()} className="fd-btn-primary h-9 px-3 text-[13px]"><Printer className="h-4 w-4" /> Print or save as PDF</button>
      </div>

      <article className="mx-auto max-w-[860px] bg-card px-6 py-8 print:max-w-none print:px-0 md:rounded-lg md:border md:border-border md:px-10 md:py-10 print:border-0" data-testid="claim-pack">
        {/* Letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-5">
          <div className="min-w-0">
            <p className="text-[22px] font-bold tracking-[-0.02em]">{tenant.name}</p>
            <p className="text-[13px] text-muted-foreground">Roofing contractor{tenant.serviceArea ? ` · ${tenant.serviceArea}` : ""}</p>
            {trust.lines.slice(0, 2).map((l) => (
              <p key={l.label + l.value} className="text-[12px] text-muted-foreground">{l.value.replace(/^"|"$/g, "")}</p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Property damage report</p>
            <p className="font-mono text-[15px] font-semibold">{ref}</p>
            <p className="text-[12px] text-muted-foreground">Prepared {day(new Date().toISOString())}</p>
            <span className="mt-1 inline-block rounded border border-[hsl(var(--primary-deep))] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--primary-deep))]">{confirmed ? "Estimate confirmed" : "Draft"}</span>
          </div>
        </header>

        <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Supporting documentation for an insurance claim</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">For the policyholder and their adjuster. Each fact below states where it came from.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-border p-4 break-inside-avoid">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.06em]">Policyholder and property</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Policyholder">{ins?.holder || c.customer.name || "Name to confirm at inspection"}</Field>
              <Field label="Phone">{c.customer.phone || "Not given"}</Field>
              <Field label="Property address" wide>{c.customer.address || "Address not given"}</Field>
              <Field label="First contact">{when(c.createdAt)}</Field>
              <Field label="Channel">{c.source === "website" ? "Website chat" : c.source === "call" ? "Phone call" : c.source === "storm" ? "Post-storm check-in" : "Chat"}</Field>
            </dl>
          </section>
          <section className="rounded-lg border border-border p-4 break-inside-avoid" data-testid="claim-insurance">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.06em]">Claim details</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Insurer">{ins?.carrier || "Not given"}</Field>
              <Field label="Policy number">{ins?.policyNumber || "Not given"}</Field>
              <Field label="Claim number">{ins?.claimNumber || "Not filed yet"}</Field>
              <Field label="Date of loss">{ins?.stormDate ? `${day(ins.stormDate)} (as told)` : storm ? day(storm.onset) : "Not given"}</Field>
              <Field label="Cause of loss" wide>{causeOfLoss(c, storm)}</Field>
            </dl>
          </section>
        </div>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">1 · Weather on record</h2>
          {storm ? (
            <div className="mt-3 rounded-lg border border-border p-4">
              {rehearsal && <p className="mb-2 font-spec text-[11px] uppercase text-[hsl(var(--primary-deep))]">Rehearsal storm · synthetic demo data, not a real weather record</p>}
              <p className="text-[15px]">{storm.headline}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Event</dt><dd>{storm.event}</dd></div>
                <div><dt className="text-muted-foreground">Reported</dt><dd>{stormFacts(storm) || "no hail or wind figure reported"}</dd></div>
                <div><dt className="text-muted-foreground">In effect</dt><dd>{when(storm.onset)} – {when(storm.ends)}</dd></div>
                <div><dt className="text-muted-foreground">Areas</dt><dd>{storm.areaDesc}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Source</dt><dd className="break-all">{storm.sender}{storm.source === "live" ? ` · alert ${storm.id}` : ""}</dd></div>
              </dl>
              <p className="mt-3 text-[13px] text-muted-foreground">The property address falls inside the alert's storm path (approximate location).</p>
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-muted-foreground">No weather-service alert on record covers this address in the 14 days before the enquiry.{ins?.stormDate ? ` The homeowner reports a storm on ${day(ins.stormDate)}; the adjuster can check it against the weather service's archive.` : ""}</p>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">2 · Damage evidence</h2>
          {c.photo ? (
            <div className="mt-3 grid gap-5 md:grid-cols-[1.25fr_1fr]">
              <figure className="m-0">
                <OutlinedPhoto src={c.photo.dataUrl} segmentation={c.segmentation} />
                <figcaption className="mt-1.5 text-[12px] text-muted-foreground">Photo 1 · homeowner's photo, damage outlined by the front desk (SAM 3.1){c.segmentation?.correctedByOwner ? ", outline corrected by the contractor" : ""}.</figcaption>
              </figure>
              <dl className="grid content-start gap-3">
                {c.assessment && (
                  <>
                    <Field label="Finding">{c.assessment.failedPart}</Field>
                    <Field label="Severity">{c.assessment.severity}</Field>
                    <Field label="Roof material">{c.assessment.material?.name} ({Math.round((c.assessment.material?.confidence || 0) * 100)}% confidence)</Field>
                  </>
                )}
                <Field label="Measured damaged area">
                  {area != null ? `${area} m² (${Math.round(area * SQFT_PER_M2)} sq ft), scaled by a ${c.measurement.reference?.label || "reference object"} in the photo` : "Not measured: no scale reference in the photo. Measured at inspection."}
                </Field>
                <Field label="Photo taken">{when(c.photo.at || c.createdAt)}</Field>
                {c.assessment?.summary && <Field label="Notes">{c.assessment.summary}</Field>}
              </dl>
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-muted-foreground">Photos will be added at the inspection{slot ? ` on ${fmtDay(slot.start)} at ${fmtTime(slot.start)}` : ""}.</p>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">3 · Repair estimate</h2>
          {q?.low != null && q.lines?.length ? (
            <table className="mt-3 w-full border-collapse text-[14px]" data-testid="claim-estimate">
              <thead>
                <tr className="border-b border-foreground text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 font-semibold">Quantity × rate</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l) => (
                  <tr key={l.label} className="border-b border-border">
                    <td className="py-2 pr-3">{l.label}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{l.detail}</td>
                    <td className="py-2 text-right tabular-nums">{l.amount != null ? money(l.amount) : "–"}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 font-semibold" colSpan={2}>Subtotal</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{money(subtotal)}</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 pr-3" colSpan={2}>Estimate range ({confirmed ? "confirmed by the contractor" : "draft, ±20% until inspected"})</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{whole(q.low)} – {whole(q.high)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-[15px]">{q?.low != null ? `${whole(q.low)} – ${whole(q.high)} · ${confirmed ? "confirmed by the contractor" : "draft, not yet confirmed"}` : "Not priced yet. The contractor confirms a range after the inspection."}</p>
          )}
          <p className="mt-2 text-[12px] text-muted-foreground">Rates from {tenant.name}'s published rate card{tenant.rateCard?.source === "website" ? " (read from its website)" : ""}. USD. Final price confirmed on site before any work starts.</p>
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">4 · Timeline</h2>
          <ol className="mt-3 space-y-1 text-[14px]">
            {ins?.stormDate && !storm && <li><span className="text-muted-foreground">{day(ins.stormDate)} · </span>Storm, as reported by the homeowner</li>}
            {storm && <li><span className="text-muted-foreground">{when(storm.onset)} · </span>{storm.event} begins</li>}
            <li><span className="text-muted-foreground">{when(c.createdAt)} · </span>{c.source === "storm" ? "Front desk checks in after the storm; homeowner replies" : "Homeowner contacts the front desk"}</li>
            {c.photo && <li><span className="text-muted-foreground">{when(c.photo.at || c.createdAt)} · </span>Photo received and outlined</li>}
            {ins && <li><span className="text-muted-foreground">{when(c.insurance.at)} · </span>Insurance details added by the homeowner</li>}
            {slot && <li><span className="text-muted-foreground">{when(slot.start)} · </span>Inspection booked</li>}
          </ol>
        </section>

        <section className="mt-10 grid gap-8 break-inside-avoid sm:grid-cols-2">
          {["Contractor representative", "Policyholder"].map((who) => (
            <div key={who}>
              <div className="h-10 border-b border-foreground" />
              <p className="mt-1.5 text-[12px] text-muted-foreground">{who} · signature and date</p>
            </div>
          ))}
        </section>

        <footer className="mt-10 border-t border-border pt-4 text-[12px] text-muted-foreground">
          Prepared by {tenant.name}'s front desk from its own records ({ref}). This document states facts and their sources. It is {confirmed ? "an estimate confirmed by the contractor" : "a DRAFT"} for the policyholder and their adjuster. It is not an insurance determination and makes no guarantee or prediction about any insurer's decision.{storm && !rehearsal ? " Weather data from the US National Weather Service." : ""}
          {(tenant.setup || trust.source === "demo") && " Demo: business, people and policy details in this pack are made up for a product demonstration."}
        </footer>
      </article>
    </div>
  );
}
