import { test } from "node:test";
import assert from "node:assert/strict";
import * as mock from "../src/gateway/providers/mock.js";
import { draftServiceQuote } from "../src/lib/quote.js";
import { TENANTS } from "../src/lib/seed.js";

const spa = TENANTS["luma-skin"];

test("med spa: converse asks for consent before a photo and never for an address", async () => {
  const c1 = await mock.converse({ trade: "medspa", messages: [{ role: "user", content: "Redness on my cheeks that flares up" }], caseState: { description: "", consent: false, photo: false } });
  assert.equal(c1.nextAction, "ask_consent");
  assert.equal(c1.extracted.intent, "consultation");
  assert.ok(!/address/i.test(c1.reply));
  const c2 = await mock.converse({ trade: "medspa", messages: [], caseState: { description: "x", consent: true, photo: false } });
  assert.equal(c2.nextAction, "ask_photo");
});

test("med spa: segmentation outlines a concern area and never claims a scale reference", async () => {
  const seg = await mock.segmentDamage({ trade: "medspa", photoName: "face.jpg" });
  assert.equal(seg.reference, null);
  assert.equal(seg.regions[0].label, "area of concern");
});

test("med spa: assessment matches the spa's own services, flags for the clinician, never diagnoses", async () => {
  const a = await mock.assess({ trade: "medspa", description: "redness and sensitivity on my cheeks, I'm pregnant", tenant: spa });
  assert.ok(a.serviceMatch.length >= 1);
  assert.ok(spa.services.some((s) => s.id === a.serviceMatch[0].serviceId), "match is one of the published services");
  assert.ok(a.clinicianFlags.some((f) => /pregnan/i.test(f)));
  assert.ok(!/diagnos|you have|condition is/i.test(a.summary), "no diagnosis language");
  assert.ok(!/guarantee|will clear|results? (are|is) /i.test(a.summary), "no promised result");
  assert.equal(a.emergency, null);
});

test("med spa: the draft range is the published price of the matched service with the spa disclaimer", () => {
  const q = draftServiceQuote({ service: spa.services[0], disclaimer: spa.disclaimer });
  assert.equal(q.low, spa.services[0].priceLow);
  assert.equal(q.high, spa.services[0].priceHigh);
  assert.match(q.disclaimer, /not medical advice/i);
  const none = draftServiceQuote({ service: null, disclaimer: spa.disclaimer });
  assert.equal(none.low, null);
});

test("reactivation: a lead with history gets a personal re-opener from that history, with no invented discount", async () => {
  const lead = { name: "Michael Davis", firstName: "Michael", history: [{ when: "2026-01", topic: "roof replacement (wind damage)", summary: "Asked to postpone roof inspection" }] };
  const r = await mock.reactivateMessage({ lead, tenant: TENANTS["summit-ridge"] });
  assert.equal(r.generic, false);
  assert.match(r.message, /Michael/);
  assert.match(r.message, /January/);
  assert.match(r.message, /roof replacement/);
  assert.ok(!/discount|% off|free/i.test(r.message));
});

test("reactivation: no history means a generic re-opener, labelled generic", async () => {
  const r = await mock.reactivateMessage({ lead: { name: "Sam", firstName: "Sam", history: [] }, tenant: TENANTS["summit-ridge"] });
  assert.equal(r.generic, true);
});
