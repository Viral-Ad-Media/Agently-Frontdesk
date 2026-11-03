// "Talk to your desk": the owner asks out loud, the desk answers out loud, and it can act on what is
// waiting (approve or send a quote, approve or send a re-opener). The model only proposes an intent and a
// target id from the snapshot below; this file checks it against the live state, the screen shows the
// action in words, and nothing changes until the owner says "yes" or taps Confirm. Pure, no imports.

export const DESK_INTENTS = ["brief", "approve_quote", "send_quote", "approve_reopener", "send_reopener", "none"];

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const whoOf = (c) => c.customer?.name || c.customer?.address || (c.description ? c.description.slice(0, 40) : "an enquiry");

// The compact view of the desk the model is allowed to see and act on.
export function deskSnapshot({ tenant, cases = [], leads = [], summary = "", isVerified = () => true }) {
  return {
    business: tenant?.name || "the business",
    trade: tenant?.trade || "roofing",
    summary,
    quotes: cases
      .filter((c) => c.quote && c.quote.status !== "sent")
      .map((c) => ({ id: c.id, who: whoOf(c), low: c.quote.low, high: c.quote.high, status: c.quote.status, verified: isVerified(c) })),
    reopeners: leads
      .filter((l) => l.message && !l.optOut && l.message.status !== "sent")
      .map((l) => ({ id: l.id, name: l.name, status: l.message.status })),
  };
}

// Checks a proposed action against the snapshot. Returns { action } or { error } in plain words.
export function planAction({ intent, targetId }, snap) {
  if (!["approve_quote", "send_quote", "approve_reopener", "send_reopener"].includes(intent)) return { error: null };
  const isQuote = intent.endsWith("_quote");
  const pool = isQuote ? snap.quotes : snap.reopeners;
  const item = pool.find((x) => x.id === targetId);
  if (!item) return { error: isQuote ? "I couldn't find that quote. Which customer did you mean?" : "I couldn't find that re-opener. Which lead did you mean?" };
  if (isQuote) {
    if (item.low === null || item.low === undefined) return { error: `${item.who} has no range yet. Enter one on the card first.` };
    if (intent === "approve_quote" && item.status === "approved") return { error: `${item.who}'s quote is already approved. Say "send it" to send it.` };
    if (item.status !== "approved" && item.verified === false) return { error: `${item.who}'s quote hasn't passed its checks. Open it on the dashboard to see why; approving it needs a written reason.` };
    const range = `${money(item.low)} to ${money(item.high)}`;
    return {
      action: {
        intent,
        targetId: item.id,
        steps: intent === "send_quote" ? (item.status === "approved" ? ["sent"] : ["approved", "sent"]) : ["approved"],
        prompt: intent === "send_quote" ? `Approve and send the ${range} range to ${item.who}?` : `Approve the ${range} range for ${item.who}? It won't be sent yet.`,
        done: intent === "send_quote" ? `Sent. ${item.who} now sees ${range}.` : `Approved. ${item.who}'s quote is ready to send.`,
      },
    };
  }
  if (intent === "approve_reopener" && item.status === "approved") return { error: `${item.name}'s re-opener is already approved. Say "send it" to send it.` };
  return {
    action: {
      intent,
      targetId: item.id,
      steps: intent === "send_reopener" ? (item.status === "approved" ? ["sent"] : ["approved", "sent"]) : ["approved"],
      prompt: intent === "send_reopener" ? `Approve and send the re-opener to ${item.name}?` : `Approve the re-opener for ${item.name}? It won't be sent yet.`,
      done: intent === "send_reopener" ? `Sent to ${item.name}.` : `Approved. ${item.name}'s re-opener is ready to send.`,
    },
  };
}

// Spoken yes / no while an action is waiting for confirmation.
export function confirmWord(text) {
  const t = String(text).trim().toLowerCase().replace(/[.!,]/g, "");
  if (/^(yes|yeah|yep|yup|sure|confirm|confirmed|do it|go ahead|ok|okay|send it|approve it)\b/.test(t)) return "yes";
  if (/^(no|nope|cancel|stop|wait|don'?t|never mind|hold on)\b/.test(t)) return "no";
  return null;
}

// Deterministic reading of an utterance, used by the mock provider (and as a fallback): finds the intent by
// keywords and the target by a name or address word that appears in what the owner said.
export function readUtterance(utterance, snap) {
  const t = ` ${String(utterance).toLowerCase().replace(/[^a-z0-9' ]/g, " ")} `;
  const wantsSend = /\bsend\b/.test(t);
  const wantsApprove = /\b(approve|ok|okay|sign off)\b/.test(t);
  const aboutReopener = /\b(re ?opener|reopener|lead|text|message)\b/.test(t);
  if (!wantsSend && !wantsApprove) {
    if (/\b(brief|briefing|today|summary|catch me up|waiting|what'?s new|how'?s|how is|what do i)\b/.test(t)) return { intent: "brief", targetId: null };
    return { intent: "none", targetId: null };
  }
  const words = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !/^(the|and|lane|street|road|ave|avenue|drive|for|enquiry)$/.test(w));
  const hit = (s) => words(s).some((w) => t.includes(` ${w} `));
  const quoteIntent = wantsSend ? "send_quote" : "approve_quote";
  const leadIntent = wantsSend ? "send_reopener" : "approve_reopener";
  const q = snap.quotes.find((x) => hit(x.who));
  const r = snap.reopeners.find((x) => hit(x.name));
  if (r && (aboutReopener || !q)) return { intent: leadIntent, targetId: r.id };
  if (q) return { intent: quoteIntent, targetId: q.id };
  // No name: act only when exactly one item could be meant.
  const open = aboutReopener ? snap.reopeners.filter((x) => x.status !== "sent") : snap.quotes.filter((x) => x.low !== null);
  if (open.length === 1) return { intent: aboutReopener ? leadIntent : quoteIntent, targetId: open[0].id };
  return { intent: "none", targetId: null };
}
