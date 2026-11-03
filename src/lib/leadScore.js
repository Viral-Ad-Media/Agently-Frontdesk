// Lead score, coded and explainable: hot, warm or cold, with the reasons behind it. It only sorts the owner's
// attention; it never changes a price, a booking or what the customer is told.
const DAY = 864e5;

export function scoreLead(c, { storm = null, slot = null, now = Date.now() } = {}) {
  const reasons = [];
  let pts = 0;
  const add = (n, why) => {
    pts += n;
    reasons.push(why);
  };
  if (slot || c.bookingSlotId) add(3, "Visit booked");
  if (c.assessment?.emergency?.isEmergency || c.urgency === "emergency" || c.urgency === "urgent") add(3, "Urgent problem");
  if (c.photo) add(1, "Sent a photo");
  if (c.customer?.address) add(1, "Gave the address");
  if (c.assessment) add(1, "Job assessed");
  if (storm) add(1, "Storm on record");
  if (c.insurance?.claiming) add(1, "Insurance claim");
  const sent = (c.quote?.history || []).find((h) => h.status === "sent");
  if (sent && !c.bookingSlotId) {
    const days = Math.floor((now - new Date(sent.at).getTime()) / DAY);
    if (days >= 7) add(-2, `No booking ${days} days after the quote`);
  }
  if (!c.description && !c.photo) add(-1, "No details yet");
  const level = pts >= 4 ? "hot" : pts >= 2 ? "warm" : "cold";
  return { level, points: pts, reasons };
}

export const SCORE_LABEL = { hot: "Hot lead", warm: "Warm lead", cold: "Cold lead" };
