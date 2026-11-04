// Roofing rate card read from a business website, checked in code.
// The model (or the rehearsal reader) says which printed rate is which; code keeps only numbers the site
// actually printed, converts them to the desk's unit (USD per square metre) and drops anything it can't prove.
import { RATE_CARD } from "./seed.js";

export const MATERIAL_KEYS = Object.keys(RATE_CARD.materials);
export const SQFT_PER_M2 = 10.7639;
const UNIT_TO_M2 = { m2: 1, sqm: 1, sqft: SQFT_PER_M2, square: SQFT_PER_M2 / 100 };

// Every dollar amount printed in the text, as numbers ("$4.50" -> 4.5, "$1,200" -> 1200).
export function printedDollars(text = "") {
  return new Set((String(text).match(/\$\s?\d[\d,]*(?:\.\d+)?/g) || []).map((p) => Number(p.replace(/[^\d.]/g, ""))));
}

export const perSqFt = (perM2) => Math.round((Number(perM2) / SQFT_PER_M2) * 100) / 100;
export const fromSqFt = (perSqFtPrice) => Math.round(Number(perSqFtPrice) * SQFT_PER_M2);

// raw: { materials: [{ material, price, unit, evidence }], labourPerHour, minimumHours } from the model or the reader.
// Returns { materials: { [key]: usdPerM2 }, labourPerHour, minimumHours, evidence[] } or null when nothing printed survives.
export function rateCardFromSite(raw, siteText = "") {
  if (!raw || !Array.isArray(raw.materials)) return null;
  const printed = printedDollars(siteText);
  const materials = {};
  const evidence = [];
  for (const m of raw.materials) {
    const key = String(m?.material || "").toLowerCase().trim();
    const price = Number(m?.price);
    const factor = UNIT_TO_M2[String(m?.unit || "").toLowerCase()];
    if (!MATERIAL_KEYS.includes(key) || !factor || !(price > 0) || !printed.has(price) || materials[key]) continue;
    materials[key] = Math.round(price * factor);
    if (m.evidence) evidence.push({ field: `rate: ${key}`, quote: String(m.evidence).slice(0, 160) });
  }
  if (Object.keys(materials).length === 0) return null;
  const labour = Number(raw.labourPerHour);
  const minimum = Number(raw.minimumHours);
  const minimumPrinted = minimum > 0 && new RegExp(`\\b${minimum}[- ]?(?:hours?|hrs?|h)\\b`, "i").test(siteText);
  return {
    materials,
    labourPerHour: labour > 0 && printed.has(labour) ? labour : null,
    minimumHours: minimumPrinted ? minimum : null,
    evidence,
  };
}

// The rehearsal provider's reader: finds printed roofing rates line by line, no model involved.
// "Asphalt shingle ... $4.50 per sq ft", "Metal roofing $78 / m²", "Labour $65 per hour", "2-hour minimum".
const MATERIAL_WORDS = [
  ["asphalt shingle", /asphalt|shingle/i],
  ["clay tile", /clay/i],
  ["concrete tile", /concrete/i],
  ["metal sheet", /metal|standing seam|corrugated/i],
];
export function readRateCard(text = "") {
  const materials = [];
  let labourPerHour = null;
  let minimumHours = null;
  for (const line of String(text).split("\n")) {
    const min = line.match(/\b(\d+)[- ]?(?:hours?|hrs?)\s+minimum\b|\bminimum (?:of )?(\d+)[- ]?(?:hours?|hrs?)\b/i);
    if (min && minimumHours == null) minimumHours = Number(min[1] || min[2]);
    if (/labou?r|roofer|crew/i.test(line)) {
      const l = line.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per)\s*(?:hour|hr|h)\b/i);
      if (l && labourPerHour == null) labourPerHour = Number(l[1].replace(/,/g, ""));
    }
    const hit = MATERIAL_WORDS.find(([, re]) => re.test(line));
    if (!hit || materials.some((m) => m.material === hit[0])) continue;
    const sqft = line.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per)\s*(?:sq\.?\s?ft|square foot|ft²)/i);
    const m2 = line.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per)\s*(?:m²|m2|sq\.?\s?m|square met(?:re|er))/i);
    const sq = line.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per)\s*square\b(?!\s*(?:foot|feet|met))/i);
    const found = m2 ? [m2[1], "m2"] : sqft ? [sqft[1], "sqft"] : sq ? [sq[1], "square"] : null;
    if (found) materials.push({ material: hit[0], price: Number(found[0].replace(/,/g, "")), unit: found[1], evidence: line.trim().slice(0, 160) });
  }
  return materials.length ? { materials, labourPerHour, minimumHours } : null;
}

// The owner's rate card for a roofing desk built from a website: printed rates where the site has them, the
// template only for what it doesn't print, and a list of what still needs the owner.
export function mergeRateCard(fromSite) {
  if (!fromSite) return { rateCard: { ...RATE_CARD, fromTemplate: true, source: "template" }, needs: ["your own rate card (using the demo rate card until then)"] };
  const needs = [];
  if (fromSite.labourPerHour == null) needs.push("your labour rate (using the demo $35/h until then)");
  return {
    rateCard: {
      ...RATE_CARD,
      materials: fromSite.materials,
      labourPerHour: fromSite.labourPerHour ?? RATE_CARD.labourPerHour,
      minimumHours: fromSite.minimumHours ?? RATE_CARD.minimumHours,
      fromTemplate: false,
      source: "website",
      evidence: fromSite.evidence,
    },
    needs,
  };
}
