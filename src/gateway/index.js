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
  reactivateMessage: "Muse Spark",
  renderReportVisual: "Muse Image",
  transcribeCall: "Muse Voice Transcribe",
};

export class GatewayError extends Error {
  constructor(message, capability) {
    super(message);
    this.name = "GatewayError";
    this.capability = capability;
  }
}

async function call(capability, input) {
  const impl = PROVIDERS[PROVIDER][capability];
  if (typeof impl !== "function") {
    throw new GatewayError(`${PROVIDER_LABEL} does not implement ${capability} yet.`, capability);
  }
  const started = performance.now();
  let ok = true;
  try {
    const result = await impl(input);
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
      costUsd: PROVIDER === "mock" ? 0 : null,
      ok,
    });
  }
}

export const gateway = {
  segmentDamage: (input) => call("segmentDamage", input),
  assess: (input) => call("assess", input),
  converse: (input) => call("converse", input),
  reactivateMessage: (input) => call("reactivateMessage", input),
  renderReportVisual: (input) => call("renderReportVisual", input),
  transcribeCall: (input) => call("transcribeCall", input),
};
