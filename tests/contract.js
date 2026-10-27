// Gateway contract: the return shapes every provider must honour.
// Run it against any provider module (mock today, interim and Meta later).
import assert from "node:assert/strict";

const inRange = (n) => typeof n === "number" && n >= 0 && n <= 1000;
const SEVERITIES = ["Minor", "Moderate", "Severe"];
const ACTIONS = ["ask_description", "ask_address", "ask_photo", "assess", "none"];

export async function runContract(provider, { photo = { photoName: "roof-test.jpg", width: 1200, height: 900 } } = {}) {
  // segmentDamage
  const seg = await provider.segmentDamage(photo);
  assert.ok(Array.isArray(seg.regions) && seg.regions.length > 0, "segmentDamage returns at least one region");
  for (const r of seg.regions) {
    assert.equal(typeof r.label, "string");
    assert.equal(r.bbox.length, 4);
    assert.ok(r.bbox.every(inRange), "bbox is normalised 0-1000");
    assert.ok(r.polygon.length >= 3 && r.polygon.every(([x, y]) => inRange(x) && inRange(y)), "polygon is normalised 0-1000");
    assert.ok(r.areaPercent > 0 && r.areaPercent < 100, "region is never the whole image");
  }
  if (seg.reference !== null) {
    assert.equal(typeof seg.reference.label, "string");
    assert.ok(seg.reference.knownWidthM > 0);
    assert.ok(seg.reference.bbox.every(inRange));
  }
  assert.equal(typeof seg.tiltDeg, "number");
  assert.ok(seg.confidence >= 0 && seg.confidence <= 1);

  // assess
  const a = await provider.assess({
    trade: "roofing",
    description: "water dripping through the bedroom ceiling",
    urgency: "urgent",
    segmentation: seg,
    measurement: { areaPercent: 4.4, areaM2: 0.53, basis: "reference" },
  });
  assert.equal(typeof a.summary, "string");
  assert.ok(SEVERITIES.includes(a.severity));
  assert.equal(typeof a.material.name, "string");
  assert.ok(a.material.confidence >= 0 && a.material.confidence <= 1);
  assert.ok(Array.isArray(a.material.alternatives));
  assert.equal(typeof a.failedPart, "string");
  assert.ok(Array.isArray(a.workNeeded) && a.workNeeded.length > 0);
  assert.ok(a.emergency === null || typeof a.emergency.isEmergency === "boolean");
  assert.ok(a.confidence >= 0 && a.confidence <= 1);
  assert.equal(a.total, undefined, "assess never prices; the quote comes from the rate card");

  // converse: first turn extracts a description and moves to the address
  const c1 = await provider.converse({
    trade: "roofing",
    messages: [{ role: "user", content: "Tiles slipped at the back of the house" }],
    caseState: { description: "", address: "", photo: false, lastQuestion: "ask_description" },
  });
  assert.equal(typeof c1.reply, "string");
  assert.ok(ACTIONS.includes(c1.nextAction));
  assert.equal(typeof c1.extracted, "object");

  // reactivateMessage: no history is labelled generic
  const r = await provider.reactivateMessage({ lead: { name: "Sam", history: [] } });
  assert.equal(typeof r.message, "string");
  assert.equal(r.generic, true);
  assert.ok(!/discount|% off/i.test(r.message), "no invented discounts");
}
