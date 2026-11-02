import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FlaskConical, Play } from "lucide-react";
import { gateway, PROVIDER_LABEL } from "@/gateway";
import { useStore } from "@/lib/store";
import { runEval } from "@/eval/runEval";
import { EVAL_JOBS } from "@/eval/jobs";
import ProviderBadge from "@/components/shared/ProviderBadge";
import { VerifyPill } from "@/components/frontdesk/VerificationPanel";

// The eval set, run live through the gateway with whichever provider is configured (Fireworks workshop:
// test on an eval set before calling it done). On Meta this records real tokens, cost and time per job.
export default function Eval() {
  const tenants = useStore((s) => s.tenants);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setRows([]);
    setError(null);
    setRunning(true);
    try {
      await runEval({ ai: gateway, tenants, onRow: (r) => setRows((x) => [...x, r]), now: () => performance.now() });
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };
  const correct = rows.filter((r) => r.correct).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-20 border-b border-white/[0.08]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 md:px-8">
          <Link to="/frontdesk" className="fd-btn-outline fd-btn-sm w-10 px-0 sm:w-auto sm:px-3" aria-label="Back to the dashboard">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <ProviderBadge className="ml-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 pb-20 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Eval set · {EVAL_JOBS.length} synthetic jobs</p>
            <h1 className="mt-0.5 text-[34px] font-bold leading-[1.1] tracking-[-0.03em]">Does the desk get it right?</h1>
            <p className="mt-1 max-w-[70ch] text-[14px] text-muted-foreground">
              Every job runs through the live pipeline on {PROVIDER_LABEL}: router, assessment, rate-card quote, a separate reviewer pass (up to 3) and the coded checks. A job is correct when it ends where a careful front desk would: verified, sent back for a retake, held for review, or escalated to a person.
            </p>
          </div>
          <button type="button" onClick={run} disabled={running} className="fd-btn-primary">
            {running ? <FlaskConical className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />} {running ? `Running ${rows.length + 1} of ${EVAL_JOBS.length}…` : rows.length ? "Run again" : "Run the eval"}
          </button>
        </div>

        {error && <p className="mt-4 text-[14px] text-destructive">{error}</p>}

        <section className="fd-card rise mt-6 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <p className="text-[15px] font-semibold">Results</p>
            {rows.length > 0 && (
              <span className={correct === rows.length ? "fd-pill-ok" : "fd-pill bg-[hsl(var(--ios-orange)/0.16)] text-[hsl(var(--ios-orange))]"}>
                {correct}/{rows.length} correct
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  {["Job", "Case", "Expected", "Result", "Router", "Reviews", "Checklist", "Tokens in/out", "Time", "Why"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {EVAL_JOBS.map((j) => {
                  const r = rows.find((x) => x.id === j.id);
                  return (
                    <tr key={j.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-semibold">{j.id}</td>
                      <td className="px-4 py-2.5">{j.title}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{j.expected.replace("_", " ")}</td>
                      <td className="px-4 py-2.5">{r ? r.status === "retake" ? <span className="fd-pill-neutral">Retake asked</span> : <VerifyPill status={r.status} /> : <span className="text-muted-foreground">{running ? "…" : "-"}</span>}</td>
                      <td className="px-4 py-2.5">{r ? `${r.tier} · ${r.effort}` : ""}</td>
                      <td className="px-4 py-2.5">{r?.reviews ?? ""}</td>
                      <td className="px-4 py-2.5">{r?.coverage ?? ""}</td>
                      <td className="px-4 py-2.5">{r?.tokens ?? ""}</td>
                      <td className="px-4 py-2.5">{r ? `${(r.ms / 1000).toFixed(1)} s` : ""}</td>
                      <td className="max-w-[320px] px-4 py-2.5 text-muted-foreground">
                        {r && (r.correct ? "" : <span className="font-semibold text-[hsl(var(--ios-red))]">Wrong. </span>)}
                        {r?.why}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="mt-3 text-[13px] text-muted-foreground">Synthetic jobs only. The segmentation is a fixed fixture so every provider is judged on the same evidence. Cost shows only when prices are configured; it is never estimated.</p>
      </main>
    </div>
  );
}
