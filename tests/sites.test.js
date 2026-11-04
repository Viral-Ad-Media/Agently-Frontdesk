// Rate cards read from a website, returning customers, website routing and the cross-device layer.
import test from "node:test";
import assert from "node:assert/strict";
import { readRateCard, rateCardFromSite, mergeRateCard, perSqFt, fromSqFt } from "../src/lib/rateCard.js";
import { earlierEnquiries, sameAddress, tenantForSite } from "../src/lib/returning.js";
import { buildTenant, hostOf } from "../src/lib/onboard.js";
import { handleCloud } from "../server/cloud.js";

const SITE = `Our rates
Asphalt shingle (architectural) $4.50 per sq ft $48 per m²
Metal sheet (standing seam) $7.25 per sq ft $78 per m²
Labour, per roofer $65 per hour
Repairs 2-hour minimum on all repairs
Leak repair $350 – $900`;

test("printed roofing rates are read and converted to the desk's unit", () => {
  const rc = rateCardFromSite(readRateCard(SITE), SITE);
  assert.deepEqual(rc.materials, { "asphalt shingle": 48, "metal sheet": 78 });
  assert.equal(rc.labourPerHour, 65);
  assert.equal(rc.minimumHours, 2);
  assert.equal(fromSqFt(4.5), 48);
  assert.equal(perSqFt(48), 4.46);
});

test("a rate the site never printed is dropped, and per-sq-ft rates are converted", () => {
  const rc = rateCardFromSite({ materials: [{ material: "clay tile", price: 99, unit: "m2" }, { material: "metal sheet", price: 7.25, unit: "sqft" }], labourPerHour: 80, minimumHours: 5 }, SITE);
  assert.deepEqual(rc.materials, { "metal sheet": 78 });
  assert.equal(rc.labourPerHour, null);
  assert.equal(rc.minimumHours, null);
  assert.equal(rateCardFromSite({ materials: [{ material: "gold leaf", price: 48, unit: "m2" }] }, SITE), null);
});

test("a roofing desk from a site with rates uses them; without rates it says it needs the owner", () => {
  const draft = { name: "Ironwood Roofing", trade: "roofing", serviceArea: "Oklahoma City", services: [], evidence: [] };
  const withRates = buildTenant({ ...draft, rateCard: rateCardFromSite(readRateCard(SITE), SITE) }, { url: "https://www.ironwood-roofing.vercel.app/" }).tenant;
  assert.equal(withRates.rateCard.source, "website");
  assert.equal(withRates.rateCard.materials["asphalt shingle"], 48);
  assert.equal(withRates.setup.host, "ironwood-roofing.vercel.app");
  assert.ok(!withRates.setup.needs.some((n) => /rate card/.test(n)));
  const without = buildTenant(draft, { url: "https://example.com" }).tenant;
  assert.equal(without.rateCard.source, "template");
  assert.ok(without.setup.needs.some((n) => /rate card/.test(n)));
  assert.equal(mergeRateCard({ materials: { "clay tile": 70 }, labourPerHour: null, minimumHours: null, evidence: [] }).needs.length, 1);
});

test("a website finds its desk, and an address matches earlier enquiries", () => {
  const t = { id: "iron-1", setup: { url: "https://ironwood-roofing.vercel.app/", host: "ironwood-roofing.vercel.app", at: "2026-11-04" } };
  assert.equal(tenantForSite({ [t.id]: t }, "www.ironwood-roofing.vercel.app")?.id, "iron-1");
  assert.equal(tenantForSite({ [t.id]: t }, "other.vercel.app"), null);
  assert.equal(hostOf("HTTPS://WWW.Example.com/pricing"), "example.com");
  assert.ok(sameAddress("14 Larkspur Lane, Austin, TX", "14 larkspur ln austin tx"));
  assert.ok(!sameAddress("14 Larkspur Lane", "41 Larkspur Lane"));
  const cases = [
    { id: "a", tenantId: "iron-1", createdAt: "2026-11-01", description: "Hail damage", customer: { address: "22 Elm St, Edmond, OK" } },
    { id: "b", tenantId: "other", createdAt: "2026-11-02", description: "Leak", customer: { address: "22 Elm St, Edmond, OK" } },
  ];
  const now = { id: "c", tenantId: "iron-1", customer: { address: "22 elm street edmond ok" } };
  assert.deepEqual(earlierEnquiries(now, cases).map((x) => x.id), ["a"]);
});

test("cloud: publish, owner-only updates, alerts dedupe and lead snapshots", async () => {
  const env = {};
  const tenant = { id: "iron-1", name: "Ironwood", trade: "roofing", setup: { host: "ironwood-test.example" } };
  const pub = await handleCloud("desk", "POST", {}, { tenant }, env);
  assert.ok(pub.ownerKey);
  assert.equal((await handleCloud("desk", "GET", { site: "www.ironwood-test.example" }, {}, env)).tenant.name, "Ironwood");
  await assert.rejects(handleCloud("desk", "POST", {}, { tenant: { ...tenant, name: "Squatter" } }, env), /another browser/);
  await assert.rejects(handleCloud("alerts", "GET", { site: "ironwood-test.example", key: "wrong" }, {}, env), /Only the owner/);
  const first = await handleCloud("alerts", "POST", {}, { action: "notify", host: "ironwood-test.example", caseId: "case-1", kind: "new", lead: { id: "case-1", tenantId: "iron-1" } }, env);
  assert.equal(first.duplicate, undefined);
  const again = await handleCloud("alerts", "POST", {}, { action: "notify", host: "ironwood-test.example", caseId: "case-1", kind: "new" }, env);
  assert.equal(again.duplicate, true);
  const { leads } = await handleCloud("alerts", "GET", { site: "ironwood-test.example", key: pub.ownerKey, leads: "1" }, {}, env);
  assert.equal(leads[0].id, "case-1");
  const st = await handleCloud("alerts", "POST", {}, { action: "subscribe", host: "ironwood-test.example", ownerKey: pub.ownerKey, email: "owner@example.com" }, env);
  assert.equal(st.email, "owner@example.com");
  await assert.rejects(handleCloud("alerts", "POST", {}, { action: "subscribe", host: "ironwood-test.example", ownerKey: pub.ownerKey, email: "nope" }, env), /doesn't look right/);
});

test("reset demo keeps old cloud leads out of a clean desk", async () => {
  const { remoteLeadsToTake } = await import("../src/lib/remoteLeads.js");
  const tenants = { ironwood: { id: "ironwood" } };
  const old = { id: "c-old", tenantId: "ironwood", createdAt: "2026-11-04T05:00:00.000Z", updatedAt: "2026-11-04T05:01:00.000Z" };
  const fresh = { id: "c-new", tenantId: "ironwood", createdAt: "2026-11-04T07:00:00.000Z", updatedAt: "2026-11-04T07:01:00.000Z" };
  const stranger = { id: "c-x", tenantId: "someone-else", createdAt: "2026-11-04T07:00:00.000Z" };
  const resetAt = "2026-11-04T06:00:00.000Z";
  assert.deepEqual(remoteLeadsToTake([old, fresh, stranger], { cases: [], tenants, resetAt }).map((l) => l.id), ["c-new"]);
  // Without a reset both of this desk's leads come in; a lead the desk already holds locally is not taken again.
  assert.deepEqual(remoteLeadsToTake([old, fresh], { cases: [], tenants }).map((l) => l.id), ["c-old", "c-new"]);
  assert.deepEqual(remoteLeadsToTake([fresh], { cases: [{ ...fresh }], tenants }), []);
  // A newer copy of a lead that came from the cloud replaces the older one.
  const newer = { ...fresh, updatedAt: "2026-11-04T07:05:00.000Z" };
  assert.equal(remoteLeadsToTake([newer], { cases: [{ ...fresh, remote: true }], tenants }).length, 1);
});

test("iPhone Home Screen app opens on the private alerts link", async () => {
  const { alertsManifest } = await import("../api/manifest.js");
  const m = alertsManifest({ desk: "ironwood-roofing-okc.vercel.app", key: "AbC123_-xyzXYZ0987654321" });
  assert.equal(m.start_url, "/alerts?desk=ironwood-roofing-okc.vercel.app&key=AbC123_-xyzXYZ0987654321");
  assert.equal(m.display, "standalone");
  // Anything that isn't a plain host and key falls back to the desk's home.
  assert.equal(alertsManifest({ desk: "evil.com/<script>", key: "x" }).start_url, "/frontdesk");
  assert.equal(alertsManifest({}).start_url, "/frontdesk");
});
