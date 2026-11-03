import { useStore } from "@/lib/store";
import { VERIFY_LABEL } from "@/lib/verify";
import { CAPABILITY_MODEL } from "@/gateway";
import { AlertTriangle, CheckCircle2, CircleDashed, Route, ShieldCheck, UserCheck, XCircle } from "lucide-react";

const TONE = {
  verified: "fd-pill-ok",
  needs_review: "fd-pill bg-[hsl(var(--ios-orange)/0.16)] text-[hsl(var(--ios-orange))]",
  escalated: "fd-pill bg-[hsl(var(--ios-red)/0.16)] text-[hsl(var(--ios-red))]",
  pending: "fd-pill-neutral",
};

export function VerifyPill({ status }) {
  const Icon = status === "verified" ? ShieldCheck : status === "pending" ? CircleDashed : AlertTriangle;
  return (
    <span className={TONE[status] || TONE.pending}>
      <Icon className="h-3.5 w-3.5" /> {VERIFY_LABEL[status] || "Checking"}
    </span>
  );
}

const mark = (s) =>
  s === "pass" || s === "proven" ? (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--ios-green))]" aria-label="Passed" />
  ) : s === "fail" || s === "escalated" ? (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--ios-red))]" aria-label="Failed" />
  ) : (
    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Not proven" />
  );

const STAGES = [
  ["capture", "Capture"],
  ["assessment", "Assessment"],
  ["quote", "Quote"],
  ["booking", "Booking"],
];

// The three verification layers for one job, shown on screen (Agents 102), plus the router's decision,
// every AI call made for the job and the sign-off audit trail.
export default function VerificationPanel({ c, js }) {
  const log = useStore((s) => s.gatewayLog).filter((e) => e.caseId === c.id);
  const v = c.verification;
  const history = c.quote?.history || [];
  return (
    <section aria-label="Verification" className="overflow-hidden rounded-lg border border-border">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-[hsl(var(--ios-blue))]" />
        <h4 className="text-[15px] font-semibold">Verification</h4>
        <VerifyPill status={js.status} />
        <div className="ml-auto flex flex-wrap gap-1.5">
          {STAGES.map(([id, label]) => {
            const ks = js.checks.filter((k) => k.stage === id);
            const st = !ks.length || ks.every((k) => k.status === "pending") ? "pending" : ks.some((k) => k.status === "fail") ? "fail" : "pass";
            return (
              <span key={id} className={st === "pass" ? "fd-pill-ok" : st === "fail" ? TONE.escalated : "fd-pill-neutral"} title={`Milestone check after ${label.toLowerCase()}`}>
                {label}
              </span>
            );
          })}
        </div>
      </header>

      {js.reasons.length > 0 && (
        <ul className="space-y-1 border-b border-border bg-[hsl(var(--ios-orange)/0.06)] px-4 py-3 text-[14px]">
          {js.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--ios-orange))]" /> <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-px bg-border md:grid-cols-3">
        <div className="bg-card p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Layer 1 · coded checks</p>
          <ul className="mt-2 space-y-2">
            {js.checks.map((k) => (
              <li key={k.id} className="flex gap-2 text-[13px]">
                {mark(k.status)}
                <span>
                  <span className="font-medium">{k.label}.</span> <span className="text-muted-foreground">{k.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Checklist vs evidence</p>
          {js.cover ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[22px] font-bold tabular-nums">{js.cover.proven}/{js.cover.total}</span>
                <span className="text-[13px] text-muted-foreground">proven · bar {Math.round(js.cover.bar * 100)}%</span>
              </div>
              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full ${js.cover.pass ? "bg-[hsl(var(--ios-green))]" : "bg-[hsl(var(--ios-orange))]"}`} style={{ width: `${Math.round(js.cover.ratio * 100)}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${Math.round(js.cover.bar * 100)}%` }} aria-hidden />
              </div>
              <ul className="mt-3 space-y-2">
                {js.items.map((i) => (
                  <li key={i.id} className="flex gap-2 text-[13px]">
                    {mark(i.status)}
                    <span>
                      <span className="font-medium">{i.label}:</span> <span className="text-muted-foreground">{i.status === "proven" ? "" : i.status === "escalated" ? "ESCALATED. " : "NOT PROVEN. "}{i.evidence}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-muted-foreground">The reference is the evidence itself: the photo, the description, the rate card and the real slot list.</p>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">Starts once the photo is assessed.</p>
          )}
        </div>

        <div className="bg-card p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Layer 2 · {CAPABILITY_MODEL.judgeAssessment}</p>
          {v?.runs?.length ? (
            <ol className="mt-2 space-y-2">
              {v.runs.map((r) => (
                <li key={r.attempt} className="text-[13px]">
                  <div className="flex gap-2">
                    {mark(r.judge.verdict === "PASS" ? "pass" : "fail")}
                    <span>
                      <span className="font-medium">Review {r.attempt}: {r.judge.verdict}{r.judge.layer === "coded" ? " (coded check, escalated without retrying)" : ""}</span>
                      <span className="block text-[12px] text-muted-foreground">Drafted on the {r.route.tier} tier, {r.route.effort} effort</span>
                    </span>
                  </div>
                  {r.judge.issues.map((i, n) => (
                    <p key={n} className="ml-6 mt-0.5 text-muted-foreground">
                      <span className="font-medium capitalize text-foreground/80">{i.type}:</span> {i.detail}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">No review yet.</p>
          )}
          {v?.held && <p className="mt-2 text-[13px] text-[hsl(var(--ios-orange))]">Held for you after one review: {v.held.detail}</p>}
          {v?.escalated && <p className="mt-2 text-[13px] text-[hsl(var(--ios-red))]">Failed {v.runs.length} reviews in a row, so it came to you instead of the customer.</p>}

          <p className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            <UserCheck className="h-3.5 w-3.5" /> Layer 3 · your sign-off
          </p>
          <ol className="mt-2 space-y-1 text-[13px]">
            {history.map((h, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="tabular-nums">{new Date(h.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span> · <span className="font-medium text-foreground/90">{h.status.replace("_", " ")}</span> by {h.by}
                {h.note ? `: ${h.note}` : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          <Route className="h-3.5 w-3.5" /> Router and AI calls for this job
        </p>
        {v?.route && <p className="mt-1.5 text-[13px]">{v.route.reason}</p>}
        {log.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">Step</th>
                  <th className="py-1 pr-3 font-medium">Model</th>
                  <th className="py-1 pr-3 font-medium">Tier · effort</th>
                  <th className="py-1 pr-3 font-medium">Tokens in/out</th>
                  <th className="py-1 pr-3 font-medium">Cost</th>
                  <th className="py-1 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...log].reverse().map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1 pr-3">{e.capability}{e.cached ? " (cached)" : ""}</td>
                    <td className="py-1 pr-3">{e.provider === "mock" ? "mock" : e.model || CAPABILITY_MODEL[e.capability]}</td>
                    <td className="py-1 pr-3">{e.route ? `${e.route.tier} · ${e.effort || "-"}` : "-"}</td>
                    <td className="py-1 pr-3">{e.tokens ? `${e.tokens.input ?? "?"}/${e.tokens.output ?? "?"}` : e.provider === "mock" ? "0" : "n/a"}</td>
                    <td className="py-1 pr-3">{e.costUsd === 0 ? "$0" : e.costUsd == null ? "not priced" : `$${e.costUsd}`}</td>
                    <td className="py-1">{e.latencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
