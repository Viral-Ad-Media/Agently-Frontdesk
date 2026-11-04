// Routes each AI task to a tier (model + reasoning effort) from plain signals, and says why.
// Simple capture questions and short drafts go small; a clear single-problem assessment goes medium;
// safety, conflicting evidence or several problems go large and force human review.
// On a failed or low-confidence result the caller retries once on the next tier up, then escalates.
import { CHAT_EFFORT, ROUTER_TIERS } from "../config/policy.js";

const UP = { small: "medium", medium: "large", large: null };

export function route(task, signals = {}) {
  const { emergency = false, regions = 1, conflict = false, attempt = 0, lowConfidence = false } = signals;
  let tier;
  let reason;
  if (task === "converse" && !attempt && !lowConfidence) {
    return { tier: "small", effort: CHAT_EFFORT, label: ROUTER_TIERS.small.label, reason: "Customer chat reply: small tier, minimal effort for speed; the grounding check still runs.", forceHuman: false };
  }
  if (task === "converse" || task === "reactivateMessage" || task === "deskCommand") {
    tier = "small";
    reason = "Short reply or draft: small tier, low effort.";
  } else if (emergency || conflict || regions > 1) {
    tier = "large";
    reason = emergency ? "Safety issue described: large tier, high effort, human review forced." : conflict ? "Photo and description disagree: large tier, human review forced." : "Several problems in one photo: large tier, human review forced.";
  } else if (task === "judge") {
    // The reviewer only answers PASS or FAIL with reasons against evidence it is given, so a clear
    // single-problem job is checked on the light model; a retry still steps it up a tier.
    tier = "small";
    reason = "Independent check of a single-problem job: small tier, low effort.";
  } else {
    tier = "medium";
    reason = "Clear single-problem job: medium tier.";
  }
  // Step up one tier per retry (or on low confidence), never down.
  for (let i = 0; i < attempt + (lowConfidence ? 1 : 0); i++) {
    if (UP[tier]) {
      tier = UP[tier];
      reason = `Retry ${i + 1}: stepped up to the ${tier} tier.`;
    }
  }
  return { tier, effort: ROUTER_TIERS[tier].effort, label: ROUTER_TIERS[tier].label, reason, forceHuman: tier === "large" };
}

export const nextTier = (tier) => UP[tier] || null;
