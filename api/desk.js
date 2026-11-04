// Vercel route: GET /api/desk?site=<host> (the published desk), GET ?site=&history=<address> (earlier enquiries
// at that address), POST { tenant, ownerKey } (publish) and POST { action: "remove", site, ownerKey }.
import { handleCloud } from "../server/cloud.js";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  // The website chat button reads the published desk's name and greeting from the business's own site.
  if (req.method === "GET") res.setHeader("access-control-allow-origin", "*");
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).send(JSON.stringify(await handleCloud("desk", req.method, req.query || {}, body)));
  } catch (e) {
    res.status(e.status || 500).send(JSON.stringify({ error: e.message || "Desk request failed." }));
  }
}
