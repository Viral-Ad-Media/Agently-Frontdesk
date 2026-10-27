// Synthetic seed data only. Nothing here is a real business, person, address or phone number.

// PLACEHOLDER demo tenant: the owner confirms or replaces the name before any external showing.
export const TENANT = {
  id: "summit-ridge",
  name: "Summit Ridge Roofing",
  namePlaceholder: true,
  trade: "roofing",
  phone: "(555) 010-0199",
  serviceArea: "Boulder County, CO",
  currency: "USD",
};

// PLACEHOLDER demo rate card (brief, page 8). The owner locks real demo values before any external showing.
export const RATE_CARD = {
  placeholder: true,
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

// Inspection slots for the next five working days, three per day. Each slot books at most one case.
export function seedSlots(now = new Date()) {
  const slots = [];
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
        id: `slot-${start.toISOString().slice(0, 16)}`,
        start: start.toISOString(),
        end: end.toISOString(),
        kind: "inspection",
        caseId: null,
      });
    }
  }
  return slots;
}

export function seedState() {
  return {
    version: 1,
    tenant: TENANT,
    rateCard: RATE_CARD,
    cases: [],
    slots: seedSlots(),
    leads: [],
    gatewayLog: [],
  };
}
