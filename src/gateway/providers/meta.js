// Meta provider (Phase 4): the mandated models through the Meta Model API, behind /api/ai/meta.
//   segmentDamage      → SAM 3.1          POST /v1/responses (streamed text lane of boxes + masks)
//   assess / converse / reactivateMessage → Muse Spark   POST /v1/chat/completions, JSON-schema output
//   renderReportVisual → Muse Image       POST /v1/responses, image_generation_call
//   transcribeCall     → Muse Voice Transcribe  POST /v1/asr/transcribe (multipart via the proxy)
// Written from dev.meta.ai/docs on 28 Oct 2026. Untested until a MODEL_API_KEY is set; the
// contract tests (tests/contract.js) are the gate before it is shown to anyone.
// Same return shapes as mock.js; prompts are read from prompts/prompts.md.
import { printedDollars, rateCardFromSite } from "../../lib/rateCard.js";
import { TRADE_IDS, isMenu, tradeProfile } from "../../config/trades.js";
import { CHAT_EFFORT } from "../../config/policy.js";
import promptsMd from "../../../prompts/prompts.md?raw";
import { renderReportVisual as composeReport } from "./mock.js";

export const LABEL = "Meta models";

// Credit rationing: the Contributor tier (same model, ~95% cheaper; inputs may train Meta models,
// which is fine because every input here is synthetic demo data) by default; SAM only on photos,
// at most three concepts per photo; results cached by the gateway. Override with VITE_META_SPARK_MODEL.
const MODELS = {
  spark: import.meta.env.VITE_META_SPARK_MODEL || "muse-spark-1.3-contributor",
  sparkLight: import.meta.env.VITE_META_SPARK_LIGHT_MODEL || "muse-spark-1.3-contributor",
  sam: "sam-3.1",
  image: "muse-image-1.0",
  voice: "muse-voice-transcribe-1.0",
};

// Router tiers -> model id. Without overrides every tier is the configured Muse Spark model and only the
// reasoning effort changes; set VITE_META_TIER_{SMALL,MEDIUM,LARGE}_MODEL to route to different models.
const TIER_MODEL = {
  small: import.meta.env.VITE_META_TIER_SMALL_MODEL || MODELS.sparkLight,
  medium: import.meta.env.VITE_META_TIER_MEDIUM_MODEL || MODELS.spark,
  large: import.meta.env.VITE_META_TIER_LARGE_MODEL || MODELS.spark,
};
const routed = (route, fallback) => ({ model: (route && TIER_MODEL[route.tier]) || fallback.model, effort: route?.effort || fallback.effort });
const usageOf = (out, model, effort) => ({ model, effort, tokens: out.__usage ? { input: out.__usage.prompt_tokens ?? null, output: out.__usage.completion_tokens ?? null, reasoning: out.__usage.completion_tokens_details?.reasoning_tokens ?? null } : null });

// ----- plumbing -----

// A dropped connection or a busy upstream (proxy 502/503/504, 429) is retried twice with a short backoff;
// any other error (bad request, auth) fails at once. Seen on a home network: parallel connects to the API
// timing out now and then while a retry a second later succeeds.
const RETRYABLE = new Set([429, 502, 503, 504]);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body, extra = {}, attempt = 0) {
  let res;
  try {
    res = await fetch("/api/ai/meta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, body, ...extra }),
    });
  } catch (e) {
    if (attempt < 2) return pause(700 * (attempt + 1)).then(() => post(path, body, extra, attempt + 1));
    throw e;
  }
  if (RETRYABLE.has(res.status) && attempt < 2) {
    await pause(700 * (attempt + 1));
    return post(path, body, extra, attempt + 1);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = `Meta API returned ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j.error?.message || j.error || msg;
    } catch {
      /* keep the status message */
    }
    throw new Error(msg);
  }
  return text;
}

function section(name) {
  // Section body up to the next "## " heading or the end of the file. (A bare `\s*$` here used to stop at
  // the first blank line in multiline mode, which sent every section as an empty string.)
  const re = new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
  const m = promptsMd.match(re);
  if (!m) throw new Error(`prompts.md has no section "${name}"`);
  return m[1].trim();
}
const sharedRules = () => (promptsMd.match(/Shared rules for every prompt:\n([\s\S]*?)\n\n## /) || [])[1] || "";
const medspaRules = () => (promptsMd.match(/## Med spa variants[^\n]*\n([\s\S]*)$/) || [])[1] || "";
// Rules for a service-menu trade: the med spa keeps its own (medical) variants; every other menu trade gets
// the shared service-menu variants plus its own safety and wording rules from config/trades.js.
const menuRules = (trade) => {
  if (!isMenu(trade)) return "";
  if (trade === "medspa") return `\n\nMed spa rules:\n${medspaRules()}`;
  const prof = tradeProfile(trade);
  return `\n\nService-menu rules (${prof.label}):\n${section("Service-menu variants")}\n${prof.rules || ""}`.replaceAll("{{pro}}", prof.reviewer);
};
// The qualifying order per trade, from its flags: on-site trades need the address, person photos need consent.
const orderRule = (trade) => {
  const prof = tradeProfile(trade);
  if (!isMenu(trade)) return "Order: ask_description, then ask_address, then ask_photo, then assess. If caseState.address is filled and there is no photo, nextAction is ask_photo. Never ask for consent.";
  if (prof.personPhoto) return "Order: ask_description, then ask_consent (photo optional), then ask_photo, then assess. Never ask for an address.";
  return "Order: ask_description, then ask_address, then ask_photo (optional: if the customer has no photo, assess from the description), then assess. Never ask for consent.";
};
// How each trade reads inside a prompt sentence ("a {{trade}} business").
const TRADE_WORD = { roofing: "roofing", medspa: "med spa", plumbing: "plumbing", hvac: "cooling and appliance repair", salon: "hair salon", barber: "barber" };
const fill = (text, v) => fillRaw(text, { ...v, trade: TRADE_WORD[v?.trade] || v?.trade, agentName: v?.tenant?.words?.agentName || "Aura" });
const fillRaw = (text, vars) => text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, p) => p.split(".").reduce((o, k) => (o ? o[k] : undefined), vars) ?? "unknown");
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));

// Speed: Muse Spark reads a smaller copy of the photo than SAM does. SAM keeps the full 1280 px frame for an
// accurate outline; the reasoning passes only need to see what the outline and the labels already say, and an
// image's token cost grows with its size. Browser only (canvas); elsewhere the image passes through unchanged.
const shrunk = new Map();
export async function shrinkDataUrl(dataUrl, maxEdge) {
  if (!dataUrl || typeof document === "undefined" || typeof Image === "undefined") return dataUrl;
  const key = `${maxEdge}:${dataUrl.length}:${dataUrl.slice(-48)}`;
  if (shrunk.has(key)) return shrunk.get(key);
  const out = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale >= 1) return resolve(dataUrl);
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
  shrunk.set(key, out);
  return out;
}
export const ASSESS_EDGE = 768;
export const JUDGE_EDGE = 512;

// Muse Spark with a JSON schema (OpenAI-compatible chat completions, response_format json_schema).
async function sparkJson({ system, user, image = null, schema, name, model = MODELS.spark, effort = "low" }) {
  const content = [{ type: "text", text: user }];
  if (image) content.push({ type: "image_url", image_url: { url: image } });
  const text = await post("chat/completions", {
    model,
    reasoning_effort: effort,
    messages: [
      { role: "system", content: `${system}\n\n${sharedRules()}` },
      { role: "user", content },
    ],
    response_format: { type: "json_schema", json_schema: { name, schema, strict: true } },
  });
  const data = JSON.parse(text);
  const raw = data.choices?.[0]?.message?.content ?? "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Muse Spark returned something that was not JSON.");
  }
  // Token usage rides along (non-enumerable) so each capability can report it to the gateway log.
  Object.defineProperty(parsed, "__usage", { value: data.usage || null });
  return parsed;
}

// ----- SAM 3.1 -----

// Parses the streamed text lane: "<0f>0<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..;c=..|><|mask;...|>,1<|box;...|>..."
export function parseSamLane(sse) {
  const deltas = [];
  for (const line of sse.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const ev = JSON.parse(line.slice(5).trim());
      if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") deltas.push(ev.delta);
    } catch {
      /* not JSON, skip */
    }
  }
  const lane = deltas.join("");
  const boxes = [];
  const re = /<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?\|>/g;
  let m;
  while ((m = re.exec(lane))) {
    const [, x1, y1, x2, y2, w, h, c] = m.map(Number);
    boxes.push({ x1, y1, x2, y2, w, h, confidence: Number.isFinite(c) ? c : null });
  }
  return boxes;
}

async function sam(concept, dataUrl) {
  const sse = await post("responses", {
    model: MODELS.sam,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: dataUrl }] }],
    stream: true,
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
  });
  return parseSamLane(sse);
}

const norm = (v, size) => clamp(Math.round((v / size) * 1000), 0, 1000);

const ROOF_CONCEPTS = ["missing shingle", "damaged roof covering", "cracked roof tile"];
const REFERENCE_CONCEPTS = [
  { concept: "shingle tab", label: "standard 3-tab shingle tab (305 mm)", knownWidthM: 0.305 },
  { concept: "brick", label: "standard brick (215 mm)", knownWidthM: 0.215 },
  { concept: "tape measure", label: "tape measure (reading entered on site)", knownWidthM: null },
];

// Today the outline is the best SAM box as a four-point polygon; the mask raster (base85) is not
// decoded yet, so the owner's drag-to-correct handles the rest. Reference: the most confident small
// known-size object, otherwise null (no square metres).
export async function segmentDamage({ trade = "roofing", dataUrl } = {}) {
  if (!dataUrl) throw new Error("segmentDamage needs the photo.");
  const concepts = isMenu(trade) ? tradeProfile(trade).concepts || ["area of concern"] : ROOF_CONCEPTS;
  let best = null;
  // One failed concept no longer sinks the photo: use whichever concepts came back, and fail only if none did.
  const settled = await Promise.allSettled(concepts.map((concept) => sam(concept, dataUrl).then((boxes) => boxes.map((b) => ({ ...b, concept })))));
  const ok = settled.filter((r) => r.status === "fulfilled");
  if (!ok.length) throw settled[0].reason;
  for (const b of ok.flatMap((r) => r.value)) {
    const score = b.confidence ?? 0.5;
    if (!best || score > best.score) best = { ...b, score };
  }
  if (!best) return { regions: [], reference: null, tiltDeg: 0, confidence: 0 };
  const { w, h } = best;
  const polygon = [
    [norm(best.x1, w), norm(best.y1, h)],
    [norm(best.x2, w), norm(best.y1, h)],
    [norm(best.x2, w), norm(best.y2, h)],
    [norm(best.x1, w), norm(best.y2, h)],
  ];
  const areaPercent = Math.round((((best.x2 - best.x1) * (best.y2 - best.y1)) / (w * h)) * 1000) / 10;
  let reference = null;
  if (!isMenu(trade)) {
    const refs = REFERENCE_CONCEPTS.filter((r) => r.knownWidthM);
    // A reference lookup that fails just means no scale reference (percent only), never a failed photo.
    const found = await Promise.all(refs.map((r) => sam(r.concept, dataUrl).then((boxes) => ({ r, boxes }), () => ({ r, boxes: [] }))));
    for (const { r, boxes } of found) {
      const small = boxes.filter((b) => (b.x2 - b.x1) * (b.y2 - b.y1) < 0.05 * b.w * b.h);
      const top = small.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
      if (top && (top.confidence ?? 0) >= 0.6) {
        reference = { label: r.label, bbox: [norm(top.x1, top.w), norm(top.y1, top.h), norm(top.x2, top.w), norm(top.y2, top.h)], knownWidthM: r.knownWidthM };
        break;
      }
    }
  }
  return {
    regions: [{ label: best.concept, bbox: [polygon[0][0], polygon[0][1], polygon[2][0], polygon[2][1]], polygon, areaPercent }],
    reference,
    tiltDeg: 0,
    confidence: clamp(best.score, 0, 1),
  };
}

// ----- Muse Spark -----

const ASSESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    severity: { type: "string", enum: ["Minor", "Moderate", "Severe"] },
    material: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        confidence: { type: "number" },
        alternatives: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, confidence: { type: "number" } }, required: ["name", "confidence"] } },
      },
      required: ["name", "confidence", "alternatives"],
    },
    failedPart: { type: "string" },
    workNeeded: { type: "array", items: { type: "string" } },
    emergency: {
      anyOf: [
        { type: "null" },
        { type: "object", additionalProperties: false, properties: { isEmergency: { type: "boolean" }, reason: { type: "string" }, actions: { type: "array", items: { type: "string" } }, hotline: { type: "string" } }, required: ["isEmergency", "reason", "actions", "hotline"] },
      ],
    },
    serviceMatch: { type: "array", items: { type: "object", additionalProperties: false, properties: { serviceId: { type: "string" }, name: { type: "string" }, fit: { type: "string" } }, required: ["serviceId", "name", "fit"] } },
    clinicianFlags: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["summary", "severity", "material", "failedPart", "workNeeded", "emergency", "serviceMatch", "clinicianFlags", "confidence"],
};

export async function assess({ trade = "roofing", description = "", urgency = null, segmentation = null, measurement = null, dataUrl = null, tenant = { name: "the business" }, route = null, feedback = null } = {}) {
  const spa = isMenu(trade);
  const r = routed(route, { model: MODELS.spark, effort: "medium" });
  const out = await sparkJson({
    system: fill(section("assess"), { trade, tenant }) + (spa ? `${menuRules(trade)}\nPublished services: ${JSON.stringify((tenant.services || []).map((s) => ({ id: s.id, name: s.name, concerns: s.concerns })))}` : ""),
    user: JSON.stringify({ description, urgency, segmentation, measurement, ...(feedback?.length ? { reviewerFeedback: feedback, rule: "A separate reviewer rejected your last card for these reasons. Fix each one from the evidence, or say the evidence is missing. Do not just reword." } : {}) }),
    image: await shrinkDataUrl(dataUrl, ASSESS_EDGE),
    schema: ASSESS_SCHEMA,
    name: "assessment",
    model: r.model,
    effort: r.effort,
  });
  return {
    summary: String(out.summary || ""),
    severity: ["Minor", "Moderate", "Severe"].includes(out.severity) ? out.severity : "Moderate",
    material: { name: String(out.material?.name || "unknown"), confidence: clamp(out.material?.confidence, 0, 1), alternatives: (out.material?.alternatives || []).slice(0, 2) },
    failedPart: String(out.failedPart || "unknown"),
    workNeeded: (out.workNeeded || []).map(String),
    emergency: out.emergency && out.emergency.isEmergency ? out.emergency : null,
    serviceMatch: spa ? (out.serviceMatch || []).filter((s) => (tenant.services || []).some((t) => t.id === s.serviceId)) : undefined,
    clinicianFlags: spa ? (out.clinicianFlags || []).map(String) : undefined,
    confidence: clamp(out.confidence, 0, 1),
    usage: usageOf(out, r.model, r.effort),
  };
}

// Layer 2: a separate Muse Spark pass that only reads the evidence and the drafted card, and never writes one.
export async function judgeAssessment({ trade = "roofing", description = "", segmentation = null, measurement = null, assessment = null, quote = null, dataUrl = null, tenant = { name: "the business" }, route = null } = {}) {
  const r = routed(route, { model: MODELS.spark, effort: "medium" });
  const out = await sparkJson({
    system: fill(section("judgeAssessment"), { trade, tenant }),
    user: JSON.stringify({ evidence: { description, segmentation, measurement }, card: { assessment, quote: quote && { low: quote.low, high: quote.high, lines: quote.lines, reason: quote.reason } } }),
    image: await shrinkDataUrl(dataUrl, route?.tier === "large" ? ASSESS_EDGE : JUDGE_EDGE),
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        verdict: { type: "string", enum: ["PASS", "FAIL"] },
        issues: { type: "array", items: { type: "object", additionalProperties: false, properties: { type: { type: "string", enum: ["contradiction", "unsupported", "missing"] }, detail: { type: "string" } }, required: ["type", "detail"] } },
      },
      required: ["verdict", "issues"],
    },
    name: "judge",
    model: r.model,
    effort: r.effort,
  });
  const issues = (out.issues || []).map((i) => ({ type: i.type, detail: String(i.detail || "") })).filter((i) => i.detail);
  return { verdict: out.verdict === "PASS" && issues.length === 0 ? "PASS" : "FAIL", issues, usage: usageOf(out, r.model, r.effort) };
}

const CONVERSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    extracted: {
      type: "object",
      additionalProperties: false,
      properties: { description: { type: ["string", "null"] }, address: { type: ["string", "null"] }, urgency: { type: ["string", "null"] }, intent: { type: ["string", "null"] } },
      required: ["description", "address", "urgency", "intent"],
    },
    nextAction: { type: "string", enum: ["ask_description", "ask_address", "ask_consent", "ask_photo", "assess", "none"] },
  },
  required: ["reply", "extracted", "nextAction"],
};

// Trades with person photos ask for consent and never an address; on-site trades ask for the address and never
// for consent. The schema enforces it per trade.
const converseSchemaFor = (trade) => ({
  ...CONVERSE_SCHEMA,
  properties: {
    ...CONVERSE_SCHEMA.properties,
    nextAction: { type: "string", enum: tradeProfile(trade).personPhoto ? ["ask_description", "ask_consent", "ask_photo", "assess", "none"] : ["ask_description", "ask_address", "ask_photo", "assess", "none"] },
  },
});

export async function converse({ trade = "roofing", messages = [], caseState = {}, tenant = { name: "the business" }, route = null } = {}) {
  const r = routed(route, { model: MODELS.sparkLight, effort: "low" });
  const out = await sparkJson({
    system: fill(section("converse"), { trade, tenant }) + menuRules(trade),
    user: JSON.stringify({ conversation: messages, caseState, rule: orderRule(trade) }),
    schema: converseSchemaFor(trade),
    name: "turn",
    model: r.model,
    effort: r.effort,
  });
  const extracted = {};
  for (const k of ["description", "address", "urgency", "intent"]) if (out.extracted?.[k]) extracted[k] = String(out.extracted[k]);
  return { reply: String(out.reply || ""), extracted, nextAction: out.nextAction || "none", usage: usageOf(out, r.model, r.effort) };
}

// The desk agent: one plan-act-observe step. Returns a tool call or the answer (see prompts.md#agentStep).
const TOOL_NAMES = ["check_calendar", "rate_card", "business_facts", "customer_history", "storm_reports"];
export async function agentStep({ trade = "roofing", tenant = { name: "the business" }, messages = [], caseState = {}, observations = [], tools = [], mustAnswer = false, route = null } = {}) {
  const r = routed(route, { model: MODELS.sparkLight, effort: "low" });
  const base = converseSchemaFor(trade);
  const out = await sparkJson({
    system: fill(section("agentStep"), { trade, tenant }) + "\n\nQualifying rules:\n" + fill(section("converse"), { trade, tenant }) + menuRules(trade),
    user: JSON.stringify({ conversation: messages, caseState, tools, observations, mustAnswer, rule: orderRule(trade) }),
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        thought: { type: "string" },
        action: { type: "string", enum: mustAnswer ? ["answer"] : ["tool", "answer"] },
        tool: { type: ["string", "null"], enum: [...TOOL_NAMES, null] },
        args: { type: "object", additionalProperties: false, properties: { day: { type: ["string", "null"] }, topic: { type: ["string", "null"] } }, required: ["day", "topic"] },
        reply: { type: "string" },
        extracted: base.properties.extracted,
        nextAction: base.properties.nextAction,
      },
      required: ["thought", "action", "tool", "args", "reply", "extracted", "nextAction"],
    },
    name: "agent_step",
    model: r.model,
    effort: r.effort,
  });
  const extracted = {};
  for (const k of ["description", "address", "urgency", "intent"]) if (out.extracted?.[k]) extracted[k] = String(out.extracted[k]);
  return { action: out.action === "tool" && out.tool ? "tool" : "answer", tool: out.tool, args: out.args || {}, thought: String(out.thought || ""), reply: String(out.reply || ""), extracted, nextAction: out.nextAction || "none", usage: usageOf(out, r.model, r.effort) };
}

export async function reactivateMessage({ lead = {}, tenant = { name: "the business" }, storm = null } = {}) {
  const out = await sparkJson({
    system: fill(section("reactivateMessage"), { tenant }) + (storm ? `\n\nStorm check-in:\n${section("stormCheckin")}` : ""),
    user: JSON.stringify({ lead: { firstName: lead.firstName, name: lead.name, history: lead.history || [], serviceType: lead.serviceType }, ...(storm ? { storm } : {}) }),
    schema: { type: "object", additionalProperties: false, properties: { message: { type: "string" }, generic: { type: "boolean" } }, required: ["message", "generic"] },
    name: "reopener",
    model: MODELS.sparkLight,
  });
  const generic = !storm && (!Array.isArray(lead.history) || lead.history.length === 0 || out.generic === true);
  return { message: String(out.message || ""), generic };
}

// ----- Talk to your desk -----

export async function deskCommand({ utterance = "", snapshot = {}, tenant = { name: "the business" } } = {}) {
  const ids = [...(snapshot.quotes || []), ...(snapshot.reopeners || [])].map((x) => x.id);
  const out = await sparkJson({
    system: fill(section("deskCommand"), { tenant }),
    user: JSON.stringify({ owner_said: utterance, desk: snapshot }),
    // Owner questions get the same speed setting as customer chat; every action still needs the owner's Confirm.
    effort: CHAT_EFFORT,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        intent: { type: "string", enum: ["brief", "approve_quote", "send_quote", "approve_reopener", "send_reopener", "none"] },
        targetId: { type: ["string", "null"] },
        reply: { type: "string" },
      },
      required: ["intent", "targetId", "reply"],
    },
    name: "desk",
    model: MODELS.sparkLight,
  });
  // The model may only point at something that is on the desk.
  const targetId = ids.includes(out.targetId) ? out.targetId : null;
  return { intent: out.intent || "none", targetId, reply: String(out.reply || "") };
}

// ----- Instant setup -----

const NULLABLE_NUM = { type: ["number", "null"] };
const SETUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    trade: { type: "string", enum: [...TRADE_IDS, "unsupported"] },
    tradeLabel: { type: "string" },
    serviceArea: { type: ["string", "null"] },
    summary: { type: "string" },
    services: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" }, priceLow: NULLABLE_NUM, priceHigh: NULLABLE_NUM, keywords: { type: "array", items: { type: "string" } }, evidence: { type: "string" } },
        required: ["name", "priceLow", "priceHigh", "keywords", "evidence"],
      },
    },
    greeting: { type: "string" },
    heroTitle: { type: "string" },
    heroText: { type: "string" },
    placeholder: { type: "string" },
    evidence: { type: "array", items: { type: "object", additionalProperties: false, properties: { field: { type: "string" }, quote: { type: "string" } }, required: ["field", "quote"] } },
    rateCard: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            materials: { type: "array", items: { type: "object", additionalProperties: false, properties: { material: { type: "string" }, price: { type: "number" }, unit: { type: "string", enum: ["m2", "sqft", "square"] }, evidence: { type: "string" } }, required: ["material", "price", "unit", "evidence"] } },
            labourPerHour: NULLABLE_NUM,
            minimumHours: NULLABLE_NUM,
          },
          required: ["materials", "labourPerHour", "minimumHours"],
        },
      ],
    },
    confidence: { type: "number" },
  },
  required: ["name", "trade", "tradeLabel", "serviceArea", "summary", "services", "greeting", "heroTitle", "heroText", "placeholder", "evidence", "rateCard", "confidence"],
};

export async function setupTenant({ site = {} } = {}) {
  const out = await sparkJson({
    system: section("setupTenant"),
    user: JSON.stringify({ url: site.url, title: site.title, siteName: site.siteName, description: site.description, text: String(site.text || "").slice(0, 9000) }),
    schema: SETUP_SCHEMA,
    name: "tenant",
  });
  // Keep only prices that actually appear in the site text: a number the model wrote that the site never printed is dropped.
  const printed = printedDollars(site.text);
  const services = (out.services || []).slice(0, 10).map((sv) => ({
    ...sv,
    priceLow: printed.has(Number(sv.priceLow)) ? Number(sv.priceLow) : null,
    priceHigh: printed.has(Number(sv.priceHigh)) ? Number(sv.priceHigh) : printed.has(Number(sv.priceLow)) ? Number(sv.priceLow) : null,
  }));
  // Roofing rates: only numbers the site printed survive, converted to USD per square metre in code.
  const rateCard = out.trade === "roofing" ? rateCardFromSite(out.rateCard, site.text) : null;
  return { ...out, services, rateCard, confidence: clamp(out.confidence, 0, 1) };
}

// ----- Muse Image -----

// The composed card (annotated photo + text) is the reference image; Muse Image renders the finished visual.
export async function renderReportVisual(input) {
  const composed = await composeReport(input);
  const text = await post("responses", {
    model: MODELS.image,
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: fill(section("renderReportVisual"), { tenant: input.tenant || {} }) + " Keep every word and the outlined photo exactly as in the reference; change only the layout and finish. Invent nothing: no IDs, dates, page numbers or marks." },
          { type: "input_image", image_url: composed.imageDataUrl },
        ],
      },
    ],
  });
  const data = JSON.parse(text);
  const item = (data.output || []).find((o) => o.type === "image_generation_call" && o.result);
  if (!item) throw new Error("Muse Image returned no image.");
  // Muse Image returns WebP today; sniff the magic bytes so the data URL has the right type.
  const mime = item.result.startsWith("UklGR") ? "image/webp" : item.result.startsWith("/9j/") ? "image/jpeg" : "image/png";
  return { imageDataUrl: `data:${mime};base64,${item.result}` };
}

// "See it fixed": Muse Image edits the customer's own photo to show the roof after the repair.
// Roofing only; the UI labels the result as an illustration, never a promise.
// kind "look" (salon, barber): the same person after the matched service, for "Preview the look".
export async function previewRepair({ photoDataUrl, segmentation, tenant, kind = "repair", service = "" }) {
  const area = (segmentation?.regions || []).map((r) => r.label).filter(Boolean).join(", ") || "the outlined damage";
  const prompt = kind === "look" ? fill(section("previewLook"), { tenant: tenant || {}, service: service || "the service they asked about" }) : fill(section("previewRepair"), { tenant: tenant || {}, area });
  const text = await post("responses", {
    model: MODELS.image,
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: await shrinkDataUrl(photoDataUrl, 1024) },
        ],
      },
    ],
  });
  const data = JSON.parse(text);
  const item = (data.output || []).find((o) => o.type === "image_generation_call" && o.result);
  if (!item) throw new Error("Muse Image returned no image.");
  const mime = item.result.startsWith("UklGR") ? "image/webp" : item.result.startsWith("/9j/") ? "image/jpeg" : "image/png";
  return { imageDataUrl: `data:${mime};base64,${item.result}` };
}

// ----- Muse Voice Transcribe -----

// audio: { base64, mimeType } of a mono 16-bit WAV. The proxy turns it into the multipart request.
export async function transcribeCall({ audio } = {}) {
  if (!audio?.base64) throw new Error("transcribeCall needs recorded audio.");
  const text = await post("asr/transcribe", null, {
    multipart: {
      request: { model: MODELS.voice, audioEncoding: "WAV", mode: "DIARIZATION" },
      audio: { base64: audio.base64, mimeType: audio.mimeType || "audio/wav", filename: "call.wav" },
    },
  });
  const data = JSON.parse(text);
  const turns = Array.isArray(data.turns) ? data.turns : [];
  const transcript = String(data.transcript || data.text || turns.map((t) => t.text || t.transcript || "").join(" ")).trim();
  return { transcript, segments: turns };
}
