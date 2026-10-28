import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { forward, PROVIDERS } from "./server/aiProxy.js";

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
