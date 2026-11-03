import { test } from "node:test";
import assert from "node:assert/strict";
import { turnDelay, cleanUtterance, DELAYS } from "../src/lib/endpoint.js";

test("voice call waits longer when the caller trails off or says ehm", () => {
  assert.equal(turnDelay("my roof is leaking and"), DELAYS.trailing);
  assert.equal(turnDelay("water is coming through the ehm"), DELAYS.trailing);
  assert.equal(turnDelay("it started after the storm because"), DELAYS.trailing);
  assert.equal(turnDelay("the leak is over the"), DELAYS.trailing);
});

test("voice call ends the turn sooner when the sentence sounds finished", () => {
  assert.equal(turnDelay("water is dripping through the bedroom ceiling"), DELAYS.complete);
  assert.ok(turnDelay("can you come tomorrow?") < DELAYS.complete);
  assert.equal(turnDelay("yes"), DELAYS.short);
  assert.ok(DELAYS.trailing > DELAYS.short && DELAYS.short > DELAYS.complete);
});

test("fillers are dropped from what is sent", () => {
  assert.equal(cleanUtterance("um the roof is uh leaking ehm since Tuesday"), "the roof is leaking since Tuesday");
  assert.equal(cleanUtterance("hmm"), "");
});
