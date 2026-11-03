// Every trade the desk runs, in one place. The flow is the same spine for all of them; a trade only picks
// an engine and sets its own words, safety rules, photo concepts and weather triggers.
//
// Engines:
//   measure - roofing: SAM outlines the damage, the Eye measures it against a reference, the quote comes
//             from the rate card (material rate per m² plus labour).
//   menu    - every other trade: the photo and description are matched to the business's own published
//             services, and the range comes only from the published price of the matched service.
//
// Flags:
//   onSite      - the pro comes to the customer, so the desk needs an address (else the customer comes in).
//   personPhoto - photos show a person (skin, hair), so explicit consent comes before any photo.
//   medical     - med spa only: never a diagnosis, clinician-first wording.
//   look        - which customer-site style the business gets ("trade" bold and dark, "studio" soft and light).
//   weather     - the weather the desk watches for this trade's customers (see lib/storm.js).

export const TRADES = {
  roofing: {
    id: "roofing",
    label: "Roofing",
    noun: "roofing company",
    engine: "measure",
    onSite: true,
    personPhoto: false,
    medical: false,
    look: "trade",
    weather: "storm",
    reviewer: "roofer",
    flagsLabel: null,
    photoAsk: "a photo of the damage",
    hazard: null,
  },
  medspa: {
    id: "medspa",
    label: "Med spa",
    noun: "med spa",
    engine: "menu",
    onSite: false,
    personPhoto: true,
    medical: true,
    look: "studio",
    weather: null,
    reviewer: "clinician",
    flagsLabel: "Clinician checks noted",
    photoAsk: "a photo of the area",
    severityWords: { Minor: "Routine review", Moderate: "Clinician review", Severe: "Clinician first" },
    concepts: ["area of skin concern"],
    hazard: null,
  },
  plumbing: {
    id: "plumbing",
    label: "Plumbing",
    noun: "plumbing company",
    engine: "menu",
    onSite: true,
    personPhoto: false,
    medical: false,
    look: "trade",
    weather: "freeze",
    reviewer: "plumber",
    flagsLabel: "Plumber checks noted",
    photoAsk: "a photo of the leak or the fixture",
    concepts: ["water leak", "wet stain", "corroded pipe", "pipe fitting", "water heater", "blocked drain"],
    // A coded floor under the model: these always go to a person first.
    hazard: /\b(smell(s|ing)? (of )?gas|gas smell|burst|flood(ed|ing)?|sewage|water (near|on) (the )?(outlet|socket|electrics|wiring|panel))/i,
    rules:
      "Plumbing rules: a gas smell, a burst pipe, flooding, sewage backing up, or water near electrics is an emergency: set `emergency` and tell the customer to shut off the water (or leave the building for gas) and call. Match only to the published services. Never promise a fix over the phone; the plumber confirms on site.",
  },
  hvac: {
    id: "hvac",
    label: "AC and fridge repair",
    noun: "AC and appliance repair company",
    engine: "menu",
    onSite: true,
    personPhoto: false,
    medical: false,
    look: "trade",
    weather: "heat",
    reviewer: "technician",
    flagsLabel: "Technician checks noted",
    photoAsk: "a photo of the unit, its label or the error code",
    concepts: ["air conditioner unit", "ice on coil", "refrigerator", "error code display", "water puddle", "rating label"],
    hazard: /\b(smell(s|ing)? (of )?gas|gas smell|burning smell|smoke|smoking|spark|sparking|breaker keeps tripping)/i,
    rules:
      "AC and appliance rules: a gas or burning smell, smoke, sparks or a breaker that keeps tripping is an emergency: tell the customer to switch the unit off at the breaker. If the photo shows a model label or an error code, read it exactly as printed into `summary` and say it is read from the photo; never guess a code you cannot read. Refrigerant work is for the technician only; never suggest the customer opens the unit.",
  },
  salon: {
    id: "salon",
    label: "Hair salon",
    noun: "hair salon",
    engine: "menu",
    onSite: false,
    personPhoto: true,
    medical: false,
    look: "studio",
    weather: null,
    reviewer: "stylist",
    flagsLabel: "Stylist checks noted",
    photoAsk: "a photo of your hair now (and one you'd like, if you have it)",
    severityWords: { Minor: "Straightforward", Moderate: "Stylist review", Severe: "Consultation first" },
    concepts: ["hair"],
    hazard: null,
    rules:
      "Hair salon rules: any colour, bleach or chemical service needs an allergy patch test at least 48 hours before; add it to `clinicianFlags`. A colour correction or a big change is consultation first. Never comment on the client's looks, only on the hair and the service. Never promise an exact result; the stylist confirms in person.",
  },
  barber: {
    id: "barber",
    label: "Barber",
    noun: "barber shop",
    engine: "menu",
    onSite: false,
    personPhoto: true,
    medical: false,
    look: "trade",
    weather: null,
    reviewer: "barber",
    flagsLabel: "Barber checks noted",
    photoAsk: "a photo of your current cut (or the style you want)",
    severityWords: { Minor: "Quick job", Moderate: "Barber review", Severe: "Chat first" },
    concepts: ["hair", "beard"],
    hazard: null,
    rules:
      "Barber rules: match the cut to the published services and their prices only. Note in `clinicianFlags` anything the barber should know first (a scalp cut, irritation, a very different style). Never comment on the client's looks, only on the cut.",
  },
};

export const TRADE_IDS = Object.keys(TRADES);
export const tradeProfile = (trade) => TRADES[trade] || TRADES.roofing;
export const isMenu = (trade) => tradeProfile(trade).engine === "menu";
export const isMeasure = (trade) => tradeProfile(trade).engine === "measure";
export const tradeLabel = (trade) => tradeProfile(trade).label;

// "a" or "an" before a word: "an appointment", "a plumber visit".
export const article = (word = "") => (/^[aeiou]/i.test(String(word).trim()) ? "an" : "a");
export const withArticle = (word = "") => `${article(word)} ${word}`;

// The plain list of trades for copy: "Roofing, plumbing, AC and fridge repair, med spa, hair salon and barber".
export function tradeList() {
  const names = TRADE_IDS.map((t) => TRADES[t].label.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase()));
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`.replace(/^./, (c) => c.toUpperCase());
}

// Does the text mention this concern as a word or phrase? "ac" matches "my AC is off", not "back" or "each".
export function mentions(text = "", concern = "") {
  const c = String(concern).toLowerCase().trim();
  if (!c) return false;
  const esc = c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}(s|es)?(?=[^a-z0-9]|$)`, "i").test(String(text));
}
