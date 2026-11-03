// Follow-ups after a quote: drafted for day 3, 7 and 14 after the quote is sent, for every trade. Each one is a
// draft until the owner approves it, and only an approved one can be sent. The plan stops as soon as the
// customer books, and nothing is ever sent on its own.
export const CADENCE = [3, 7, 14];
const DAY = 864e5;

export function quoteSentAt(c) {
  const h = (c?.quote?.history || []).find((x) => x.status === "sent");
  return h ? new Date(h.at).getTime() : null;
}

export function followUpDraft(c, tenant, day) {
  const first = (c?.customer?.name || "").split(" ")[0];
  const hi = first ? `Hi ${first}` : "Hi";
  const agent = tenant?.words?.agentName || "Aura";
  const visit = tenant?.words?.visitLong || "visit";
  const pro = tenant?.words?.pro || "team";
  const job = c?.assessment?.serviceMatch?.[0]?.name || c?.assessment?.failedPart || "your enquiry";
  if (day === 3) return `${hi}, it's ${agent} from ${tenant.name}. Just checking you got our range for ${lower(job)}. Happy to answer any questions, or I can book your ${visit}.`;
  if (day === 7) return `${hi}, ${agent} from ${tenant.name} again. We still have openings this week if you'd like a ${pro} to take a look. Just reply with a day that suits you.`;
  return `${hi}, a last check-in from ${tenant.name}. If it's already sorted, no problem, just say so and we won't message again. If not, we're here when you need us.`;
}

const lower = (s) => String(s).replace(/^./, (x) => x.toLowerCase());

// The plan for one lead: null when there is no sent quote; stopped when the customer booked.
export function followUpPlan(c, tenant, now = Date.now()) {
  const sent = quoteSentAt(c);
  if (!sent) return null;
  if (c.bookingSlotId) return { stopped: "Booked, so no follow-ups are needed.", steps: [] };
  const steps = CADENCE.map((day) => {
    const saved = c.followUps?.[day];
    const due = sent + day * DAY;
    return { day, due: new Date(due).toISOString(), isDue: now >= due, status: saved?.status || "draft", text: saved?.text || followUpDraft(c, tenant, day) };
  });
  return { stopped: null, steps };
}
