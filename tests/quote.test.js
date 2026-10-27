import { test } from "node:test";
import assert from "node:assert/strict";
import { draftQuote, labourHoursFor, nextQuoteStatus, QUOTE_DISCLAIMER, QUOTE_STATUSES } from "../src/lib/quote.js";

const rateCard = {
  materials: { "asphalt shingle": 45, "clay tile": 65 },
  labourPerHour: 35,
  hoursPerM2: 1.5,
  minimumHours: 2,
};

test("no measurement means no dollar total, but the disclaimer and rates still show", () => {
  const q = draftQuote({ material: "asphalt shingle", measurement: { areaM2: null, areaPercent: 4 }, rateCard });
  assert.equal(q.total, null);
  assert.equal(q.low, null);
  assert.equal(q.high, null);
  assert.equal(q.currency, "USD");
  assert.equal(q.disclaimer, QUOTE_DISCLAIMER);
  assert.match(q.reason, /no dollar total/i);
  assert.equal(q.rates.material, 45);
});

test("unknown material has no rate and no total", () => {
  const q = draftQuote({ material: "thatch", measurement: { areaM2: 2 }, rateCard });
  assert.equal(q.total, null);
  assert.match(q.reason, /no rate/i);
});

test("a measured area prices materials plus labour as a ±20% range with the maths shown", () => {
  const q = draftQuote({ material: "asphalt shingle", measurement: { areaM2: 4 }, rateCard });
  // materials 4 * 45 = 180; labour max(2, 6) = 6 h * 35 = 210; total 390
  assert.equal(q.total, 390);
  assert.equal(q.low, 312);
  assert.equal(q.high, 468);
  assert.equal(q.lines.length, 2);
  assert.equal(q.lines[0].amount, 180);
  assert.equal(q.lines[1].amount, 210);
  assert.match(q.lines[0].detail, /4 m² × \$45\/m²/);
  assert.equal(q.disclaimer, QUOTE_DISCLAIMER);
});

test("labour never drops below the minimum call-out hours", () => {
  assert.equal(labourHoursFor(0.5, 1.5, 2), 2);
  assert.equal(labourHoursFor(3, 1.5, 2), 4.5);
});

test("quote status moves one way: draft → awaiting approval → approved → sent", () => {
  assert.deepEqual(QUOTE_STATUSES, ["draft", "awaiting_approval", "approved", "sent"]);
  assert.equal(nextQuoteStatus("draft"), "awaiting_approval");
  assert.equal(nextQuoteStatus("approved"), "sent");
  assert.equal(nextQuoteStatus("sent"), null);
});
