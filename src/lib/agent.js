// The desk agent: plan, act, observe, then answer (workshop Agents 101). Each customer turn runs a short
// loop. The model either asks for one tool or answers. Tools read the business's real data: open calendar
// slots, the published rate card or menu, the business facts on record, this customer's earlier enquiries
// and storm reports. The answer may state only facts that a tool returned (proven facts only), and a coded
// grounding check holds back any time or price the observations do not contain.
// Pure module: no React, no store import, so it runs in node tests and in the browser alike.

export const MAX_STEPS = 3;

// Same formatting as the slot picker, so the desk says exactly what the customer sees on screen.
const fmtDay = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Each tool: a one-line description the model sees, and a run() over the data the caller passes in.
export const TOOLS = {
  check_calendar: {
    label: "Checked the calendar",
    describe: "Open visit slots in the next 7 days. args.day: optional weekday (mon..sun), 'today' or 'tomorrow'.",
    run({ slots = [], args = {}, now = Date.now() }) {
      const want = String(args.day || "").toLowerCase().slice(0, 3);
      const today = new Date(now).getDay();
      const dayIdx = want === "tod" ? today : want === "tom" ? (today + 1) % 7 : DAYS.indexOf(want);
      const open = slots.filter((s) => !s.caseId && new Date(s.start).getTime() > now && new Date(s.start).getTime() < now + 7 * 864e5);
      const match = dayIdx >= 0 ? open.filter((s) => new Date(s.start).getDay() === dayIdx) : open;
      const list = match.slice(0, 4).map((s) => ({ day: fmtDay(s.start), time: fmtTime(s.start) }));
      return { asked: args.day || null, open: list, totalOpenThisWeek: open.length };
    },
  },
  rate_card: {
    label: "Checked the price list",
    describe: "The business's published prices. Roofing: prices by service printed on its website, material rate per square metre and labour per hour (never a total). Med spa: the published menu with low-high prices. args.topic: optional service the customer named.",
    run({ tenant = {}, args = {} }) {
      if (tenant.trade === "medspa") {
        const q = String(args.topic || "").toLowerCase();
        const menu = (tenant.services || []).map((s) => ({ name: s.name, from: s.priceLow, to: s.priceHigh, concerns: s.concerns || [] }));
        const hits = q ? menu.filter((s) => s.name.toLowerCase().includes(q) || s.concerns.some((c) => q.includes(c) || c.includes(q))) : [];
        return { currency: tenant.currency || "USD", services: (hits.length ? hits : menu).slice(0, 4).map(({ name, from, to }) => ({ name, from, to })) };
      }
      const rc = tenant.rateCard || {};
      // Prices printed on the business's own website (read at setup and checked by the owner), by service.
      const q = String(args.topic || "").toLowerCase();
      const priced = (tenant.services || []).filter((s) => s.priceLow != null && s.priceLow > 0).map((s) => ({ name: s.name, from: s.priceLow, to: s.priceHigh ?? s.priceLow }));
      const hits = q ? priced.filter((s) => s.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && q.includes(w))) : [];
      const servicePrices = (hits.length ? hits : priced).slice(0, 4);
      if (rc.placeholder) return { currency: "USD", published: servicePrices.length > 0, servicePrices };
      return { currency: rc.currency || "USD", published: true, servicePrices, materialsPerM2: rc.materials || {}, labourPerHour: rc.labourPerHour ?? null, visit: tenant.words?.visitLong || "visit", rule: tenant.disclaimer || "" };
    },
  },
  business_facts: {
    label: "Checked the business facts",
    describe: "What is on record about the business: name, trade, service area, what the first visit is, a short summary and quotes from its own website read at setup. Anything not listed is unknown.",
    run({ tenant = {} }) {
      return {
        name: tenant.name,
        trade: tenant.trade,
        serviceArea: tenant.serviceArea || null,
        firstVisit: tenant.words?.visitLong || null,
        about: tenant.setup?.summary || null,
        // Facts on record: any set by hand, then the quotes read from the business's own website at setup
        // (each one is the site's exact words, shown to the owner on the review screen before launch).
        facts: [
          ...(tenant.facts || []).map((f) => (typeof f === "string" ? f : f.text || f.value)),
          ...(tenant.setup?.evidence || []).map((e) => (e?.quote ? `${e.field ? e.field + ": " : ""}"${e.quote}"` : null)),
        ].filter(Boolean).slice(0, 8),
        unknownMeansUnknown: true,
      };
    },
  },
  customer_history: {
    label: "Checked earlier enquiries",
    describe: "Earlier enquiries to this business from the same address (same customer). Returns dates, what was reported and where each one got to.",
    run({ cases = [], current = {} }) {
      const addr = norm(current.customer?.address);
      const earlier = addr ? cases.filter((c) => c.id !== current.id && c.tenantId === current.tenantId && norm(c.customer?.address) === addr) : [];
      return {
        addressKnown: !!addr,
        earlier: earlier.slice(0, 3).map((c) => ({ date: c.createdAt ? fmtDay(c.createdAt) : null, reported: c.description || null, status: c.booking ? "visit booked" : c.quote?.status || "enquiry" })),
      };
    },
  },
  storm_reports: {
    label: "Checked storm reports",
    describe: "Severe-weather reports this business has on record for its area (from the weather service), most recent first.",
    run({ stormRuns = [], tenant = {} }) {
      const runs = stormRuns.filter((r) => r.tenantId === tenant.id).slice(-2).reverse();
      return { reports: runs.map((r) => ({ area: r.storm?.area || null, when: r.storm?.when || null, hailIn: r.storm?.hailIn ?? null, windMph: r.storm?.windMph ?? null })) };
    },
  },
};

// Fast path planner. The lookups a question plainly needs are picked from its wording and run in code before
// the model is called, so most replies take one model call instead of two. The model can still ask for a
// lookup the planner missed. Tools only read data, so an extra lookup costs nothing but a few microseconds.
export const QUESTION = /\?|^\s*(do|does|did|can|could|are|is|how|what|when|where|will|would|any|have|got)\b/i;
export const NEEDS = [
  ["customer_history", /\b(last time|before|again|already|earlier|previous|still waiting|follow(?:ing)? up)\b/i],
  ["check_calendar", /\b(available|availability|slots?|appointment|come (?:out|over|by)|today|tomorrow|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|when can)\b/i],
  ["rate_card", /\b(how much|cost|costs|price|prices|pricing|rates?|charge|expensive|cheap)\b/i],
  ["business_facts", /\b(area|serve|cover|near|insured|insurance|licen[cs]ed|warranty|guarantee|hours|open on|located|who are you)\b/i],
  ["storm_reports", /\b(was there a storm|storm (?:last|yesterday|this)|hail (?:last|yesterday|this))\b/i],
];
export const SKIN = /\b(skin|acne|breakouts?|spots|dull|dry|wrinkles?|lines|tone|pores|scars?|redness)\b/i;
export const DAY_WORD = /\b(today|tomorrow|mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i;
export const THOUGHT = {
  check_calendar: "They asked about timing. Check real open slots before offering any.",
  rate_card: "They asked about price. Read the published rates; never invent a total.",
  business_facts: "They asked about the business. Read what is on record; anything else is unknown.",
  customer_history: "They referred to an earlier contact. Look up enquiries from this address.",
  storm_reports: "They asked about the storm. Read the weather-service reports on record.",
};

export function planLookups(text = "", trade = "roofing") {
  if (!QUESTION.test(text)) return [];
  return NEEDS.filter(([, re]) => re.test(text)).map(([tool]) => ({
    tool,
    args: tool === "check_calendar" ? { day: text.match(DAY_WORD)?.[1]?.toLowerCase() || null } : tool === "rate_card" ? { topic: trade === "medspa" ? text.match(SKIN)?.[0] || null : text } : {},
    thought: THOUGHT[tool],
  }));
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const toolList = () => Object.entries(TOOLS).map(([name, t]) => ({ name, describe: t.describe }));

// Grounding check (coded, Layer 1 style): every clock time and dollar figure in the reply must appear in a
// tool observation or in what the customer said. Returns the unproven claims; empty means grounded.
export function ungroundedClaims(reply = "", observations = [], customerText = "") {
  const evidence = JSON.stringify(observations.map((o) => o.result)) + " " + customerText;
  const nums = (s) => String(s).replace(/,/g, "");
  const claims = [];
  for (const m of reply.matchAll(/\b(\d{1,2}(?::\d{2})?\s?(?:AM|PM))\b/gi)) {
    const t = m[1].toUpperCase().replace(/\s/g, "");
    const evid = evidence.toUpperCase().replace(/\s/g, "");
    const withMinutes = t.includes(":") ? t : t.replace(/(AM|PM)/, ":00$1");
    if (!evid.includes(t) && !evid.includes(withMinutes)) claims.push(m[1]);
  }
  for (const m of reply.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) {
    const v = nums(m[1]);
    if (!new RegExp(`(^|[^0-9.])${v.replace(".", "\\.")}([^0-9]|$)`).test(nums(evidence))) claims.push(m[0]);
  }
  return claims;
}

// One customer turn. `ai` is the gateway (or any provider object). `data` carries what the tools read.
// Falls back to plain `converse` when the provider has no agent step, so nothing breaks on older providers.
export async function runAgentTurn({ ai, trade, tenant, messages, caseState, data = {}, route = null, caseId = null, maxSteps = MAX_STEPS, now = Date.now() }) {
  const observations = [];
  const steps = [];
  // Evidence beyond the lookups: the conversation so far (earlier replies were checked when they were made)
  // and a range the owner has already approved or sent. A held, unverified range is not evidence.
  const q = data.current?.quote;
  const customerText = messages.map((m) => m.content).join(" ") + (q && ["approved", "sent"].includes(q.status) && q.low != null ? ` ${q.low} ${q.high}` : "");
  if (typeof ai.agentStep !== "function") {
    const res = await ai.converse({ trade, messages, caseState, tenant, route, caseId });
    return { ...res, trace: { steps, grounded: true, fallback: "converse" } };
  }
  // Fast path: run the lookups the question plainly needs now, in code, then ask the model once.
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  for (const p of data.prefetch === false ? [] : planLookups(lastUser, trade)) {
    const result = TOOLS[p.tool].run({ ...data, tenant, args: p.args, now });
    observations.push({ tool: p.tool, args: p.args, result });
    steps.push({ thought: p.thought, tool: p.tool, label: TOOLS[p.tool].label, args: p.args, result, prefetched: true });
  }
  for (let i = 0; i <= maxSteps; i++) {
    const out = await ai.agentStep({ trade, tenant, messages, caseState, observations, tools: toolList(), mustAnswer: i === maxSteps, route, caseId });
    if (out.action === "tool" && TOOLS[out.tool] && i < maxSteps && !observations.some((o) => o.tool === out.tool && JSON.stringify(o.args) === JSON.stringify(out.args || {}))) {
      const result = TOOLS[out.tool].run({ ...data, tenant, args: out.args || {}, now });
      observations.push({ tool: out.tool, args: out.args || {}, result });
      steps.push({ thought: out.thought || "", tool: out.tool, label: TOOLS[out.tool].label, args: out.args || {}, result });
      continue;
    }
    // Answer. Hold back any time or price no tool proved.
    const claims = ungroundedClaims(out.reply, observations, customerText);
    let reply = out.reply || "";
    if (claims.length) {
      steps.push({ thought: `Held back unproven ${claims.join(", ")}`, tool: null, label: "Grounding check failed", result: { claims } });
      reply = out.safeReply || "Let me check that with the team and come back to you. In the meantime, " + lowerFirst(out.fallbackQuestion || "tell me a bit more about what's going on.");
    }
    steps.push({ thought: out.thought || "", tool: null, label: "Answered", result: null });
    return { reply, extracted: out.extracted || {}, nextAction: out.nextAction || "none", usage: out.usage, trace: { steps, grounded: claims.length === 0, observations: observations.length } };
  }
  return { reply: "", extracted: {}, nextAction: "none", trace: { steps, grounded: true } };
}

const lowerFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
