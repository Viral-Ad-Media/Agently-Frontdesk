// Med spa aftercare reminder drafts. The wording is the clinic's own standard aftercare sheet for each service
// (demo copy for the fictional Luma Skin Studio), never advice written for this client by the AI. Every note is a
// draft: the clinician edits and approves it, and only then can it be sent.

const NOTES = {
  hydrafacial: "Skip makeup for the rest of today if you can, drink plenty of water and wear SPF 30+ for the next few days.",
  "acne-facial": "Keep your hands off any spots, skip heavy makeup and exfoliating products for 48 hours, and wear SPF 30+.",
  "chemical-peel": "Skip retinol, acids and scrubs for 5 to 7 days, let any peeling come away on its own, and wear SPF 30+ every day.",
  microneedling: "Keep your skin clean and bare tonight, skip makeup, exercise and hot showers for 24 hours, and wear SPF 30+ every day this week.",
  "led-calming": "Keep your routine gentle for a day and wear SPF 30+.",
  "laser-hair": "Skip hot baths, saunas and the gym for 24 hours, don't wax or pluck between sessions, and wear SPF 30+ on the area.",
  neuromodulator: "Stay upright for 4 hours, don't rub or massage the area today, and skip the gym until tomorrow.",
  "filler-consult": "Skip strenuous exercise, alcohol and heat for 24 hours, and don't press on the area.",
};
const GENERIC = "Follow the aftercare sheet your clinician gave you at the visit.";

export const hasAftercare = (tenant) => tenant?.trade === "medspa";

// The service the visit was for: the first menu match on the assessment, if any.
export function aftercareService(c, tenant) {
  const id = c?.assessment?.serviceMatch?.[0]?.serviceId;
  return (tenant?.services || []).find((s) => s.id === id) || null;
}

export function aftercareDraft(c, tenant) {
  const svc = aftercareService(c, tenant);
  const first = (c?.customer?.name || "").split(" ")[0];
  const hi = first ? `Hi ${first},` : "Hi,";
  const what = svc ? `your ${svc.name}` : "your visit";
  const note = (svc && NOTES[svc.id]) || GENERIC;
  return `${hi} thank you for coming in to ${tenant.name} for ${what}. Your aftercare from the clinic: ${note} If anything worries you, call us, and for anything urgent call your doctor or 911.`;
}
