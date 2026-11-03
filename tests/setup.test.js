import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeUrl, htmlToText, readSite } from "../server/siteText.js";
import { setupTenant } from "../src/gateway/providers/mock.js";
import { buildTenant } from "../src/lib/onboard.js";

const fixture = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const page = (html, status = 200, headers = {}) => ({ ok: status < 300, status, text: async () => html, headers: { get: (k) => ({ "content-type": "text/html", ...headers })[k.toLowerCase()] } });

test("only public http(s) websites are read", () => {
  assert.equal(normalizeUrl("loneoak.com").href, "https://loneoak.com/");
  for (const bad of ["http://localhost:3000", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://169.254.169.254/latest", "ftp://x.com", "intranet", ""]) {
    assert.throws(() => normalizeUrl(bad), undefined, bad);
  }
});

test("html to text drops scripts and styles, keeps list items, finds same-site links", () => {
  const t = htmlToText(fixture("roofer.html"), "https://loneoak.com/");
  assert.equal(t.title, "Lone Oak Roofing | Roof Repair in Waco");
  assert.doesNotMatch(t.text, /\$999|\.a\{/);
  assert.match(t.text, /- Roof inspection - \$149/);
  assert.match(t.text, /Hail & wind/);
  assert.deepEqual(t.links.map((l) => l.href), ["https://loneoak.com/services", "https://loneoak.com/blog/x"]);
});

test("readSite reads the home page and a services page, and refuses a redirect into a private address", async () => {
  const calls = [];
  const site = await readSite("loneoak.com", async (u) => {
    calls.push(u);
    return page(u.endsWith("/services") ? "<h2>Services</h2><li>Roof replacement from $8,500</li>" : fixture("roofer.html"));
  });
  assert.deepEqual(site.pages, ["https://loneoak.com/", "https://loneoak.com/services"]);
  assert.match(site.text, /Roof replacement from \$8,500/);
  await assert.rejects(() => readSite("evil.com", async () => page("", 302, { location: "http://169.254.169.254/" })), /not a public website/);
});

test("roofing site -> roofing desk with only the prices the site printed", async () => {
  const t = htmlToText(fixture("roofer.html"), "https://loneoak.com/");
  const draft = await setupTenant({ site: { ...t, host: "loneoak.com", url: "https://loneoak.com/" } });
  assert.equal(draft.trade, "roofing");
  assert.equal(draft.name, "Lone Oak Roofing");
  assert.match(draft.serviceArea, /Waco/);
  assert.deepEqual(draft.services.map((s) => [s.name, s.priceLow, s.priceHigh]), [["Roof inspection", 149, 149], ["Shingle repair", 350, 900]]);
  const built = buildTenant(draft, { url: "https://loneoak.com/" });
  assert.ok(built.ok);
  assert.equal(built.tenant.trade, "roofing");
  assert.ok(built.tenant.rateCard.fromTemplate, "rate card is flagged as the demo one until the owner sets theirs");
  assert.ok(built.tenant.setup.needs.some((n) => /rate card/.test(n)));
});

test("med spa site -> service menu desk; unpriced services are never quoted", async () => {
  const t = htmlToText(fixture("spa.html"), "https://glowroom.com/");
  const draft = await setupTenant({ site: { ...t, host: "glowroom.com" } });
  assert.equal(draft.trade, "medspa");
  assert.equal(draft.name, "Glow Room Aesthetics");
  const built = buildTenant({ ...draft, services: [...draft.services, { name: "Laser hair removal", priceLow: null, priceHigh: null, keywords: [] }] });
  assert.ok(built.ok);
  const names = built.tenant.services.map((s) => s.name);
  assert.ok(names.includes("HydraFacial") && names.includes("Chemical peel"));
  assert.ok(!names.includes("Laser hair removal"));
  assert.deepEqual(built.tenant.setup.unpriced, ["Laser hair removal"]);
  assert.equal(built.tenant.rateCard, null);
});

test("an unsupported trade is refused plainly, not forced into a roofing desk", () => {
  const r = buildTenant({ trade: "unsupported", tradeLabel: "dental practice" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /dental practice/);
});
