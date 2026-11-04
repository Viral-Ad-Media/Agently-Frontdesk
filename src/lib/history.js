// Earlier enquiries from the same address, as the tools, the owner's desk and the server all see them.
// Pure module: the server imports it too, so it imports nothing but the address helpers.
import { sameAddress } from "./address.js";

// What an earlier enquiry looks like to the tools and to the owner: when, what was reported, where it got to.
// No names, phone numbers or emails: an address alone doesn't prove who someone is.
export const enquirySummary = (c) => ({ id: c.id, at: c.createdAt || null, reported: c.description ? String(c.description).slice(0, 160) : null, status: c.bookingSlotId || c.booking ? "visit booked" : c.quote?.status || "enquiry" });

// Local and cloud copies of the earlier enquiries, one per case, newest first.
export function mergeEarlier(local = [], remote = [], excludeId = null) {
  const seen = new Set();
  return [...local.map(enquirySummary), ...remote]
    .filter((e) => e?.id && e.id !== excludeId && !seen.has(e.id) && seen.add(e.id))
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

// The cloud's address book for one desk: one entry per case that has an address, newest first, capped.
export function upsertHistory(entries = [], lead = {}, cap = 400) {
  const address = lead?.customer?.address;
  if (!lead?.id || !address) return entries;
  const entry = { ...enquirySummary(lead), address: String(address).slice(0, 160) };
  return [entry, ...entries.filter((e) => e.id !== lead.id)].sort((a, b) => (b.at || "").localeCompare(a.at || "")).slice(0, cap);
}

// Earlier enquiries at an address from the cloud's address book (never the case asking), at most three.
export function historyFor(entries = [], address = "", excludeId = null) {
  if (!address) return [];
  return entries.filter((e) => e.id !== excludeId && sameAddress(e.address, address)).slice(0, 3).map(({ id, at, reported, status }) => ({ id, at, reported, status }));
}
