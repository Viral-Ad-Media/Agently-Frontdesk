// Leads that came in from customers' own devices, pulled from the published desk's cloud copy.
// Take a lead the desk hasn't seen, or a newer copy of one it took from the cloud. Never take one from before
// the last Reset demo: the cloud copy still holds it, and a clean desk should stay clean.
export function remoteLeadsToTake(leads = [], { cases = [], tenants = {}, resetAt = "" } = {}) {
  return leads.filter((l) => {
    if (!l?.id || !tenants[l.tenantId]) return false;
    if (resetAt && (l.createdAt || "") < resetAt) return false;
    const mine = cases.find((c) => c.id === l.id);
    return !mine || (mine.remote && (l.updatedAt || "") > (mine.updatedAt || ""));
  });
}
