import { test } from "node:test";
import assert from "node:assert/strict";
import * as mock from "../src/gateway/providers/mock.js";

test("a call transcript is qualified in one pass: description, urgency and address, then the photo step", async () => {
  const t = await mock.transcribeCall({ audio: null });
  assert.equal(typeof t.transcript, "string");
  const q = await mock.converse({ trade: "roofing", messages: [{ role: "user", content: t.transcript }], caseState: { channel: "call", description: "", address: "" } });
  assert.equal(q.extracted.description, t.transcript);
  assert.equal(q.extracted.urgency, "urgent");
  assert.equal(q.extracted.address, "14 Larkspur Lane in Lyons");
  assert.equal(q.nextAction, "ask_photo");
});

test("a call without an address asks for it", async () => {
  const q = await mock.converse({ trade: "roofing", messages: [{ role: "user", content: "Hi, the gutter is hanging off since last night." }], caseState: { channel: "call", description: "", address: "" } });
  assert.equal(q.extracted.address, undefined);
  assert.equal(q.nextAction, "ask_address");
});
