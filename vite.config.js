import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Dev-only proxy so the interim provider's key never reaches the browser bundle.
// The browser posts an Anthropic Messages request to /api/ai/anthropic; the key is added here from .env.local.
function aiProxy(env) {
  return {
    name: "agently-ai-proxy",
    configureServer(server) {
      server.middlewares.use("/api/ai/anthropic", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "POST only" }));
        }
        const key = env.ANTHROPIC_API_KEY;
        if (!key) {
          res.statusCode = 503;
          return res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY is not set in .env.local" }));
        }
        let body = "";
        for await (const chunk of req) body += chunk;
        try {
          const upstream = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body,
          });
          res.statusCode = upstream.status;
          res.end(await upstream.text());
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: `Upstream call failed: ${e.message}` }));
        }
      });
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
