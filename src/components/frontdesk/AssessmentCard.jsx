import OutlinedPhoto from "@/components/frontdesk/OutlinedPhoto";
import Severity from "@/components/frontdesk/Severity";
import ProviderBadge from "@/components/shared/ProviderBadge";
import { STATUS_LABEL } from "@/lib/quote";

const pct = (n) => `${Math.round((n || 0) * 100)}%`;
const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// The hero element: annotated photo, finding, severity, next steps, measurement basis (roofing),
// service match and clinician flags (med spa), draft quote with the maths and disclaimer, confidence always visible.
export default function AssessmentCard({ photo, segmentation, measurement, assessment, quote, tenant, compact = false }) {
  if (!assessment) return null;
  const spa = tenant?.trade === "medspa";
  const words = tenant?.words || {};
  const m = assessment.material;
  return (
    <section className="fd-card overflow-hidden" aria-label="Assessment">
      {photo && !compact && <OutlinedPhoto src={photo} segmentation={segmentation} className="rounded-none border-0 border-b" />}

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Severity value={assessment.severity} spa={spa} />
          <span className="rounded-full border border-border px-2.5 py-1 font-spec text-[11px] uppercase text-muted-foreground">Confidence {pct(assessment.confidence)}</span>
          <ProviderBadge className="ml-auto" />
        </div>

        <div>
          <p className="font-spec text-[11px] uppercase text-muted-foreground">{words.finding || "Finding"}</p>
          <h3 className="mt-1 text-xl">{assessment.failedPart}</h3>
          <p className="mt-2 text-[15px] text-muted-foreground">{assessment.summary}</p>
        </div>

        {spa ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-spec text-[11px] uppercase text-muted-foreground">Matched to our services</dt>
              <dd className="mt-1 text-[15px]">
                {(assessment.serviceMatch || []).map((s) => (
                  <span key={s.serviceId} className="block">
                    {s.name} <span className="text-muted-foreground">({s.fit})</span>
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="font-spec text-[11px] uppercase text-muted-foreground">For the clinician</dt>
              <dd className="mt-1 space-y-1 text-[14px] text-[hsl(var(--primary-deep))]">
                {(assessment.clinicianFlags || []).map((f, i) => (
                  <span key={i} className="block">{f}</span>
                ))}
              </dd>
            </div>
          </dl>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-spec text-[11px] uppercase text-muted-foreground">Material</dt>
              <dd className="mt-1 text-[15px]">
                {m.name} <span className="text-muted-foreground">({pct(m.confidence)})</span>
                {m.alternatives?.length > 0 && (
                  <span className="block text-[13px] text-muted-foreground">Also possible: {m.alternatives.map((a) => `${a.name} ${pct(a.confidence)}`).join(", ")}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-spec text-[11px] uppercase text-muted-foreground">Measurement basis</dt>
              <dd className="mt-1 text-[15px]">
                {measurement?.basis === "reference" ? (
                  <>
                    {measurement.areaM2} m² from the outline, scaled by a {measurement.reference.label} in frame, tilt-corrected {measurement.tiltDeg}°.
                    <span className="block text-[13px] text-muted-foreground">{measurement.areaPercent}% of the {words.surface || "visible roof"}.</span>
                  </>
                ) : (
                  <>
                    {measurement?.areaPercent ?? "-"}% of the {words.surface || "visible roof"}. No scale reference in the photo, so no square-metre figure.
                    <span className="block text-[13px] text-[hsl(var(--primary-deep))]">Site visit needed to confirm.</span>
                  </>
                )}
              </dd>
            </div>
          </dl>
        )}

        <div>
          <p className="font-spec text-[11px] uppercase text-muted-foreground">{words.steps || "Work needed"}</p>
          <ol className="mt-2 space-y-1.5 text-[15px]">
            {assessment.workNeeded.map((w, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-spec text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span>{w}</span>
              </li>
            ))}
          </ol>
        </div>

        {quote && (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-spec text-[11px] uppercase text-muted-foreground">{spa ? "Draft treatment range · USD" : "Draft quote · USD"}</p>
              <span className="rounded-full border border-border bg-card px-2.5 py-1 font-spec text-[11px] uppercase">{STATUS_LABEL[quote.status]}</span>
            </div>
            {quote.low !== null ? (
              <>
                <p className="mt-2 font-heading text-3xl">
                  {money(quote.low)} – {money(quote.high)}
                </p>
                <div className="mt-3 space-y-1 border-t border-dashed border-border pt-3 font-spec text-xs">
                  {quote.lines.map((l) => (
                    <div key={l.label} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        {l.label} <span className="opacity-70">· {l.detail}</span>
                      </span>
                      {l.amount !== null && l.amount !== undefined && <span>{money(l.amount)}</span>}
                    </div>
                  ))}
                  {quote.total !== null && !spa && (
                    <div className="flex justify-between gap-4 border-t border-border pt-2">
                      <span className="text-muted-foreground">Total ± 20%</span>
                      <span>{money(quote.total)}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[15px]">{quote.reason}</p>
            )}
            <p className="mt-3 text-[13px] text-muted-foreground">{quote.disclaimer}</p>
          </div>
        )}
      </div>
    </section>
  );
}
