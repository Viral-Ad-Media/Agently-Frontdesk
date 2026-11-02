import { test } from "node:test";
import assert from "node:assert/strict";
import { deskSnapshot, planAction, confirmWord, readUtterance } from "../src/lib/desk.js";
import * as mock from "../src/gateway/providers/mock.js";

const tenant = { name: "Summit Ridge Roofing", trade: "roofing" };
const cases = [
  { id: "c1", customer: { name: "", address: "14 Larkspur Lane, Lyons" }, quote: { low: 900, high: 1400, status: "awaiting_approval" } },
  { id: "c2", customer: { name: "Dana Ortiz", address: "" }, quote: { low: null, high: null, status: "awaiting_approval" } },
  { id: "c3", customer: { name: "Sent Already" }, quote: { low: 1, high: 2, status: "sent" } },
];
const leads = [
  { id: "l1", name: "Sarah Johnson", message: { status: "draft" } },
  { id: "l2", name: "Opted Out", optOut: true, message: { status: "draft" } },
];
const snap = deskSnapshot({ tenant, cases, leads, summary: "Summit Ridge Roofing, today: 2 enquiries answered." });

test("the snapshot holds only what can still be acted on", () => {
  assert.deepEqual(snap.quotes.map((q) => q.id), ["c1", "c2"]);
  assert.deepEqual(snap.reopeners.map((r) => r.id), ["l1"]);
});

test("an utterance finds the quote by an address word and plans approve-then-send", () => {
  const r = readUtterance("Send the Larkspur quote", snap);
  assert.deepEqual(r, { intent: "send_quote", targetId: "c1" });
  const p = planAction(r, snap);
  assert.deepEqual(p.action.steps, ["approved", "sent"]);
  assert.match(p.action.prompt, /\$900 to \$1,400.*14 Larkspur Lane/);
});

test("a re-opener is found by first name; a quote with no range is refused in words", () => {
  assert.deepEqual(readUtterance("approve Sarah's text", snap), { intent: "approve_reopener", targetId: "l1" });
  assert.match(planAction({ intent: "approve_quote", targetId: "c2" }, snap).error, /no range yet/);
});

test("the model cannot point at something that is not on the desk", () => {
  assert.ok(planAction({ intent: "send_quote", targetId: "c3" }, snap).error);
  assert.ok(planAction({ intent: "send_reopener", targetId: "l2" }, snap).error);
});

test("spoken confirmation words", () => {
  assert.equal(confirmWord("Yes."), "yes");
  assert.equal(confirmWord("go ahead"), "yes");
  assert.equal(confirmWord("no, wait"), "no");
  assert.equal(confirmWord("what's the range"), null);
});

test("mock deskCommand: a brief retells the summary, nothing else is invented", async () => {
  const r = await mock.deskCommand({ utterance: "brief me", snapshot: snap });
  assert.equal(r.intent, "brief");
  assert.equal(r.reply, snap.summary);
  const n = await mock.deskCommand({ utterance: "order pizza", snapshot: snap });
  assert.equal(n.intent, "none");
});
