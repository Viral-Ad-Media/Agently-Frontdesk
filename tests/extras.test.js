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
