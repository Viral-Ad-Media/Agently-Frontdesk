// Returning customers and website routing, in plain code.
// A returning customer is matched by the property address they give: earlier enquiries to the same business
// from the same address. The owner sees the history; the customer only sees that they were recognised, because
// an address alone doesn't prove who someone is.
import { hostOf } from "./onboard.js";
import { sameAddress } from "./address.js";

export { sameAddress };
export { enquirySummary, mergeEarlier } from "./history.js";

// Earlier enquiries to the same business from the same address, newest first. `address` overrides the case's
// own (an address the customer has just typed, before the case is updated).
export function earlierEnquiries(c, cases = [], address = c?.customer?.address) {
  if (!address) return [];
  return cases
    .filter((o) => o.id !== c.id && o.tenantId === c.tenantId && sameAddress(o.customer?.address, address) && (o.description || (o.messages || []).some((m) => m.role === "user")))
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
