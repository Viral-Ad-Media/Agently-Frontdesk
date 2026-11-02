import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leadPoint, pointInRing, customersInStorm, rehearsalStorm, parseAlerts, normalizeAlert, stormWhen, leadArea, fetchLiveStorms } from "../src/lib/storm.js";
import { reactivateMessage } from "../src/gateway/providers/mock.js";

const leads = JSON.parse(readFileSync(new URL("../src/lib/leads.json", import.meta.url)));

test("every synthetic lead gets a stable location in its own city", () => {
  for (const l of leads) {
    const p = leadPoint(l);
    assert.ok(p, `no point for ${l.address}`);
    assert.deepEqual(leadPoint(l), p, "location is stable");
  }
  const austin = leadPoint(leads.find((l) => l.address.includes("Austin")));
  assert.ok(Math.abs(austin[0] - -97.74) < 0.2 && Math.abs(austin[1] - 30.27) < 0.2);
});

test("point in polygon: inside, outside, concave edge", () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  assert.equal(pointInRing([5, 5], sq), true);
  assert.equal(pointInRing([15, 5], sq), false);
  const u = [[0, 0], [10, 0], [10, 10], [7, 10], [7, 3], [3, 3], [3, 10], [0, 10], [0, 0]];
  assert.equal(pointInRing([5, 8], u), false, "inside the notch of a U is outside");
  assert.equal(pointInRing([1, 8], u), true);
});

test("rehearsal storm covers Dallas-Fort Worth customers only, and opt-outs are split out, never contacted", () => {
  const storm = rehearsalStorm(new Date("2026-11-02T08:00:00"));
  assert.equal(storm.source, "rehearsal");
  const { hit, optedOut } = customersInStorm(leads, storm);
  assert.ok(hit.length >= 8, `expected a real crowd in the path, got ${hit.length}`);
  for (const l of hit) assert.match(l.address, /Dallas|Fort Worth/);
  for (const l of hit) assert.equal(l.optOut, false);
  assert.ok(optedOut.every((l) => l.optOut));
  assert.ok(optedOut.length >= 1, "the Dallas opt-out sits in the path and is excluded");
});

test("NWS alerts: storm events with polygons are kept, zone-only and non-storm alerts dropped", () => {
  const fc = {
    features: [
      { id: "a", geometry: { type: "Polygon", coordinates: [[[-97, 32], [-96, 32], [-96, 33], [-97, 32]]] }, properties: { id: "a", event: "Severe Thunderstorm Warning", headline: "SVR", areaDesc: "Dallas, TX", severity: "Severe", onset: "2026-11-02T03:00:00-06:00", ends: "2026-11-02T04:00:00-06:00", parameters: { maxHailSize: ["1.25"], maxWindGust: ["60 MPH"] } } },
      { id: "b", geometry: null, properties: { id: "b", event: "Severe Thunderstorm Watch" } },
      { id: "c", geometry: { type: "Polygon", coordinates: [[[-97, 32], [-96, 32], [-96, 33], [-97, 32]]] }, properties: { id: "c", event: "Flood Advisory" } },
      { id: "d", geometry: { type: "MultiPolygon", coordinates: [[[[-97, 32], [-96, 32], [-96, 33], [-97, 32]]]] }, properties: { id: "d", event: "Tornado Warning", parameters: {} } },
    ],
  };
  const out = parseAlerts(fc);
  assert.deepEqual(out.map((s) => s.id), ["d", "a"], "tornado first, then severe thunderstorm");
  const a = out.find((s) => s.id === "a");
  assert.equal(a.hailIn, 1.25);
  assert.equal(a.windMph, 60);
  assert.equal(a.source, "live");
  assert.equal(normalizeAlert({ properties: { event: "Tornado Warning" }, geometry: null }), null);
});

test("live fetch surfaces a weather-service failure instead of pretending it is calm", async () => {
  await assert.rejects(() => fetchLiveStorms("TX", async () => ({ ok: false, status: 503 })), /503/);
  const ok = await fetchLiveStorms("TX", async () => ({ ok: true, json: async () => ({ features: [] }) }));
  assert.deepEqual(ok, []);
});

test("storm check-in names only what the weather service reported and never claims damage", async () => {
  const lead = leads.find((l) => l.address.includes("Fort Worth") && !l.optOut);
  const storm = rehearsalStorm();
  const r = await reactivateMessage({ lead, tenant: { name: "Summit Ridge Roofing" }, storm: { event: storm.event, area: leadArea(lead), when: "last night", hailIn: 1.75, windMph: 70 } });
  assert.match(r.message, new RegExp(lead.firstName));
  assert.match(r.message, /1\.75 in hail/);
  assert.match(r.message, /Fort Worth/);
  assert.match(r.message, /\?/);
  assert.doesNotMatch(r.message, /your roof is damaged|insurance will|guarantee/i);
  const noHail = await reactivateMessage({ lead, tenant: { name: "X" }, storm: { area: "Fort Worth", when: "last night", windMph: 70 } });
  assert.doesNotMatch(noHail.message, /hail/i, "no hail claim when none was reported");
});

test("stormWhen speaks like a person", () => {
  const now = new Date();
  const lastNight = new Date(now);
  lastNight.setDate(now.getDate() - 1);
  lastNight.setHours(22, 0, 0, 0);
  assert.equal(stormWhen({ onset: lastNight.toISOString() }), "last night");
});

test("claim pack: a case is matched to a storm only inside its path and after it started", async () => {
  const { stormForCase } = await import("../src/lib/storm.js");
  const storm = rehearsalStorm();
  const runs = [{ tenantId: "summit-ridge", storm }];
  const base = { id: "c1", tenantId: "summit-ridge", createdAt: new Date().toISOString() };
  assert.equal(stormForCase({ ...base, customer: { address: "1 Elm Street, Dallas, TX 75201" } }, runs)?.id, storm.id);
  assert.equal(stormForCase({ ...base, customer: { address: "1 Elm Street, Austin, TX 78701" } }, runs), null, "outside the path");
  const before = new Date(new Date(storm.onset).getTime() - 3600e3).toISOString();
  assert.equal(stormForCase({ ...base, createdAt: before, customer: { address: "1 Elm Street, Dallas, TX 75201" } }, runs), null, "enquiry before the storm");
  assert.equal(stormForCase({ ...base, tenantId: "luma-skin", customer: { address: "1 Elm Street, Dallas, TX 75201" } }, runs), null, "other tenant");
});
