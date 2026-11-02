// End-of-turn detection for the voice call. The browser's speech recogniser stops at the first short pause,
// which cuts people off mid-sentence or during an "ehm". Instead we keep listening and decide in code when
// the caller has finished: a sentence that sounds complete ends after a short silence, one that trails off
// on a filler or a joining word ("and", "because", "the") gets a much longer wait.
// Pure module so it runs in node tests.

const FILLERS = /\b(um+|uh+|uhm+|erm+|ehm+|em+|hmm+|ah+|er+|like|you know|i mean)$/i;
const TRAILING = /\b(and|but|or|so|because|cause|then|the|a|an|to|of|for|with|in|on|at|my|our|your|is|was|are|it's|its|if|that|which|when|where|about|from|there's|i|we|it|this|some|any|just|also|maybe|probably|around|like)$/i;
const COMPLETE_HINT = /[.?!]$/;

export const DELAYS = { complete: 1300, short: 2200, trailing: 3200, empty: 6000 };

export function turnDelay(text = "") {
  const t = String(text).trim().toLowerCase().replace(/[,;:\-–]+$/, "");
  if (!t) return DELAYS.empty;
  if (FILLERS.test(t) || TRAILING.test(t)) return DELAYS.trailing;
  if (COMPLETE_HINT.test(t)) return DELAYS.complete - 300;
  if (t.split(/\s+/).length < 3) return DELAYS.short;
  return DELAYS.complete;
}

// Fillers carry no meaning for the desk, so drop them from what is sent.
export function cleanUtterance(text = "") {
  return String(text)
    .replace(/\b(um+|uh+|uhm+|erm+|ehm+|hmm+)\b[,.]?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
