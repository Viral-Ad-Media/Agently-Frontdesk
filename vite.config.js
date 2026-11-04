import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { forward, PROVIDERS } from "./server/aiProxy.js";
import { readSite } from "./server/siteText.js";
import { handleCloud } from "./server/cloud.js";

// Dev-only route so provider keys never reach the browser bundle. The browser posts to
// /api/ai/<provider>; the key is added here from .env.local. On Vercel, api/ai/[provider].js
// does the same with the project's environment variables, through the same forward().
function aiProxy(env) {
  return {
    name: "agently-ai-proxy",
    configureServer(server) {
      server.middlewares.use("/api/ai", async (req, res) => {
        res.setHeader("content-type", "application/json");
        const provider = (req.url || "").split("?")[0].replace(/^\/+/, "");
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "POST only", providers: PROVIDERS }));
        }
        let body = "";
        for await (const chunk of req) body += chunk;
        const out = await forward(provider, body, env);
        res.statusCode = out.status;
        res.end(out.body);
      });
      // Instant setup: read a business website server-side (same code as api/site.js on Vercel).
      server.middlewares.use("/api/site", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "POST only" }));
        }
        let body = "";
        for await (const chunk of req) body += chunk;
        try {
          res.end(JSON.stringify(await readSite(JSON.parse(body || "{}").url, fetch, { allowPrivate: env.SITE_ALLOW_LOCAL === "1" })));
        } catch (e) {
          res.statusCode = 422;
          res.end(JSON.stringify({ error: e.message || "The site could not be read." }));
        }
      });
      // Published desks and owner alerts (same code as api/desk.js and api/alerts.js; memory store in dev).
      for (const route of ["desk", "alerts"]) {
        server.middlewares.use(`/api/${route}`, async (req, res) => {
          res.setHeader("content-type", "application/json");
          let body = "";
          for await (const chunk of req) body += chunk;
          const query = Object.fromEntries(new URL(req.url || "/", "http://localhost").searchParams);
          try {
            const parsed = body ? JSON.parse(body) : {};
            res.end(JSON.stringify(await handleCloud(route, req.method, query, { ...parsed, origin: `http://${req.headers.host}` }, { ...process.env, ...env })));
          } catch (e) {
            res.statusCode = e.status || 500;
            res.end(JSON.stringify({ error: e.message || "Request failed." }));
          }
        });
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), aiProxy(env)],
    // Listen on IPv4 and IPv6 so http://localhost:5173 works whichever one the browser resolves to.
    server: { host: true, port: 5173, strictPort: true },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
