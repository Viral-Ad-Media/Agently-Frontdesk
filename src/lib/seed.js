// Synthetic seed data only. Nothing here is a real business, person, address or phone number.
import leadsJson from "./leads.json" with { type: "json" };

// Demo rate card, locked by the owner on 30 Oct 2026 (the brief's figures).
export const RATE_CARD = {
  placeholder: false,
  currency: "USD",
  materials: {
    "asphalt shingle": 45,
    "clay tile": 65,
    "concrete tile": 60,
    "metal sheet": 70,
  },
  labourPerHour: 35,
  hoursPerM2: 1.5,
  minimumHours: 2,
};

export const MATERIALS = Object.keys(RATE_CARD.materials);

// Two launch tenants on one spine. Vocabulary, services and rates live here; the flow does not change.
// Demo tenant names locked by the owner on 30 Oct 2026. Both businesses are fictional.
export const TENANTS = {
  "summit-ridge": {
    id: "summit-ridge",
    name: "Summit Ridge Roofing",
    namePlaceholder: false,
    trade: "roofing",
    serviceArea: "Central Texas",
    currency: "USD",
    rateCard: RATE_CARD,
    words: {
      pro: "roofer",
      visit: "inspection",
      visitLong: "free inspection",
      surface: "visible roof",
      approver: "front desk",
      finding: "Finding",
      steps: "Work needed",
      greeting: "Tell me what's going on with the roof, and where the water is getting in.",
      heroTitle: "Roof leaking? Show us a photo.",
      heroText: "Describe the problem and add a photo. We outline the damage, tell you how bad it is, draft a price range and book a free inspection, in minutes, no account needed.",
      placeholder: "What's happening? e.g. water dripping through the bedroom ceiling",
    },
    disclaimer: "Draft only - the business confirms the final price on site.",
  },
  "luma-skin": {
    id: "luma-skin",
    name: "Luma Skin Studio",
    namePlaceholder: false,
    trade: "medspa",
    serviceArea: "Austin, TX",
    currency: "USD",
    rateCard: null,
    // The spa's own published services. The assessment matches to these and nothing else.
    services: [
      { id: "hydrafacial", name: "HydraFacial", priceLow: 150, priceHigh: 200, concerns: ["dull skin", "congestion", "dryness", "texture"] },
      { id: "acne-facial", name: "Clarifying acne facial", priceLow: 110, priceHigh: 160, concerns: ["breakouts", "acne", "oily skin", "congestion"] },
      { id: "chemical-peel", name: "Chemical peel", priceLow: 120, priceHigh: 250, concerns: ["uneven tone", "sun spots", "fine lines", "texture", "acne marks"] },
      { id: "microneedling", name: "Microneedling", priceLow: 250, priceHigh: 400, concerns: ["acne scars", "fine lines", "texture", "enlarged pores"] },
      { id: "led-calming", name: "LED calming facial", priceLow: 100, priceHigh: 150, concerns: ["redness", "sensitivity", "irritation"] },
      { id: "laser-hair", name: "Laser hair removal (per session)", priceLow: 90, priceHigh: 300, concerns: ["unwanted hair"] },
      { id: "neuromodulator", name: "Wrinkle-relaxing injections (per area)", priceLow: 200, priceHigh: 400, concerns: ["forehead lines", "frown lines", "crow's feet", "wrinkles"] },
      { id: "filler-consult", name: "Dermal filler (consultation first)", priceLow: 400, priceHigh: 800, concerns: ["volume loss", "lip volume", "deep folds"] },
    ],
    words: {
      pro: "clinician",
      visit: "consultation",
      visitLong: "consultation",
      surface: "photo",
      approver: "clinician",
      finding: "What we can see",
      steps: "Next steps",
      greeting: "Tell me what you'd like help with, or what you've noticed about your skin.",
      heroTitle: "Curious about a treatment? Start here.",
      heroText: "Tell us what you've noticed, share a photo if you'd like, and we'll match it to our services, give you a price range, and book a consultation with a clinician. Never a diagnosis, always a human.",
      placeholder: "What would you like help with? e.g. redness on my cheeks",
    },
    disclaimer: "Draft only - the clinician confirms the plan and price at your consultation. This is not medical advice.",
  },
};

export const DEFAULT_TENANT = "summit-ridge";

// Slots for the next five working days, three per day, per tenant. Each slot books at most one case.
export function seedSlots(now = new Date()) {
  const slots = [];
  for (const tenantId of Object.keys(TENANTS)) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    let days = 0;
    while (days < 5) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      days++;
      for (const [h, m] of [
        [9, 0],
        [11, 30],
        [14, 0],
      ]) {
        const start = new Date(d);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + 90 * 60 * 1000);
        slots.push({
          id: `slot-${tenantId}-${start.toISOString().slice(0, 16)}`,
          tenantId,
          start: start.toISOString(),
          end: end.toISOString(),
          kind: TENANTS[tenantId].words.visit,
          caseId: null,
        });
      }
    }
  }
  return slots;
}

// Lapsed med spa clients, synthetic, so the same reactivation run works for both tenants.
const spaLeads = [
  ["Priya", "Natarajan", "2026-03-04", "HydraFacial", "Loved the first visit, said she'd rebook after travel"],
  ["Jordan", "Reyes", "2026-02-18", "Chemical peel", "Asked about downtime, then went quiet"],
  ["Hannah", "Kowalski", "2026-04-22", "Microneedling", "Booked a consultation and cancelled the day before"],
  ["Marcus", "Ellis", "2026-01-30", "Laser hair removal", "Finished 3 of 6 sessions"],
  ["Tomas", "Lindqvist", "2026-05-09", "LED calming facial", "Mentioned redness flare-ups in spring"],
  ["Aisha", "Bello", "2026-03-27", "Wrinkle-relaxing injections", "Asked to be reminded in three months"],
];
const spaLeadRecords = spaLeads.map(([first, last, when, service, summary], i) => ({
  id: `lead-spa-${i + 1}`,
  tenantId: "luma-skin",
  name: `${first} ${last}`,
  firstName: first,
  phone: `+1202555${2000 + i}`,
  email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
  address: "",
  source: "Instagram",
  serviceType: service,
  damageType: "",
  status: "dead",
  notes: "",
  createdAt: when,
  lastContactedAt: when,
  optOut: i === 4,
  reactivation: { status: "idle", attempts: 0 },
  lastInteraction: summary,
  previousQuote: null,
  history: [{ when: when.slice(0, 7), topic: service.toLowerCase(), summary }],
  recovered: false,
}));

export function seedLeads() {
  return [...leadsJson, ...spaLeadRecords].map((l) => ({ ...l, message: null }));
}

export function seedState() {
  return {
    version: 2,
    tenants: TENANTS,
    activeTenantId: DEFAULT_TENANT,
    cases: [],
    slots: seedSlots(),
    leads: seedLeads(),
    gatewayLog: [],
  };
}
