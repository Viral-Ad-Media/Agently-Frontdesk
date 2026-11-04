// Vercel route: GET /api/desk?site=<host> (the published desk) and POST /api/desk { tenant, ownerKey } (publish).
import { handleCloud } from "../server/cloud.js";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).send(JSON.stringify(await handleCloud("desk", req.method, req.query || {}, body)));
  } catch (e) {
    res.status(e.status || 500).send(JSON.stringify({ error: e.message || "Desk request failed." }));
  }
}
