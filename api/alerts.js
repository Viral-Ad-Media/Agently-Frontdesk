// Vercel route for owner alerts: status, subscribe (push and email), notify (from a customer's chat), test, leads.
import { handleCloud } from "../server/cloud.js";

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host || "agently-frontdesk.vercel.app"}`;
    res.status(200).send(JSON.stringify(await handleCloud("alerts", req.method, req.query || {}, { ...body, origin })));
  } catch (e) {
    res.status(e.status || 500).send(JSON.stringify({ error: e.message || "Alert request failed." }));
  }
}
