import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { stormForCase, stormFacts } from "@/lib/storm";
import OutlinedPhoto from "@/components/frontdesk/OutlinedPhoto";
import { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "unknown");

// The insurance-ready claim pack: one printable page that puts the weather on record next to the damage
// evidence the front desk collected. It states facts and their sources; it never predicts a claim outcome.
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
  const rehearsal = storm?.source === "rehearsal";

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="mx-auto flex max-w-[820px] items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link to="/frontdesk" className="fd-btn-outline h-9 px-3 text-[13px]"><ArrowLeft className="h-4 w-4" /> Front desk</Link>
        <button type="button" onClick={() => window.print()} className="fd-btn-primary h-9 px-3 text-[13px]"><Printer className="h-4 w-4" /> Print or save as PDF</button>
      </div>

      <article className="mx-auto max-w-[820px] bg-card px-6 py-8 shadow-none print:max-w-none print:px-0 md:px-10 md:py-10 md:border md:border-border md:rounded-lg print:border-0">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="font-spec text-[11px] uppercase text-muted-foreground">{tenant.name} · storm damage evidence</p>
            <h1 className="mt-1 flex items-center gap-3 text-3xl">Claim pack <span className="rounded-md border border-[hsl(var(--primary-deep))] px-2 py-0.5 font-spec text-[12px] uppercase tracking-wide text-[hsl(var(--primary-deep))]">Draft</span></h1>
          </div>
          <div className="text-right text-[14px]">
            <p>{c.customer.name || "Homeowner"}</p>
            <p className="text-muted-foreground">{c.customer.address || "Address not given"}</p>
          </div>
        </header>

        {c.insurance?.claiming && (
          <section className="mt-6 break-inside-avoid" data-testid="claim-insurance">
            <h2 className="text-lg">Insurance details (from the homeowner)</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-lg border border-border p-4 text-[14px] sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Insurer</dt><dd>{c.insurance.carrier}</dd></div>
              <div><dt className="text-muted-foreground">Claim number</dt><dd>{c.insurance.claimNumber || "Not filed yet"}</dd></div>
              <div><dt className="text-muted-foreground">Storm date (as told)</dt><dd>{c.insurance.stormDate ? new Date(`${c.insurance.stormDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Not given"}</dd></div>
            </dl>
          </section>
        )}

        <section className="mt-6">
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
            <p className="mt-3 text-[15px] text-muted-foreground">No storm alert on record covers this address in the 14 days before the enquiry.</p>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">2 · Damage evidence</h2>
          {c.photo ? (
            <div className="mt-3 grid gap-5 md:grid-cols-[1.2fr_1fr]">
              <OutlinedPhoto src={c.photo.dataUrl} segmentation={c.segmentation} />
              <div className="space-y-3 text-[14px]">
                {c.assessment && (
                  <>
                    <p><span className="text-muted-foreground">Finding · </span>{c.assessment.failedPart}</p>
                    <p><span className="text-muted-foreground">Severity · </span>{c.assessment.severity}</p>
                    <p><span className="text-muted-foreground">Material · </span>{c.assessment.material?.name} ({Math.round((c.assessment.material?.confidence || 0) * 100)}% confidence)</p>
                    <p className="text-muted-foreground">{c.assessment.summary}</p>
                  </>
                )}
                {c.measurement?.areaM2 != null && <p><span className="text-muted-foreground">Measured area · </span>{c.measurement.areaM2} m² (from a reference object in frame)</p>}
                <p><span className="text-muted-foreground">Photo taken · </span>{when(c.photo.at || c.createdAt)}</p>
                {c.segmentation?.correctedByOwner && <p className="text-muted-foreground">Outline corrected by the front desk.</p>}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-muted-foreground">Photos will be added at the inspection{slot ? ` on ${fmtDay(slot.start)} at ${fmtTime(slot.start)}` : ""}.</p>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">3 · Repair estimate</h2>
          <p className="mt-3 text-[15px]">
            {q?.low != null ? `${money(q.low)} – ${money(q.high)} · ${q.status === "sent" ? "confirmed by the roofer" : "draft, not yet confirmed"}` : "Not priced yet. The roofer confirms a range after the inspection."}
          </p>
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg">4 · Timeline</h2>
          <ol className="mt-3 space-y-1 text-[14px]">
            {storm && <li><span className="text-muted-foreground">{when(storm.onset)} · </span>{storm.event} begins</li>}
            <li><span className="text-muted-foreground">{when(c.createdAt)} · </span>{c.source === "storm" ? "Front desk checks in after the storm; homeowner replies" : "Homeowner contacts the front desk"}</li>
            {c.photo && <li><span className="text-muted-foreground">{when(c.photo.at || c.createdAt)} · </span>Photo received and outlined</li>}
            {slot && <li><span className="text-muted-foreground">{when(slot.start)} · </span>Inspection booked</li>}
          </ol>
        </section>

        <footer className="mt-10 border-t border-border pt-4 text-[12px] text-muted-foreground">
          Prepared by {tenant.name}'s front desk from its own records. This pack states facts and their sources. It is a DRAFT for the homeowner and their adjuster. It is not an insurance determination and makes no guarantee or prediction about any insurer's decision.{storm && !rehearsal ? " Weather data from the US National Weather Service." : ""}
        </footer>
      </article>
    </div>
  );
}
