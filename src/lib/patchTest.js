// Salon rule, enforced in code: a colour, bleach or chemical service needs an allergy patch test at least
// 48 hours before. The calendar only offers such a booking from 48 hours out, and the store refuses an
// earlier one, whatever the chat said. Pure module: runs in node tests and in the browser.
export const PATCH_TEST_HOURS = 48;
const COLOUR = /colou?r|bleach|balayage|highlight|dye|tint|toner|correction/i;

export function needsPatchTest(c, tenant) {
  if (tenant?.trade !== "salon" || !c) return false;
  const a = c.assessment || {};
  return (a.clinicianFlags || []).some((f) => /patch test/i.test(String(f))) || (a.serviceMatch || []).some((m) => COLOUR.test(String(m.name || "")));
}

// The earliest start time (ms) this case may be booked for.
export const earliestStart = (c, tenant, now = Date.now()) => (needsPatchTest(c, tenant) ? now + PATCH_TEST_HOURS * 3600e3 : now);
