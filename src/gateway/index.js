// The AI Gateway. The UI calls only this module, never a provider directly.
// Five capabilities plus call transcription; the provider is chosen by one setting.
//   VITE_AI_PROVIDER = initial | meta | mock
// Return shapes never change between providers. See prompts/prompts.md for every prompt.
import { logGatewayCall } from "@/lib/store";
import * as mock from "./providers/mock";
import * as initial from "./providers/initial";
import * as meta from "./providers/meta";

const PROVIDERS = { mock, initial, meta };

const requested = (import.meta.env.VITE_AI_PROVIDER || "mock").trim().toLowerCase();
export const PROVIDER = PROVIDERS[requested] ? requested : "mock";
if (!PROVIDERS[requested]) {
  console.warn(`[gateway] Unknown VITE_AI_PROVIDER "${requested}", falling back to mock.`);
}

export const PROVIDER_LABEL = {
  mock: "Mock provider",
  initial: initial.LABEL,
  meta: "Meta models",
}[PROVIDER];

// What each capability is mapped to at submission time (brief, Part B section 7).
export const CAPABILITY_MODEL = {
  segmentDamage: "SAM 3.1",
  assess: "Muse Spark",
  converse: "Muse Spark",
  agentStep: "Muse Spark (agent loop)",
  reactivateMessage: "Muse Spark",
  renderReportVisual: "Muse Image",
  previewRepair: "Muse Image",
  transcribeCall: "Muse Voice Transcribe",
  setupTenant: "Muse Spark",
  deskCommand: "Muse Spark",
  judgeAssessment: "Muse Spark (reviewer pass)",
};

export class GatewayError extends Error {
  constructor(message, capability) {
    super(message);
    this.name = "GatewayError";
    this.capability = capability;
  }
}

// Result cache for real providers: the same photo, description and tenant never costs twice.
// Keyed by a hash of the input (without volatile fields), kept in localStorage, capped at 60 entries.
const CACHE_KEY = "gateway.cache.v1";
const CACHEABLE = new Set(["segmentDamage", "assess", "reactivateMessage", "renderReportVisual", "previewRepair", "setupTenant"]);
function readCache() {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeCache(c) {
  try {
    const keys = Object.keys(c);
    if (keys.length > 60) for (const k of keys.slice(0, keys.length - 60)) delete c[k];
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* storage full: skip caching */
  }
}
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
function cacheKey(capability, input) {
  const { tenant, caseId: _caseId, ...rest } = input || {};
  return `${PROVIDER}:${capability}:${hash(JSON.stringify({ ...rest, tenantId: tenant?.id }))}`;
}
export function clearGatewayCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

// Cost only when prices are configured (USD per million tokens); otherwise null, shown as "not priced". Never guessed.
const PRICE_IN = Number(import.meta.env.VITE_META_PRICE_IN_PER_M) || null;
const PRICE_OUT = Number(import.meta.env.VITE_META_PRICE_OUT_PER_M) || null;
function costOf(usage) {
  const t = usage?.tokens;
  if (!t || PRICE_IN == null || PRICE_OUT == null) return null;
  return Math.round((((t.input || 0) * PRICE_IN + (t.output || 0) * PRICE_OUT) / 1e6) * 10000) / 10000;
}

async function call(capability, input) {
  const impl = PROVIDERS[PROVIDER][capability];
  if (typeof impl !== "function") {
    throw new GatewayError(`${PROVIDER_LABEL} does not implement ${capability} yet.`, capability);
  }
  const cacheable = PROVIDER !== "mock" && CACHEABLE.has(capability);
  const key = cacheable ? cacheKey(capability, input) : null;
  if (cacheable) {
    const hit = readCache()[key];
    if (hit) {
      logGatewayCall({ at: new Date().toISOString(), capability, provider: PROVIDER, latencyMs: 0, costUsd: 0, ok: true, cached: true });
      return { ...hit, provider: PROVIDER, providerLabel: PROVIDER_LABEL, capability, cached: true };
    }
  }
  const started = performance.now();
  let ok = true;
  let usage = null;
  try {
    const result = await impl(input);
    usage = result?.usage || null;
    if (cacheable) {
      const c = readCache();
      c[key] = result;
      writeCache(c);
    }
    return { ...result, provider: PROVIDER, providerLabel: PROVIDER_LABEL, capability };
  } catch (e) {
    ok = false;
    throw e instanceof GatewayError ? e : new GatewayError(e.message || "Gateway call failed", capability);
  } finally {
    logGatewayCall({
      at: new Date().toISOString(),
      capability,
      provider: PROVIDER,
      latencyMs: Math.round(performance.now() - started),
      costUsd: PROVIDER === "mock" ? 0 : costOf(usage),
      ok,
      caseId: input?.caseId || null,
      model: usage?.model || null,
      effort: usage?.effort || input?.route?.effort || null,
      tokens: usage?.tokens || null,
      route: input?.route ? { tier: input.route.tier, reason: input.route.reason } : null,
    });
  }
}

export const gateway = {
  segmentDamage: (input) => call("segmentDamage", input),
  assess: (input) => call("assess", input),
  converse: (input) => call("converse", input),
  // Only offered when the active provider implements it; the agent falls back to converse otherwise.
  ...(PROVIDERS[PROVIDER].agentStep ? { agentStep: (input) => call("agentStep", input) } : {}),
  reactivateMessage: (input) => call("reactivateMessage", input),
  renderReportVisual: (input) => call("renderReportVisual", input),
  previewRepair: (input) => call("previewRepair", input),
  transcribeCall: (input) => call("transcribeCall", input),
  setupTenant: (input) => call("setupTenant", input),
  deskCommand: (input) => call("deskCommand", input),
  judgeAssessment: (input) => call("judgeAssessment", input),
};
