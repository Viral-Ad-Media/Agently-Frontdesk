// Returning customers remembered by address (in this browser and on any device), the chat's speed setting,
// and removing a business so its website can be set up again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findAddress, sameAddress, lastAddressIn } from "../src/lib/address.js";
import { upsertHistory, historyFor } from "../src/lib/history.js";
import { planLookups, runAgentTurn } from "../src/lib/agent.js";
import { route } from "../src/lib/router.js";
import * as mock from "../src/gateway/providers/mock.js";
import { seedState } from "../src/lib/seed.js";
import { handleCloud } from "../server/cloud.js";

const st = seedState();
const tenant = st.tenants["summit-ridge"];
const now = new Date(st.slots[0].start).getTime() - 3600e3;
const REMEMBER = "Do you remember me, the guy from 14 Larkspur Lane, Austin, TX?";

test("an address is read from what the customer typed, and filler is not mistaken for one", () => {
  assert.equal(findAddress(REMEMBER), "14 Larkspur Lane, Austin, TX");
  assert.equal(findAddress("its 1418 Sunflower Ln, Wichita, KS 67212"), "1418 Sunflower Ln, Wichita, KS 67212");
  assert.equal(findAddress("I'm at 2905 NW 63rd Terrace, Oklahoma City, OK 73116 and it leaks"), "2905 NW 63rd Terrace, Oklahoma City, OK 73116");
  assert.equal(findAddress("we are at 12 Main Street and the gutters are full"), "12 Main Street");
  for (const no of ["I have 3 leaks in the roof", "5 shingles blew off", "I need 2 people to come this way", "call 555 1234"]) assert.equal(findAddress(no), "", no);
  assert.equal(lastAddressIn([{ role: "user", content: "Roof leak" }, { role: "assistant", content: "Address?" }, { role: "user", content: "14 Larkspur Ln" }]), "14 Larkspur Ln");
});

test("the same property matches however it is written", () => {
  assert.ok(sameAddress("14 Larkspur Lane, Austin, TX", "14 Larkspur Ln"));
  assert.ok(sameAddress("14 Larkspur Lane, Austin, Texas", "14 Larkspur Ln, Austin, TX 78704"));
  assert.ok(!sameAddress("14 Larkspur Ln", "41 Larkspur Ln"));
  assert.ok(!sameAddress("14 Larkspur Ln", ""));
});

test("giving an address looks up earlier enquiries at once, question or not", () => {
  assert.deepEqual(planLookups(REMEMBER, "roofing", { addressGiven: true }).map((p) => p.tool), ["customer_history"]);
  assert.deepEqual(planLookups("It's 14 Larkspur Ln", "roofing", { addressGiven: true }).map((p) => p.tool), ["customer_history"]);
  assert.ok(planLookups("Do you remember me?", "roofing").some((p) => p.tool === "customer_history"));
});

const earlierCase = { id: "case-old", tenantId: tenant.id, createdAt: "2026-10-12T15:00:00Z", description: "Hail cracked shingles over the garage", customer: { address: "14 Larkspur Ln, Austin, TX" }, messages: [{ role: "user", content: "Hail cracked shingles" }] };
const current = { id: "case-new", tenantId: tenant.id, customer: {}, messages: [] };
const ask = (data, text = REMEMBER) => runAgentTurn({ ai: mock, trade: "roofing", tenant, messages: [{ role: "user", content: text }], caseState: {}, data: { slots: [], stormRuns: [], current, ...data }, now });

test("a returning customer is recognised by the address in their message (this browser)", async () => {
  const r = await ask({ cases: [earlierCase, current] });
  const hist = r.trace.steps.find((s) => s.tool === "customer_history");
  assert.equal(hist.result.addressKnown, true);
  assert.equal(hist.result.earlier.length, 1);
  assert.match(r.reply, /Welcome back/);
  assert.match(r.reply, /Hail cracked shingles/);
});

test("a returning customer is recognised from the desk's cloud copy on another device", async () => {
  const r = await ask({ cases: [current], remoteHistory: [{ id: "case-old", at: "2026-10-12T15:00:00Z", reported: "Hail cracked shingles over the garage", status: "visit booked" }] });
  assert.match(r.reply, /Welcome back/);
  assert.match(r.reply, /a visit was booked/);
});

test("a new customer giving an address hears nothing about history", async () => {
  const r = await ask({ cases: [current] }, "Water is coming through the ceiling at 9 Elm Court, Austin, TX");
  assert.ok(r.trace.steps.some((s) => s.tool === "customer_history"));
  assert.doesNotMatch(r.reply, /earlier enquiry|Welcome back/i);
});

test("cloud address book: a lead's address is remembered, the asking case is left out, no contact details", async () => {
  const entries = upsertHistory([], { ...earlierCase, customer: { ...earlierCase.customer, name: "Sam", phone: "555-0100" } });
  const found = historyFor(entries, "14 Larkspur Lane, Austin", "case-new");
  assert.equal(found.length, 1);
  assert.deepEqual(Object.keys(found[0]).sort(), ["at", "id", "reported", "status"]);
  assert.equal(historyFor(entries, "14 Larkspur Lane", "case-old").length, 0);
});

test("cloud: lead sync fills the address book, history is public but minimal, only the owner removes a desk", async () => {
  const env = {};
  const host = "larkspur-test.example";
  const t = { id: "lark-1", name: "Larkspur Roofing", trade: "roofing", setup: { host } };
  const pub = await handleCloud("desk", "POST", {}, { tenant: t }, env);
  await handleCloud("alerts", "POST", {}, { action: "lead", host, caseId: "case-old", lead: { ...earlierCase, tenantId: t.id } }, env);
  const { earlier } = await handleCloud("desk", "GET", { site: host, history: "14 Larkspur Lane, Austin, TX", case: "case-new" }, {}, env);
  assert.equal(earlier.length, 1);
  assert.equal(earlier[0].reported, "Hail cracked shingles over the garage");
  await assert.rejects(handleCloud("alerts", "POST", {}, { action: "lead", host: "nobody.example", caseId: "x", lead: { id: "x" } }, env), /No published desk/);
  await assert.rejects(handleCloud("desk", "POST", {}, { action: "remove", site: host, ownerKey: "wrong" }, env), /Only the owner/);
  const gone = await handleCloud("desk", "POST", {}, { action: "remove", site: host, ownerKey: pub.ownerKey }, env);
  assert.equal(gone.removed, 1);
  await assert.rejects(handleCloud("desk", "GET", { site: host }, {}, env), /No desk is published/);
  assert.deepEqual((await handleCloud("desk", "GET", { site: host, history: "14 Larkspur Ln" }, {}, env)).earlier, []);
  // The same website can be set up again from scratch, by anyone.
  assert.ok((await handleCloud("desk", "POST", {}, { tenant: t }, env)).ownerKey);
});

test("customer chat runs at minimal effort, and a retry steps back up", () => {
  assert.equal(route("converse").effort, "minimal");
  assert.equal(route("converse", { attempt: 1 }).effort, "low");
  assert.equal(route("reactivateMessage").effort, "low");
});
