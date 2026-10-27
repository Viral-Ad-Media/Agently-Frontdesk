// Draft quote maths: USD only, range of ±20%, materials and labour shown with rates.
// A measurement in square metres is required for a dollar total. No measurement, no total.

export const QUOTE_DISCLAIMER = "Draft only - the business confirms the final price on site.";

// Quote status moves one way only, and only a human tap moves it.
export const QUOTE_STATUSES = ["draft", "awaiting_approval", "approved", "sent"];

export function nextQuoteStatus(current) {
  const i = QUOTE_STATUSES.indexOf(current);
  return i >= 0 && i < QUOTE_STATUSES.length - 1 ? QUOTE_STATUSES[i + 1] : null;
}

export const STATUS_LABEL = {
  draft: "Draft",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  sent: "Sent",
};

// Labour hours scale with the repair area; a small repair still needs a minimum call.
export function labourHoursFor(areaM2, hoursPerM2, minimumHours) {
  return Math.max(minimumHours, Math.round(areaM2 * hoursPerM2 * 2) / 2);
}

export function draftQuote({ material, measurement, rateCard }) {
  const matRate = rateCard.materials[material];
  if (!measurement || measurement.areaM2 === null || !matRate) {
    return {
      total: null,
      low: null,
      high: null,
      lines: [],
      rates: { material: matRate ?? null, labourPerHour: rateCard.labourPerHour },
      reason:
        measurement && measurement.areaM2 === null
          ? "No scale reference in the photo, so there is no measurement and no dollar total. A site visit confirms it."
          : "No rate for this material in the rate card.",
      disclaimer: QUOTE_DISCLAIMER,
      currency: "USD",
    };
  }
  const area = measurement.areaM2;
  const hours = labourHoursFor(area, rateCard.hoursPerM2, rateCard.minimumHours);
  const materials = area * matRate;
  const labour = hours * rateCard.labourPerHour;
  const total = materials + labour;
  return {
    total: round2(total),
    low: Math.round(total * 0.8),
    high: Math.round(total * 1.2),
    lines: [
      { label: `Materials - ${material}`, detail: `${area} m² × $${matRate}/m²`, amount: round2(materials) },
      { label: "Labour - roofer", detail: `${hours} h × $${rateCard.labourPerHour}/h`, amount: round2(labour) },
    ],
    rates: { material: matRate, labourPerHour: rateCard.labourPerHour },
    hours,
    reason: null,
    disclaimer: QUOTE_DISCLAIMER,
    currency: "USD",
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
