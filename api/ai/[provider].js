// Vercel serverless route: POST /api/ai/anthropic or /api/ai/meta. Keys come from the project's
// environment variables, never from the browser. Same forwarding code as the dev server.
import { forward } from "../../server/aiProxy.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json");
  if (req.method !== "POST") {
    res.status(405).send(JSON.stringify({ error: "POST only" }));
    return;
  }
  const provider = String(req.query.provider || "");
  const raw = typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : "";
  const { status, body } = await forward(provider, raw, process.env);
  res.status(status).send(body);
}
