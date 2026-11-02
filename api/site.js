// Vercel serverless route: POST /api/site { url } -> the website as plain text, for instant setup.
import { readSite } from "../server/siteText.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json");
  if (req.method !== "POST") return res.status(405).send(JSON.stringify({ error: "POST only" }));
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).send(JSON.stringify(await readSite(body.url)));
  } catch (e) {
    res.status(422).send(JSON.stringify({ error: e.message || "The site could not be read." }));
  }
}
