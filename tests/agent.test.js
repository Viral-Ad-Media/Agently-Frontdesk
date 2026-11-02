import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgentTurn, ungroundedClaims, TOOLS } from "../src/lib/agent.js";
import * as mock from "../src/gateway/providers/mock.js";
import { seedState } from "../src/lib/seed.js";

const st = seedState();
const tenant = st.tenants["summit-ridge"];
const spa = st.tenants["luma-skin"];
const now = new Date(st.slots[0].start).getTime() - 3600e3; // an hour before the first seeded slot
const data = { slots: st.slots.filter((s) => s.tenantId === tenant.id), cases: [], current: {}, stormRuns: [] };
const turn = (text, caseState = {}, extra = {}) =>
  runAgentTurn({ ai: mock, trade: "roofing", tenant, messages: [{ role: "user", content: text }], caseState, data, now, ...extra });

test("a timing question checks the real calendar and quotes only open slots", async () => {
  const r = await turn("Can someone come out tomorrow?");
  assert.equal(r.trace.steps[0].tool, "check_calendar");
  const first = TOOLS.check_calendar.run({ slots: data.slots, args: {}, now }).open[0];
  assert.ok(r.reply.includes(first.time), r.reply);
  assert.equal(r.trace.grounded, true);
});

test("a pure question is not taken as the job description", async () => {
  const r = await turn("How much do you charge?");
  assert.equal(r.trace.steps[0].tool, "rate_card");
  assert.equal(r.extracted.description, undefined);
  assert.equal(r.nextAction, "ask_description");
  assert.match(r.reply, /\$45 per square metre/);
  assert.doesNotMatch(r.reply, /total/i);
});

test("a question with damage in it answers and still qualifies the job", async () => {
  const r = await turn("Water is dripping through the ceiling, can you come today?");
  assert.equal(r.trace.steps[0].tool, "check_calendar");
  assert.match(r.extracted.description, /dripping/);
  assert.equal(r.nextAction, "ask_address");
});

test("unknown facts are said to be unknown, never invented", async () => {
  const r = await turn("Are you insured?");
  assert.equal(r.trace.steps[0].tool, "business_facts");
  assert.match(r.reply, /isn't on my record/);
  assert.match(r.reply, /Central Texas/);
});

test("earlier enquiries from the same address are found", async () => {
  const before = { id: "old", tenantId: tenant.id, createdAt: "2026-10-20T10:00:00Z", description: "Hail cracked tiles", customer: { address: "14 Larkspur Lane, Lyons" }, quote: { status: "sent" } };
  const current = { id: "new", tenantId: tenant.id, customer: { address: "14 larkspur lane lyons" } };
  const r = await turn("Did you get my photos before?", { address: current.customer.address }, { data: { ...data, cases: [before, current], current } });
  assert.equal(r.trace.steps[0].tool, "customer_history");
  assert.match(r.reply, /Hail cracked tiles/);
});

test("med spa price questions read the published menu", async () => {
  const r = await runAgentTurn({ ai: mock, trade: "medspa", tenant: spa, messages: [{ role: "user", content: "How much is a facial for acne?" }], caseState: {}, data, now });
  assert.equal(r.trace.steps[0].tool, "rate_card");
  assert.match(r.reply, /Clarifying acne facial \$110 to \$160/);
});

test("ordinary answers use no tools and match converse", async () => {
  const r = await turn("Water dripping through the bedroom ceiling");
  assert.equal(r.trace.steps.filter((s) => s.tool).length, 0);
  assert.equal(r.nextAction, "ask_address");
});

test("the grounding check holds back times and prices no tool returned", async () => {
  assert.deepEqual(ungroundedClaims("We can come at 4:30 PM for $199.", [{ result: { open: [{ time: "9:00 AM" }] } }]), ["4:30 PM", "$199"]);
  assert.deepEqual(ungroundedClaims("9:00 AM works, labour is $35 an hour.", [{ result: { open: [{ time: "9:00 AM" }], labourPerHour: 35 } }]), []);
  const liar = { agentStep: async ({ observations }) => (observations.length ? { action: "answer", reply: "We're free at 4:30 PM.", extracted: {}, nextAction: "ask_description", fallbackQuestion: "What's going on with the roof?" } : { action: "tool", tool: "check_calendar", args: {} }) };
  const r = await runAgentTurn({ ai: liar, trade: "roofing", tenant, messages: [{ role: "user", content: "When can you come?" }], caseState: {}, data, now });
  assert.equal(r.trace.grounded, false);
  assert.doesNotMatch(r.reply, /4:30/);
});

test("the loop stops after the step limit and must answer", async () => {
  let calls = 0;
  const greedy = { agentStep: async ({ mustAnswer }) => (calls++, mustAnswer ? { action: "answer", reply: "Here is what I found.", extracted: {}, nextAction: "none" } : { action: "tool", tool: "business_facts", args: { topic: String(calls) } }) };
  const r = await runAgentTurn({ ai: greedy, trade: "roofing", tenant, messages: [{ role: "user", content: "Tell me everything?" }], caseState: {}, data, now });
  assert.equal(calls, 4);
  assert.equal(r.reply, "Here is what I found.");
});

test("business_facts includes the summary and the website quotes read at setup", () => {
  const tenant = { name: "Peak Roofing", trade: "roofing", serviceArea: "Denver", words: { visitLong: "free roof inspection" }, setup: { summary: "Family roofer since 1998.", evidence: [{ field: "serviceArea", quote: "Serving the Denver metro" }, { field: "services", quote: "Storm damage repair" }] } };
  const out = TOOLS.business_facts.run({ tenant });
  assert.equal(out.about, "Family roofer since 1998.");
  assert.deepEqual(out.facts, ['serviceArea: "Serving the Denver metro"', 'services: "Storm damage repair"']);
  assert.deepEqual(TOOLS.business_facts.run({ tenant: { name: "X" } }).facts, []);
});
