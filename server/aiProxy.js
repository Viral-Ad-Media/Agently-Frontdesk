// Forwards AI calls to the Meta Model API, used by the Vite dev middleware and the Vercel serverless
// route alike. The browser never sees a key.
//   meta → https://api.meta.ai/v1/<path>   (META_API_KEY or MODEL_API_KEY)
// For meta the request body carries { path, body }: the caller names the upstream path
// (chat/completions, responses, asr/transcribe, images/generations) and the JSON to send.

const UPSTREAM = {
  meta: {
    url: (parsed) => `https://api.meta.ai/v1/${String(parsed.path || "chat/completions").replace(/^\/+/, "")}`,
    key: (env) => env.META_API_KEY || env.MODEL_API_KEY,
    missing: "META_API_KEY (or MODEL_API_KEY) is not set",
    headers: (key) => ({ authorization: `Bearer ${key}` }),
    body: (raw, parsed) => JSON.stringify(parsed.body ?? {}),
  },
};

// Returns { status, body } where body is the upstream response text (JSON).
export async function forward(provider, rawBody, env, fetchImpl = fetch) {
  const up = UPSTREAM[provider];
  if (!up) return { status: 404, body: JSON.stringify({ error: `Unknown provider "${provider}"` }) };
  const key = up.key(env);
  if (!key) return { status: 503, body: JSON.stringify({ error: up.missing }) };
  let parsed = {};
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return { status: 400, body: JSON.stringify({ error: "Request body is not JSON" }) };
  }
  try {
    // Multipart upstream (Meta voice): { multipart: { request: {...}, audio: { base64, mimeType, filename } } }
    let init;
    if (provider === "meta" && parsed.multipart) {
      const fd = new FormData();
      fd.append("request", new Blob([JSON.stringify(parsed.multipart.request || {})], { type: "application/json" }));
      const a = parsed.multipart.audio || {};
      fd.append("audio", new Blob([Buffer.from(String(a.base64 || ""), "base64")], { type: a.mimeType || "audio/wav" }), a.filename || "audio.wav");
      init = { method: "POST", headers: { accept: "application/json", ...up.headers(key) }, body: fd };
    } else {
      init = { method: "POST", headers: { "content-type": "application/json", ...up.headers(key) }, body: up.body(rawBody, parsed) };
    }
    const res = await fetchImpl(up.url(parsed), init);
    return { status: res.status, body: await res.text() };
  } catch (e) {
    return { status: 502, body: JSON.stringify({ error: `Upstream call failed: ${e.message}` }) };
  }
}

export const PROVIDERS = Object.keys(UPSTREAM);
