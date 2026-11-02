// Plan, act, verify (Agents 101 + 102), shared by the live chat and the eval set.
// The router picks a tier, the model drafts the assessment card, the quote comes from the rate card (never the
// model), and a separate reviewer pass checks the card against the evidence. A failed review is fed back and the
// draft retried one tier up; after the trade's limit the job is escalated to a person instead of looping.
import { policyFor } from "../config/policy.js";
import { route } from "./router.js";
import { draftQuote, draftServiceQuote } from "./quote.js";

const HAZARD = /\b(spark|sparking|burning smell|exposed wir|live wire|collaps)/i;

export async function assessAndVerify({ ai, trade, description = "", urgency = null, seg, measurement = null, dataUrl = null, tenant, caseId = null, onProgress = () => {} }) {
  const spa = trade === "medspa";
  const pol = policyFor(trade);
  const hazard = HAZARD.test(description);
  const signals = { emergency: hazard, regions: seg?.regions?.length || 0 };
  const runs = [];
  let feedback = null;
  let a;
  let q;
  let judge;
  let r;
  for (let attempt = 0; attempt < pol.maxRetries; attempt++) {
    r = route("assess", { ...signals, attempt, conflict: !!feedback?.some((i) => i.type === "contradiction") });
    if (attempt > 0) onProgress(`Second look (${attempt + 1} of ${pol.maxRetries})…`);
    a = await ai.assess({ trade, description, urgency, segmentation: seg, measurement, dataUrl, tenant, route: r, feedback, caseId });
    const base = spa
      ? draftServiceQuote({ service: (tenant.services || []).find((s) => s.id === a.serviceMatch?.[0]?.serviceId), disclaimer: tenant.disclaimer })
      : draftQuote({ material: a.material.name, measurement, rateCard: tenant.rateCard });
    q = { ...base, status: "draft", history: [{ status: "draft", at: new Date().toISOString(), by: "ai" }] };
    onProgress(spa ? "Checking it against your notes…" : "Checking it against your photo…");
    const jr = route("judge", { ...signals, emergency: hazard || !!a.emergency?.isEmergency });
    judge = await ai.judgeAssessment({ trade, description, segmentation: seg, measurement, assessment: a, quote: q, dataUrl, tenant, route: jr, caseId });
    runs.push({ attempt: attempt + 1, at: new Date().toISOString(), route: { tier: r.tier, effort: r.effort, reason: r.reason }, judge: { verdict: judge.verdict, issues: judge.issues }, usage: [a.usage || null, judge.usage || null] });
    if (judge.verdict === "PASS") break;
    feedback = judge.issues;
  }
  const finalRoute = route("assess", { ...signals, emergency: hazard || !!a.emergency?.isEmergency });
  const escalated = judge.verdict !== "PASS";
  const verification = {
    runs,
    judge: { verdict: judge.verdict, issues: judge.issues },
    escalated,
    forceHuman: finalRoute.forceHuman,
    route: { tier: r.tier, effort: r.effort, reason: escalated ? `Failed ${runs.length} reviews: escalated to a person.` : finalRoute.forceHuman ? finalRoute.reason : r.reason },
    at: new Date().toISOString(),
  };
  return { assessment: a, quote: q, verification };
}
