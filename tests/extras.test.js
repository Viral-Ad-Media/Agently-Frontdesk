import test from "node:test";
import assert from "node:assert/strict";
import { needsPatchTest, earliestStart, PATCH_TEST_HOURS } from "../src/lib/patchTest.js";
import { aftercareDraft, hasAftercare } from "../src/lib/aftercare.js";

const salon = { trade: "salon", name: "Fern & Fringe" };
const spa = { trade: "medspa", name: "Luma Skin Studio", services: [{ id: "chemical-peel", name: "Chemical peel" }] };

test("salon colour services wait 48 hours after the patch test", () => {
  const colour = { assessment: { serviceMatch: [{ name: "Full colour" }] } };
  const cut = { assessment: { serviceMatch: [{ name: "Cut and finish" }] } };
  const now = 1_000_000;
  assert.equal(needsPatchTest(colour, salon), true);
  assert.equal(needsPatchTest(cut, salon), false);
  assert.equal(needsPatchTest(colour, { trade: "barber" }), false);
  assert.equal(earliestStart(colour, salon, now), now + PATCH_TEST_HOURS * 3600e3);
  assert.equal(earliestStart(cut, salon, now), now);
});

test("a clinician flag about the patch test also holds the booking", () => {
  const c = { assessment: { clinicianFlags: ["Colour service: allergy patch test at least 48 hours before"] } };
  assert.equal(needsPatchTest(c, salon), true);
});

test("med spa aftercare drafts use the clinic's sheet for the matched service", () => {
  const c = { customer: { name: "Maya Ortiz" }, assessment: { serviceMatch: [{ serviceId: "chemical-peel" }] } };
  const text = aftercareDraft(c, spa);
  assert.equal(hasAftercare(spa), true);
  assert.equal(hasAftercare(salon), false);
  assert.match(text, /^Hi Maya,/);
  assert.match(text, /Chemical peel/);
  assert.match(text, /SPF/);
  assert.doesNotMatch(text, /diagnos/i);
});

test("an unmatched visit gets the generic aftercare line", () => {
  const text = aftercareDraft({ customer: {}, assessment: {} }, spa);
  assert.match(text, /^Hi,/);
  assert.match(text, /aftercare sheet your clinician gave you/);
});

import { trustFor, demoTrust } from "../src/lib/trust.js";
import { scoreLead } from "../src/lib/leadScore.js";
import { followUpPlan, CADENCE } from "../src/lib/followups.js";

test("trust card: demo credentials are labelled demo; a website business shows only its own words", () => {
  const demo = trustFor({ trust: demoTrust("summit-ridge") });
  assert.equal(demo.source, "demo");
  assert.ok(demo.lines.some((l) => l.label === "Licence"));
  const site = trustFor({ setup: { evidence: [{ field: "about", quote: "Fully licensed and insured since 2011" }, { field: "services", quote: "Roof repair" }] } });
  assert.equal(site.source, "website");
  assert.deepEqual(site.lines.map((l) => l.value), ['"Fully licensed and insured since 2011"']);
  assert.equal(trustFor({}).lines.length, 0);
});

test("lead score: booked with a photo is hot, an empty chat is cold, reasons are given", () => {
  const hot = scoreLead({ bookingSlotId: "s1", photo: {}, customer: { address: "1 Oak St" }, assessment: {}, description: "leak" });
  assert.equal(hot.level, "hot");
  assert.ok(hot.reasons.includes("Visit booked"));
  assert.equal(scoreLead({ customer: {} }).level, "cold");
  const now = Date.parse("2026-11-20T12:00:00Z");
  const stale = scoreLead({ photo: {}, customer: { address: "x" }, assessment: {}, description: "x", quote: { history: [{ status: "sent", at: "2026-11-05T12:00:00Z" }] } }, { now });
  assert.ok(stale.reasons.some((r) => /No booking 15 days/.test(r)));
});

test("follow-ups: day 3, 7 and 14 after the quote is sent, stopped once booked", () => {
  const tenant = { name: "Summit Ridge Roofing", words: { visitLong: "free inspection", pro: "roofer" } };
  const c = { customer: { name: "Dana Cole" }, assessment: { failedPart: "Lifted shingles" }, quote: { history: [{ status: "sent", at: "2026-11-03T12:00:00Z" }] } };
  assert.equal(followUpPlan({ quote: { history: [] } }, tenant), null);
  const plan = followUpPlan(c, tenant, Date.parse("2026-11-07T12:00:00Z"));
  assert.deepEqual(plan.steps.map((s) => s.day), CADENCE);
  assert.equal(plan.steps[0].isDue, true);
  assert.equal(plan.steps[1].isDue, false);
  assert.match(plan.steps[0].text, /^Hi Dana, it's Aura from Summit Ridge Roofing/);
  assert.ok(plan.steps.every((s) => s.status === "draft"));
  assert.ok(followUpPlan({ ...c, bookingSlotId: "s1" }, tenant).stopped);
});
