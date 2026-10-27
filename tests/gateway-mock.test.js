import { test } from "node:test";
import assert from "node:assert/strict";
import * as mock from "../src/gateway/providers/mock.js";
import { runContract } from "./contract.js";
import { measure } from "../src/lib/eye.js";

test("mock provider honours the gateway contract", async () => {
  await runContract(mock);
});

test("mock: a photo named *noref* has no reference, so measurement has no square metres", async () => {
  const seg = await mock.segmentDamage({ photoName: "roof-noref.jpg" });
  assert.equal(seg.reference, null);
  const m = measure({ polygon: seg.regions[0].polygon, reference: seg.reference, tiltDeg: seg.tiltDeg });
  assert.equal(m.areaM2, null);
  assert.equal(m.siteVisitNeeded, true);
});

test("mock: a photo with a reference measures in square metres", async () => {
  const seg = await mock.segmentDamage({ photoName: "roof-test.jpg" });
  const m = measure({ polygon: seg.regions[0].polygon, reference: seg.reference, tiltDeg: seg.tiltDeg });
  assert.ok(m.areaM2 > 0);
  assert.equal(m.basis, "reference");
});

test("mock: converse asks description → address → photo → assess, one step at a time", async () => {
  const s0 = { description: "", address: "", photo: false, lastQuestion: "ask_description" };
  const c1 = await mock.converse({ messages: [{ role: "user", content: "Leak over the kitchen" }], caseState: s0 });
  assert.equal(c1.nextAction, "ask_address");
  assert.equal(c1.extracted.description, "Leak over the kitchen");
  assert.equal(c1.extracted.urgency, "urgent");
  const s1 = { ...s0, description: c1.extracted.description, lastQuestion: "ask_address" };
  const c2 = await mock.converse({ messages: [{ role: "user", content: "9 Elm St, Lyons" }], caseState: s1 });
  assert.equal(c2.nextAction, "ask_photo");
  assert.equal(c2.extracted.address, "9 Elm St, Lyons");
  const s2 = { ...s1, address: "9 Elm St, Lyons", photo: true, lastQuestion: "ask_photo" };
  const c3 = await mock.converse({ messages: [], caseState: s2 });
  assert.equal(c3.nextAction, "assess");
});

test("mock: water near electrics is an emergency; a plain leak is not", async () => {
  const e = await mock.assess({ description: "water dripping onto the light fitting and sparking" });
  assert.equal(e.emergency?.isEmergency, true);
  assert.ok(e.emergency.actions.length >= 3);
  const n = await mock.assess({ description: "a slow drip in the hallway" });
  assert.equal(n.emergency, null);
});
