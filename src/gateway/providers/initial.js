// Interim provider (Phase 1): Claude or OpenAI, whichever key the owner supplies.
// Not configured yet. The owner decides the primary provider; this file is filled in then.
// Every function here must return exactly the shapes documented in mock.js.

export const LABEL = "Interim provider (not configured)";

function notConfigured(capability) {
  return async () => {
    throw new Error(`Interim provider is not configured for ${capability}. Set VITE_AI_PROVIDER=mock or configure a key (Phase 1).`);
  };
}

export const segmentDamage = notConfigured("segmentDamage");
export const assess = notConfigured("assess");
export const converse = notConfigured("converse");
export const reactivateMessage = notConfigured("reactivateMessage");
export const renderReportVisual = notConfigured("renderReportVisual");
export const transcribeCall = notConfigured("transcribeCall");
