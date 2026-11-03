import { test } from "node:test";
import assert from "node:assert/strict";
import { layer1, checklist, coverage, verdict, jobStatus } from "../src/lib/verify.js";
import { route } from "../src/lib/router.js";
import { policyFor } from "../src/config/policy.js";
import { TENANTS } from "../src/lib/seed.js";
import { draftQuote } from "../src/lib/quote.js";
import * as mock from "../src/gateway/providers/mock.js";

const tenant = TENANTS["summit-ridge"];
const measurement = { areaPercent: 7.4, areaM2: 0.53, basis: "reference", reference: { label: "shingle tab", knownWidthM: 0.305 } };
const seg = { regions: [{ label: "missing and lifted shingle tabs", polygon: [] }], reference: { label: "shingle tab" } };
const assessment = { failedPart: "Lifted shingles", material: { name: "asphalt shingle", confidence: 0.78 }, emergency: null, confidence: 0.72 };
const base = () => ({
  id: "c1",
  trade: "roofing",
  description: "Water dripping through the bedroom ceiling",
  customer: { address: "14 Larkspur Lane, Lyons" },
  photo: { quality: { issues: [] } },
  segmentation: seg,
  measurement,
  assessment,
  quote: { ...draftQuote({ material: "asphalt shingle", measurement, rateCard: tenant.rateCard }), status: "draft" },
  verification: { judge: { verdict: "PASS", issues: [] }, escalated: false, forceHuman: false },
  messages: [{ role: "assistant", content: "Here's a draft range. A roofer confirms the price on site." }],
});

test("a clean job verifies: every coded check passes and the checklist clears the bar", () => {
  const js = jobStatus(base(), { tenant });
  assert.equal(js.status, "verified", js.reasons.join(" | "));
  assert.equal(js.cover.proven, 6);
});

test("Layer 1 names the exact reason: missing address, area claimed without a reference, off-card rate", () => {
  const c = base();
  c.customer.address = "";
  c.measurement = { ...measurement, reference: null };
  c.quote.rates.material = 450;
  const fails = layer1(c, { tenant }).filter((k) => k.status === "fail").map((k) => k.reason).join(" ");
  assert.match(fails, /Missing: address/);
  assert.match(fails, /area is claimed with no reference/);
  assert.match(fails, /\$450\/m² is not on the rate card/);
});

test("line items must add up to the total shown", () => {
  const c = base();
  c.quote.total += 50;
  const q = layer1(c, { tenant }).find((k) => k.id === "quote");
  assert.equal(q.status, "fail");
  assert.match(q.reason, /add up to/);
});

test("banned content in a reply fails the content check", () => {
  const c = base();
  c.messages.push({ role: "assistant", content: "We're fully licensed and insured." });
  assert.equal(layer1(c, { tenant }).find((k) => k.id === "content").status, "fail");
});

test("checklist: unknown is NOT PROVEN with the gap named, safety hazards are ESCALATED, required items block", () => {
  const c = base();
  c.description = "Some tiles slipped";
  c.assessment = { ...assessment, material: { name: "clay tile", confidence: 0.4 }, emergency: { isEmergency: true, reason: "Sparks" } };
  const items = checklist(c, policyFor("roofing"));
  assert.equal(items.find((i) => i.id === "leak").status, "not_proven");
  assert.equal(items.find((i) => i.id === "safety").status, "escalated");
  const cov = coverage(items, 0.8);
  assert.equal(cov.pass, false);
  assert.ok(cov.blocking.includes("Roof material"));
});

test("a failed reviewer pass with escalation makes the job escalated, with the judge's words", () => {
  const v = verdict({ checks: [], cover: null, judge: { verdict: "FAIL", issues: [{ type: "contradiction", detail: "Gutter vs shingles." }], escalated: true } });
  assert.equal(v.status, "escalated");
  assert.match(v.reasons[0], /Gutter vs shingles/);
});

test("router: small for chat, medium for a clear job, large and human review for safety or several problems; steps up on retry", () => {
  assert.equal(route("converse").tier, "small");
  assert.equal(route("assess", { regions: 1 }).tier, "medium");
  const safety = route("assess", { emergency: true });
  assert.equal(safety.tier, "large");
  assert.equal(safety.forceHuman, true);
  assert.equal(route("assess", { regions: 2 }).forceHuman, true);
  assert.equal(route("assess", { regions: 1, attempt: 1 }).tier, "large");
  assert.equal(route("assess", { regions: 1, attempt: 2 }).tier, "large");
});

test("mock reviewer flags a contradiction between the description and the photo, and passes a consistent card", async () => {
  const bad = await mock.judgeAssessment({ trade: "roofing", description: "The gutter is hanging off", segmentation: seg, measurement, assessment });
  assert.equal(bad.verdict, "FAIL");
  assert.equal(bad.issues[0].type, "contradiction");
  const good = await mock.judgeAssessment({ trade: "roofing", description: "Water through the ceiling", segmentation: seg, measurement, assessment, quote: base().quote });
  assert.equal(good.verdict, "PASS");
});

test("coded check: a photo that contradicts the description escalates at once, before the model reviewer", async () => {
  const { photoContradiction } = await import("../src/lib/verify.js");
  const { assessAndVerify } = await import("../src/lib/pipeline.js");
  const shingles = { regions: [{ label: "missing and lifted shingle tabs" }] };
  assert.match(photoContradiction("The gutter is hanging off the front of the house", shingles).detail, /describes the gutter/);
  assert.equal(photoContradiction("Water dripping through the bedroom ceiling", shingles), null, "symptoms are not a part");
  assert.equal(photoContradiction("Shingles blew off in the storm", shingles), null);
  assert.equal(photoContradiction("The gutter is loose", { regions: [{ label: "damaged covering" }, { label: "sagging gutter" }] }), null);
  let judged = 0;
  const ai = { ...mock, judgeAssessment: (x) => (judged++, mock.judgeAssessment(x)) };
  const out = await assessAndVerify({ ai, trade: "roofing", description: "The gutter is hanging off the front of the house", seg: { ...seg, regions: [{ ...seg.regions[0], label: "missing and lifted shingle tabs" }] }, measurement, tenant: TENANTS["summit-ridge"] });
  assert.equal(judged, 0, "the model reviewer is not asked when the coded check already failed");
  assert.equal(out.verification.escalated, true);
  assert.equal(out.verification.runs.length, 1);
  assert.equal(out.verification.runs[0].judge.layer, "coded");
});
