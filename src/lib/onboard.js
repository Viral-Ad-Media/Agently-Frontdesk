// Instant setup: turns what the gateway read from a business website into a tenant on the same spine.
// The flow engine is picked by trade (roofing: measured estimate; med spa: published service menu).
// Anything the site did not state is marked as needing the owner, never filled with a guess.
import { TENANTS, RATE_CARD } from "./seed.js";

export const ENGINES = { roofing: "summit-ridge", medspa: "luma-skin" };

const slug = (s) =>
  String(s || "business")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "business";

export function buildTenant(draft, { url = "", now = new Date() } = {}) {
  if (!draft || !ENGINES[draft.trade]) {
    const label = String(draft?.tradeLabel || "").trim();
    const named = label && !/unsupported|unknown|other/i.test(label) ? ` (this looks like ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label.toLowerCase()} business)` : "";
    return { ok: false, reason: `We don't have a desk for that trade yet${named}. Roofing and med spa desks are live today.` };
  }
  const template = TENANTS[ENGINES[draft.trade]];
  const spa = draft.trade === "medspa";
  const priced = (draft.services || []).filter((s) => Number(s.priceLow) > 0 && Number(s.priceHigh) >= Number(s.priceLow));
  const unpriced = (draft.services || []).filter((s) => !priced.includes(s)).map((s) => s.name);
  const id = `${slug(draft.name)}-${now.getTime().toString(36).slice(-4)}`;
  const needs = [];
  if (!draft.serviceArea) needs.push("service area");
  if (spa && priced.length === 0) needs.push("published prices");
  if (!spa) needs.push("your own rate card (using the demo rate card until then)");
  const tenant = {
    id,
    name: String(draft.name || "Your business").slice(0, 60),
    namePlaceholder: false,
    trade: draft.trade,
    serviceArea: draft.serviceArea || "",
    currency: "USD",
    rateCard: spa ? null : { ...RATE_CARD, fromTemplate: true },
    services: spa
      ? priced.map((s, i) => ({ id: `${slug(s.name)}-${i}`, name: s.name, priceLow: Number(s.priceLow), priceHigh: Number(s.priceHigh), concerns: (s.keywords || []).map(String) }))
      : (draft.services || []).map((s) => ({ name: s.name, priceLow: s.priceLow ?? null, priceHigh: s.priceHigh ?? null })),
    words: {
      ...template.words,
      greeting: draft.greeting || template.words.greeting,
      heroTitle: draft.heroTitle || template.words.heroTitle,
      heroText: draft.heroText || template.words.heroText,
      placeholder: draft.placeholder || template.words.placeholder,
    },
    disclaimer: template.disclaimer,
    setup: { url, at: now.toISOString(), summary: draft.summary || "", evidence: draft.evidence || [], unpriced, needs, confidence: draft.confidence ?? null },
  };
  return { ok: true, tenant };
}
