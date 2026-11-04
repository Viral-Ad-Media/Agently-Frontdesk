// Returning customers and website routing, in plain code.
// A returning customer is matched by the property address they give: earlier enquiries to the same business
// from the same address. The owner sees the history; the customer only sees that they were recognised, because
// an address alone doesn't prove who someone is.
import { hostOf } from "./onboard.js";

const SHORT = { street: "st", avenue: "ave", road: "rd", drive: "dr", lane: "ln", court: "ct", boulevard: "blvd", place: "pl", north: "n", south: "s", east: "e", west: "w" };
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b(street|avenue|road|drive|lane|court|boulevard|place|north|south|east|west)\b/g, (w) => SHORT[w])
    .replace(/[^a-z0-9]/g, "");

export function sameAddress(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || (x.length > 8 && y.length > 8 && (x.startsWith(y) || y.startsWith(x)));
}

// Earlier enquiries to the same business from the same address, newest first.
export function earlierEnquiries(c, cases = []) {
  if (!c?.customer?.address) return [];
  return cases
    .filter((o) => o.id !== c.id && o.tenantId === c.tenantId && sameAddress(o.customer?.address, c.customer.address) && (o.description || (o.messages || []).some((m) => m.role === "user")))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// The desk set up from a given website (newest first if the same site was set up twice).
export function tenantForSite(tenants = {}, site = "") {
  const host = hostOf(site);
  if (!host) return null;
  return (
    Object.values(tenants)
      .filter((t) => t.setup?.host === host || hostOf(t.setup?.url || "") === host)
      .sort((a, b) => (b.setup?.at || "").localeCompare(a.setup?.at || ""))[0] || null
  );
}
