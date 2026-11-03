// Verification and routing policy, per trade, in one file (workshop guide: thresholds are set by the trade,
// not hard-coded in prompts). Tune here; nothing else needs to change.

export const POLICY = {
  roofing: {
    // Share of checklist items that must be PROVEN by the photo and description before a quote counts as verified.
    coverageBar: 0.8,
    // Confidence bars by action: quoting and booking need a high bar, a follow-up message a lower one.
    thresholds: { quote: 0.65, booking: 0.6, followup: 0.4 },
    // Failed judge passes before the job escalates to a person.
    maxRetries: 3,
    // `required` items must be proven whatever the bar: the quote or the consent rests on them.
    checklist: [
      { id: "damage", label: "Damage type", required: true },
      { id: "material", label: "Roof material", required: true },
      { id: "leak", label: "Leak present?" },
      { id: "area", label: "Area affected (only with a reference)" },
      { id: "safety", label: "Access and safety" },
      { id: "address", label: "Property address" },
    ],
  },
  medspa: {
    coverageBar: 0.75,
    thresholds: { quote: 0.6, booking: 0.5, followup: 0.4 },
    maxRetries: 3,
    checklist: [
      { id: "concern", label: "What the client noticed" },
      { id: "consent", label: "Photo consent (if a photo was shared)", required: true },
      { id: "service", label: "Matched to a published service" },
      { id: "flags", label: "Clinician checks noted" },
    ],
  },
};

// Service-menu trades share one shape. On-site trades need the address and a safety check; trades whose photos
// show a person need consent first (required, like the med spa).
const onSiteMenu = (pro) => ({
  coverageBar: 0.8,
  thresholds: { quote: 0.6, booking: 0.5, followup: 0.4 },
  maxRetries: 3,
  checklist: [
    { id: "concern", label: "What the customer described" },
    { id: "service", label: "Matched to a published service", required: true },
    { id: "safety", label: "Safety hazards" },
    { id: "address", label: "Property address" },
    { id: "flags", label: `${pro} checks noted` },
  ],
});
const studioMenu = (pro) => ({
  coverageBar: 0.75,
  thresholds: { quote: 0.6, booking: 0.5, followup: 0.4 },
  maxRetries: 3,
  checklist: [
    { id: "concern", label: "What the client asked for" },
    { id: "consent", label: "Photo consent (if a photo was shared)", required: true },
    { id: "service", label: "Matched to a published service" },
    { id: "flags", label: `${pro} checks noted` },
  ],
});
POLICY.plumbing = onSiteMenu("Plumber");
POLICY.hvac = onSiteMenu("Technician");
POLICY.salon = studioMenu("Stylist");
POLICY.barber = studioMenu("Barber");

export const policyFor = (trade) => POLICY[trade] || POLICY.roofing;

// The model router (Fireworks session: don't pick one model, route by task and difficulty).
// Tiers map to a model and a reasoning effort. Model ids come from env so nothing here invents a model name;
// without overrides every tier uses the configured Muse Spark model and only the effort changes.
export const ROUTER_TIERS = {
  small: { label: "Small", effort: "low" },
  medium: { label: "Medium", effort: "low" }, // low effort for speed: a medium-effort judge took 34 s on Meta (2 Nov)
  large: { label: "Large", effort: "high" },
};
