import { test } from "node:test";
import assert from "node:assert/strict";
import { TRADES, TRADE_IDS, tradeList, mentions, withArticle, isMenu } from "../src/config/trades.js";
import { TENANTS, seedLeads } from "../src/lib/seed.js";
import { buildTenant } from "../src/lib/onboard.js";
import { customersInStorm, rehearsalFor, stormFacts, parseAlerts } from "../src/lib/storm.js";
import { TOOLS } from "../src/lib/agent.js";
import * as mock from "../src/gateway/providers/mock.js";
import { runEval } from "../src/eval/runEval.js";
import { EVAL_JOBS } from "../src/eval/jobs.js";

test("six trades, each with a demo business and a published menu or rate card", () => {
  assert.deepEqual(TRADE_IDS, ["roofing", "medspa", "plumbing", "hvac", "salon", "barber"]);
  for (const t of TRADE_IDS) {
    const biz = Object.values(TENANTS).find((x) => x.trade === t);
    assert.ok(biz, `no demo business for ${t}`);
    if (isMenu(t)) assert.ok(biz.services.every((s) => s.priceLow > 0 && s.priceHigh >= s.priceLow), `${t} prices`);
    else assert.ok(biz.rateCard, "roofing has a rate card");
  }
  assert.equal(tradeList(), "Roofing, med spa, plumbing, AC and fridge repair, hair salon and barber");
  assert.equal(withArticle("appointment"), "an appointment");
});

test("concerns match whole words: 'ac' is the AC, not 'back'", () => {
  assert.ok(mentions("My AC blows warm air", "ac"));
  assert.ok(!mentions("water at the back of the sink", "ac"));
  assert.ok(mentions("two skin fades", "skin fade"));
});

test("the coded hazard rule catches gas, bursts and burning smells, whatever the model says", () => {
  assert.ok(TRADES.plumbing.hazard.test("I can smell gas near the water heater"));
  assert.ok(TRADES.plumbing.hazard.test("a pipe burst in the attic"));
  assert.ok(!TRADES.plumbing.hazard.test("slow drip under the sink"));
  assert.ok(TRADES.hvac.hazard.test("burning smell from the outdoor unit"));
  assert.ok(!TRADES.hvac.hazard.test("AC blows warm air"));
});

test("eval set: every job, all six trades, reaches the expected outcome on the rehearsal provider", async () => {
  const res = await runEval({ ai: mock, tenants: TENANTS });
  const wrong = res.rows.filter((r) => !r.correct).map((r) => `${r.id}: ${r.status} (expected ${r.expected}) ${r.why}`);
  assert.deepEqual(wrong, []);
  assert.deepEqual([...new Set(EVAL_JOBS.map((j) => j.trade))].sort(), [...TRADE_IDS].sort());
});

test("salon colour gets the patch-test flag; the eval fails a card without it", async () => {
  const noFlag = { ...mock, assess: async (i) => ({ ...(await mock.assess(i)), clinicianFlags: [] }) };
  const res = await runEval({ ai: noFlag, tenants: TENANTS, jobs: EVAL_JOBS.filter((j) => j.id === "C1") });
  assert.equal(res.rows[0].correct, false);
  assert.match(res.rows[0].why, /patch test/);
});

test("price list tool answers a barber from the published menu only", () => {
  const out = TOOLS.rate_card.run({ tenant: TENANTS["ironside-barbers"], args: { topic: "how much is a skin fade?" } });
  assert.equal(out.services[0].name, "Skin fade");
  assert.equal(out.services[0].from, 35);
});

test("freeze radar finds the plumber's customers inside the warning and skips anyone opted out", () => {
  const freeze = rehearsalFor("freeze");
  assert.equal(freeze.kind, "freeze");
  const leads = seedLeads().filter((l) => l.tenantId === "clearline-plumbing");
  const { hit, optedOut } = customersInStorm(leads, freeze);
  assert.ok(hit.length >= 1, "at least one customer in the freeze area");
  assert.ok(hit.every((l) => !l.optOut));
  assert.match(stormFacts(freeze), /lows near 17°F/);
  const heat = rehearsalFor("heat");
  assert.ok(customersInStorm(seedLeads().filter((l) => l.tenantId === "polar-point"), heat).hit.length >= 1);
  assert.ok(Array.isArray(optedOut));
});

test("live alerts are filtered by kind: a freeze warning is not a storm", () => {
  const feature = (event) => ({ properties: { id: event, event, areaDesc: "Tarrant", onset: new Date().toISOString(), ends: new Date(Date.now() + 864e5).toISOString(), parameters: {} }, geometry: { type: "Polygon", coordinates: [[[-97.5, 32.6], [-97.0, 32.6], [-97.0, 33.0], [-97.5, 33.0], [-97.5, 32.6]]] } });
  const gj = { features: [feature("Hard Freeze Warning"), feature("Severe Thunderstorm Warning")] };
  assert.deepEqual(parseAlerts(gj, "freeze").map((a) => a.event), ["Hard Freeze Warning"]);
  assert.deepEqual(parseAlerts(gj, "storm").map((a) => a.event), ["Severe Thunderstorm Warning"]);
});

test("setup builds a desk for each new trade and still refuses unknown trades", () => {
  for (const trade of ["plumbing", "hvac", "salon", "barber"]) {
    const r = buildTenant({ name: `Test ${trade}`, trade, serviceArea: "Dallas, TX", services: [{ name: "Service", priceLow: 50, priceHigh: 90, keywords: ["thing"] }] });
    assert.ok(r.ok, `${trade}: ${r.reason}`);
    assert.equal(r.tenant.trade, trade);
  }
  const no = buildTenant({ name: "Bricks", trade: "unsupported", tradeLabel: "bricklaying" });
  assert.equal(no.ok, false);
  assert.match(no.reason, /AC and fridge repair/);
});
