// Meta provider (Phase 4): SAM 3.1, Muse Spark, Muse Image, Muse Voice Transcribe via the Meta Model API.
// Not configured yet. Filled in during the gateway swap, then the full contract tests re-run.
// Every function here must return exactly the shapes documented in mock.js.

function notConfigured(capability) {
  return async () => {
    throw new Error(`Meta provider is not configured for ${capability} yet (Phase 4 swap).`);
  };
}

export const segmentDamage = notConfigured("segmentDamage");
export const assess = notConfigured("assess");
export const converse = notConfigured("converse");
export const reactivateMessage = notConfigured("reactivateMessage");
export const renderReportVisual = notConfigured("renderReportVisual");
export const transcribeCall = notConfigured("transcribeCall");
