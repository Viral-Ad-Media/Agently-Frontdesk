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
  // Four more desks on the same spine (3 Nov 2026). All fictional businesses with demo menus and prices.
  "clearline-plumbing": {
    id: "clearline-plumbing",
    name: "Clearline Plumbing",
    namePlaceholder: false,
    trade: "plumbing",
    serviceArea: "Dallas-Fort Worth",
    currency: "USD",
    rateCard: null,
    services: [
      { id: "leak-repair", name: "Leak repair (pipe or fitting)", priceLow: 150, priceHigh: 350, concerns: ["leak", "leaking", "drip", "dripping", "pipe", "under the sink", "wet cabinet", "damp"] },
      { id: "drain-clear", name: "Drain unblocking", priceLow: 120, priceHigh: 250, concerns: ["blocked", "clogged", "slow drain", "backing up", "won't drain", "drain"] },
      { id: "toilet-repair", name: "Toilet repair", priceLow: 110, priceHigh: 240, concerns: ["toilet", "running", "won't flush", "flush", "cistern"] },
      { id: "faucet", name: "Faucet replacement", priceLow: 160, priceHigh: 320, concerns: ["faucet", "tap", "mixer", "spout"] },
      { id: "water-heater", name: "Water heater repair", priceLow: 180, priceHigh: 450, concerns: ["water heater", "no hot water", "hot water", "boiler", "tank"] },
      { id: "burst-pipe", name: "Emergency burst pipe call-out", priceLow: 250, priceHigh: 600, concerns: ["burst", "frozen pipe", "frozen", "flooding", "spraying"] },
      { id: "sewer-camera", name: "Sewer line camera inspection", priceLow: 199, priceHigh: 299, concerns: ["sewage", "sewer", "gurgling", "smell from the drain"] },
    ],
    words: {
      pro: "plumber",
      visit: "visit",
      visitLong: "plumber visit",
      surface: "photo",
      approver: "front desk",
      finding: "What we can see",
      steps: "Next steps",
      greeting: "Tell me what's going on: what's leaking, blocked or not working, and since when.",
      heroTitle: "Leak, clog or no hot water? Show us.",
      heroText: "Describe it and add a photo of the leak or the fixture. We match it to our services, give you the price range and book a plumber, in minutes, no account needed.",
      placeholder: "What's happening? e.g. water dripping under the kitchen sink",
    },
    disclaimer: "Draft only - the plumber confirms the final price on site.",
  },
  "polar-point": {
    id: "polar-point",
    name: "Polar Point AC & Appliance",
    namePlaceholder: false,
    trade: "hvac",
    serviceArea: "San Antonio and Austin",
    currency: "USD",
    rateCard: null,
    services: [
      { id: "ac-diagnostic", name: "AC diagnostic visit", priceLow: 89, priceHigh: 129, concerns: ["not cooling", "warm air", "blowing warm", "air conditioner", "ac", "a/c", "thermostat"] },
      { id: "ac-refrigerant", name: "Refrigerant leak check and recharge", priceLow: 250, priceHigh: 550, concerns: ["refrigerant", "ice on", "iced", "frozen coil", "hissing", "freon"] },
      { id: "ac-capacitor", name: "Capacitor or contactor replacement", priceLow: 150, priceHigh: 300, concerns: ["humming", "won't start", "fan not spinning", "clicking", "outdoor unit"] },
      { id: "ac-tuneup", name: "AC tune-up", priceLow: 99, priceHigh: 149, concerns: ["tune-up", "tune up", "maintenance", "service", "filter"] },
      { id: "fridge-repair", name: "Refrigerator repair", priceLow: 150, priceHigh: 400, concerns: ["fridge", "refrigerator", "not cold", "freezer", "ice maker", "fridge is warm"] },
      { id: "fridge-seal", name: "Fridge door seal replacement", priceLow: 90, priceHigh: 180, concerns: ["seal", "gasket", "door won't close", "condensation"] },
      { id: "error-code", name: "Error code diagnosis", priceLow: 79, priceHigh: 119, concerns: ["error code", "code", "flashing", "display", "blinking"] },
    ],
    words: {
      pro: "technician",
      visit: "visit",
      visitLong: "technician visit",
      surface: "photo",
      approver: "front desk",
      finding: "What we can see",
      steps: "Next steps",
      greeting: "Tell me what's not working: the AC, the fridge or another appliance, and what it's doing.",
      heroTitle: "AC or fridge playing up? Snap it.",
      heroText: "Describe it and add a photo of the unit, its label or the error code. We match it to our services, give you the price range and book a technician.",
      placeholder: "What's happening? e.g. AC runs but blows warm air",
    },
    disclaimer: "Draft only - the technician confirms the final price on site.",
  },
  "fern-fringe": {
    id: "fern-fringe",
    name: "Fern & Fringe Hair Studio",
    namePlaceholder: false,
    trade: "salon",
    serviceArea: "Austin, TX",
    currency: "USD",
    rateCard: null,
    services: [
      { id: "cut-style", name: "Cut and style", priceLow: 55, priceHigh: 95, concerns: ["haircut", "cut", "trim", "layers", "bangs", "fringe", "bob", "style"] },
      { id: "colour", name: "Single-process colour", priceLow: 90, priceHigh: 160, concerns: ["colour", "color", "grey", "gray", "roots", "dye", "darker"] },
      { id: "balayage", name: "Balayage or highlights", priceLow: 180, priceHigh: 320, concerns: ["balayage", "highlights", "lighter", "blonde", "sun-kissed", "babylights"] },
      { id: "colour-correction", name: "Colour correction (consultation first)", priceLow: 200, priceHigh: 450, concerns: ["brassy", "orange", "patchy", "went wrong", "correction", "fix my colour", "fix my color", "green"] },
      { id: "repair-treatment", name: "Repair treatment", priceLow: 45, priceHigh: 85, concerns: ["dry", "damaged", "frizz", "breakage", "split ends", "brittle"] },
      { id: "blowout", name: "Blowout", priceLow: 40, priceHigh: 65, concerns: ["blowout", "blow-dry", "event", "wedding", "occasion"] },
    ],
    words: {
      pro: "stylist",
      visit: "appointment",
      visitLong: "appointment",
      surface: "photo",
      approver: "stylist",
      finding: "What we can see",
      steps: "Next steps",
      greeting: "Tell me what you'd like: a cut, a colour, or help with something that's bugging you about your hair.",
      heroTitle: "Know the hair you want? Show us.",
      heroText: "Tell us what you'd like and share a photo if you want. We match it to our menu, give you the price range and book you with a stylist.",
      placeholder: "What would you like? e.g. my colour went brassy, can you fix it?",
    },
    disclaimer: "Draft only - your stylist confirms the service and price at your appointment.",
  },
  "ironside-barbers": {
    id: "ironside-barbers",
    name: "Ironside Barber Club",
    namePlaceholder: false,
    trade: "barber",
    serviceArea: "Dallas, TX",
    currency: "USD",
    rateCard: null,
    services: [
      { id: "skin-fade", name: "Skin fade", priceLow: 35, priceHigh: 45, concerns: ["fade", "skin fade", "taper", "bald fade", "low fade", "high fade"] },
      { id: "classic-cut", name: "Classic cut", priceLow: 30, priceHigh: 40, concerns: ["haircut", "cut", "trim", "short back and sides", "scissor", "crew cut"] },
      { id: "beard", name: "Beard trim and line-up", priceLow: 20, priceHigh: 30, concerns: ["beard", "line up", "line-up", "lineup", "shape up", "edge up", "moustache", "mustache"] },
      { id: "hot-towel", name: "Hot towel shave", priceLow: 35, priceHigh: 50, concerns: ["shave", "hot towel", "clean shave", "straight razor"] },
      { id: "kids-cut", name: "Kids' cut (under 12)", priceLow: 22, priceHigh: 28, concerns: ["kid", "son", "child", "boy", "little one"] },
      { id: "cut-beard", name: "Cut and beard combo", priceLow: 50, priceHigh: 65, concerns: ["cut and beard", "fade and beard", "both", "combo", "the works"] },
    ],
    words: {
      pro: "barber",
      visit: "appointment",
      visitLong: "chair",
      surface: "photo",
      approver: "barber",
      finding: "What we can see",
      steps: "Next steps",
      greeting: "What are we doing today: a fade, a classic cut, the beard, or all of it?",
      heroTitle: "Fresh cut? Book the chair.",
      heroText: "Tell us the cut you want, drop a photo if you have one, and we'll match it to our menu, show the price and book your chair.",
      placeholder: "What are we doing? e.g. skin fade and a beard line-up",
    },
    disclaimer: "Draft only - your barber confirms the price in the chair.",
  },
};

export const DEFAULT_TENANT = "summit-ridge";

// Slots for the next five working days, three per day, per tenant. Each slot books at most one case.
export function seedSlots(now = new Date(), tenants = TENANTS) {
  const slots = [];
  for (const tenantId of Object.keys(tenants)) {
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
          kind: tenants[tenantId].words.visit,
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

// Past customers for the four new desks, synthetic. The plumbing and AC customers sit in the rehearsal freeze
// and heat-wave areas so the weather radar has someone to check in with on a calm demo day.
const moreLeads = {
  "clearline-plumbing": [
    ["Dana", "Whitfield", "2026-01-21", "Frozen pipe repair", "Pipe under the house split in January's freeze", "88 Bluebonnet Court, Fort Worth, TX 76107"],
    ["Luis", "Ocampo", "2026-02-11", "Water heater repair", "Asked for a quote on a new water heater, then went quiet", "410 Elm Ridge Road, Dallas, TX 75214"],
    ["Grace", "Holloway", "2025-12-03", "Leak repair", "Slow leak under the bathroom sink", "27 Cedar Hollow Lane, Fort Worth, TX 76116"],
    ["Ken", "Matsuda", "2026-03-15", "Drain unblocking", "Kitchen drain kept backing up", "902 Lakeview Terrace, Dallas, TX 75218"],
    ["Rosa", "Delgado", "2026-01-08", "Frozen pipe repair", "Outdoor spigot burst; asked about pipe insulation", "15 Mockingbird Way, Fort Worth, TX 76110"],
    ["Owen", "Pratt", "2026-04-02", "Toilet repair", "Running toilet, booked and then cancelled", "63 Prairie Wind Drive, Dallas, TX 75231"],
  ],
  "polar-point": [
    ["Maria", "Esquivel", "2025-08-14", "AC diagnostic", "AC blew warm air during last August's heat", "301 Mission Oaks Drive, San Antonio, TX 78210"],
    ["Ben", "Hargrove", "2025-07-29", "Refrigerant recharge", "Asked about a recharge quote, never booked", "77 Alamo Heights Lane, San Antonio, TX 78209"],
    ["Keisha", "Monroe", "2025-09-05", "Refrigerator repair", "Fridge stopped cooling, bought a new one instead", "1204 Riverwalk Place, San Antonio, TX 78205"],
    ["Tyler", "Nguyen", "2026-05-20", "AC tune-up", "Wanted a tune-up before summer, then went quiet", "58 Live Oak Bend, Austin, TX 78704"],
    ["Elena", "Petrova", "2025-08-22", "AC diagnostic", "Outdoor unit humming, not starting", "19 Cypress Creek Road, San Antonio, TX 78230"],
    ["Sam", "Okafor", "2025-06-30", "Error code diagnosis", "Error code on the indoor unit", "640 Barton Hills Drive, Austin, TX 78704"],
  ],
  "fern-fringe": [
    ["Chloe", "Barnes", "2026-04-10", "Balayage", "Loved her balayage, wanted a refresh in 12 weeks"],
    ["Nadia", "Haddad", "2026-02-27", "Colour correction", "Asked about fixing a box-dye colour, never booked"],
    ["Imogen", "Clarke", "2026-05-01", "Cut and style", "Regular trim every 8 weeks, last one in May"],
    ["Zoe", "Martins", "2026-03-19", "Repair treatment", "Asked about a treatment for bleach damage"],
  ],
  "ironside-barbers": [
    ["Andre", "Wallace", "2026-07-02", "Skin fade", "Every 3 weeks, last seen in July"],
    ["Ryan", "Fitzgerald", "2026-06-18", "Cut and beard combo", "Booked for a wedding, said he'd be back"],
    ["Jamal", "Hughes", "2026-05-25", "Kids' cut", "Brought his son in before school"],
    ["Diego", "Ramos", "2026-06-07", "Hot towel shave", "Asked about a monthly shave"],
  ],
};
const PREFIX = { "clearline-plumbing": "plb", "polar-point": "hvac", "fern-fringe": "salon", "ironside-barbers": "barber" };
const moreLeadRecords = Object.entries(moreLeads).flatMap(([tenantId, rows]) =>
  rows.map(([first, last, when, service, summary, address = ""], i) => ({
    id: `lead-${PREFIX[tenantId]}-${i + 1}`,
    tenantId,
    name: `${first} ${last}`,
    firstName: first,
    phone: `+1202555${3000 + Object.keys(moreLeads).indexOf(tenantId) * 100 + i}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    address,
    source: address ? "Google Ads" : "Instagram",
    serviceType: service,
    damageType: "",
    status: "dead",
    notes: "",
    createdAt: when,
    lastContactedAt: when,
    optOut: i === 3,
    reactivation: { status: "idle", attempts: 0 },
    lastInteraction: summary,
    previousQuote: null,
    history: [{ when: when.slice(0, 7), topic: service.toLowerCase(), summary }],
    recovered: false,
  })),
);

export function seedLeads() {
  return [...leadsJson, ...spaLeadRecords, ...moreLeadRecords].map((l) => ({ ...l, message: null }));
}

export function seedState() {
  return {
    version: 4,
    tenants: TENANTS,
    activeTenantId: DEFAULT_TENANT,
    cases: [],
    slots: seedSlots(),
    leads: seedLeads(),
    stormRuns: [],
    gatewayLog: [],
  };
}
