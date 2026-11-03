// Runs the eval set through the same pipeline the chat uses (router -> assess -> rate card -> reviewer -> checks)
// against any provider-shaped object: the gateway in the browser (/eval), or the mock in node (npm run eval).
import { assessAndVerify } from "../lib/pipeline.js";
import { measure } from "../lib/eye.js";
import { jobStatus } from "../lib/verify.js";
import { EVAL_JOBS } from "./jobs.js";

export async function runEval({ ai, tenants, jobs = EVAL_JOBS, onRow = () => {}, now = () => Date.now() }) {
  const rows = [];
  for (const job of jobs) {
    const started = now();
    const tenant = (job.trade === "roofing" && tenants["summit-ridge"]) || Object.values(tenants).find((t) => t.trade === job.trade && !t.setup) || Object.values(tenants).find((t) => t.trade === job.trade);
    const c = {
      id: `eval-${job.id}`,
      trade: job.trade,
      description: job.description,
      customer: { name: "", address: job.address || "" },
      photo: { quality: { issues: (job.photoIssues || []).map((code) => ({ code })) } },
      consent: job.consent ? { at: "eval" } : null,
      messages: [],
    };
    let row;
    if (job.photoIssues?.length) {
      // The capture check stops here: the customer is asked for a retake, nothing is assessed.
      row = { status: "retake", tier: "-", effort: "-", reviews: 0, judge: "-", coverage: "-", why: `Photo check: ${job.photoIssues.join(", ")}` };
    } else {
      const region = job.seg.regions[0];
      const m = job.trade === "roofing" && region ? measure({ polygon: region.polygon, reference: job.seg.reference, tiltDeg: job.seg.tiltDeg }) : null;
      const wrapped = job.assessOverride ? { ...ai, assess: async (input) => ({ ...(await ai.assess(input)), ...job.assessOverride }) } : ai;
      const out = await assessAndVerify({ ai: wrapped, trade: job.trade, description: job.description, seg: job.seg, measurement: m, tenant, caseId: c.id });
      if (job.tamperQuote?.material && out.quote.total != null) {
        out.quote.rates = { ...out.quote.rates, material: job.tamperQuote.material };
        const area = m.areaM2;
        const mat = Math.round(area * job.tamperQuote.material * 100) / 100;
        out.quote.lines = [{ ...out.quote.lines[0], amount: mat }, out.quote.lines[1]];
        out.quote.total = Math.round((mat + out.quote.lines[1].amount) * 100) / 100;
        out.quote.low = Math.round(out.quote.total * 0.8);
        out.quote.high = Math.round(out.quote.total * 1.2);
      }
      Object.assign(c, { segmentation: job.seg, measurement: m, assessment: out.assessment, quote: out.quote, verification: out.verification });
      const js = jobStatus(c, { tenant, slots: [] });
      const usage = out.verification.runs.flatMap((r) => r.usage || []).filter(Boolean);
      const tokIn = usage.reduce((s, u) => s + (u.tokens?.input || 0), 0);
      const tokOut = usage.reduce((s, u) => s + (u.tokens?.output || 0), 0);
      row = {
        status: js.status,
        tier: out.verification.route.tier,
        effort: out.verification.route.effort,
        reviews: out.verification.runs.length,
        judge: out.verification.judge.verdict,
        coverage: js.cover ? `${js.cover.proven}/${js.cover.total}` : "-",
        tokens: usage.some((u) => u.tokens) ? `${tokIn}/${tokOut}` : "0",
        why: js.reasons[0] || "All checks passed.",
      };
    }
    // A job can also require a note on the card, e.g. the salon's allergy patch test before any colour service.
    let flagOk = true;
    if (job.expectFlag && c.assessment) {
      flagOk = (c.assessment.clinicianFlags || []).some((f) => job.expectFlag.test(String(f)));
      if (!flagOk) row.why = `Missing on the card: ${String(job.expectFlag).replace(/^\/|\/i?$/g, "")}`;
    }
    row = { id: job.id, trade: job.trade, title: job.title, expected: job.expected, ...row, correct: row.status === job.expected && flagOk, ms: Math.round(now() - started) };
    rows.push(row);
    onRow(row);
  }
  return { rows, correct: rows.filter((r) => r.correct).length, total: rows.length };
}

export function toMarkdown({ rows, correct, total }, provider = "mock") {
  const head = "| Job | Trade | Case | Expected | Result | Correct | Router tier · effort | Reviews | Judge | Checklist | Tokens in/out | Time |\n|---|---|---|---|---|---|---|---|---|---|---|---|";
  const body = rows.map((r) => `| ${r.id} | ${r.trade} | ${r.title} | ${r.expected} | ${r.status} | ${r.correct ? "yes" : "**no**"} | ${r.tier} · ${r.effort} | ${r.reviews} | ${r.judge} | ${r.coverage} | ${r.tokens ?? "-"} | ${r.ms} ms |`).join("\n");
  return `Provider: ${provider}. ${correct}/${total} jobs reached the expected outcome.\n\n${head}\n${body}\n`;
}
