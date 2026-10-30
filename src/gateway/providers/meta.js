// Meta provider (Phase 4): the mandated models through the Meta Model API, behind /api/ai/meta.
//   segmentDamage      → SAM 3.1          POST /v1/responses (streamed text lane of boxes + masks)
//   assess / converse / reactivateMessage → Muse Spark   POST /v1/chat/completions, JSON-schema output
//   renderReportVisual → Muse Image       POST /v1/responses, image_generation_call
//   transcribeCall     → Muse Voice Transcribe  POST /v1/asr/transcribe (multipart via the proxy)
// Written from dev.meta.ai/docs on 28 Oct 2026. Untested until a MODEL_API_KEY is set; the
// contract tests (tests/contract.js) are the gate before it is shown to anyone.
// Same return shapes as mock.js; prompts are read from prompts/prompts.md.
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

// ----- plumbing -----

async function post(path, body, extra = {}) {
  const res = await fetch("/api/ai/meta", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, body, ...extra }),
  });
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
  const re = new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=^## |\\s*$)`, "m");
  const m = promptsMd.match(re);
  if (!m) throw new Error(`prompts.md has no section "${name}"`);
  return m[1].trim();
}
const sharedRules = () => (promptsMd.match(/Shared rules for every prompt:\n([\s\S]*?)\n\n## /) || [])[1] || "";
const medspaRules = () => (promptsMd.match(/## Med spa variants[^\n]*\n([\s\S]*)$/) || [])[1] || "";
const fill = (text, vars) => text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, p) => p.split(".").reduce((o, k) => (o ? o[k] : undefined), vars) ?? "unknown");
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));

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
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Muse Spark returned something that was not JSON.");
  }
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
  const concepts = trade === "medspa" ? ["area of skin concern"] : ROOF_CONCEPTS;
  let best = null;
  const perConcept = await Promise.all(concepts.map((concept) => sam(concept, dataUrl).then((boxes) => boxes.map((b) => ({ ...b, concept })))));
  for (const b of perConcept.flat()) {
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
  if (trade !== "medspa") {
    const refs = REFERENCE_CONCEPTS.filter((r) => r.knownWidthM);
    const found = await Promise.all(refs.map((r) => sam(r.concept, dataUrl).then((boxes) => ({ r, boxes }))));
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

export async function assess({ trade = "roofing", description = "", urgency = null, segmentation = null, measurement = null, dataUrl = null, tenant = { name: "the business" } } = {}) {
  const spa = trade === "medspa";
  const out = await sparkJson({
    system: fill(section("assess"), { trade, tenant }) + (spa ? `\n\nMed spa rules:\n${medspaRules()}\nPublished services: ${JSON.stringify((tenant.services || []).map((s) => ({ id: s.id, name: s.name, concerns: s.concerns })))}` : ""),
    user: JSON.stringify({ description, urgency, segmentation, measurement }),
    image: dataUrl,
    schema: ASSESS_SCHEMA,
    name: "assessment",
    effort: "medium",
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
  };
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

// Roofing never asks for consent; med spa never asks for an address. The schema enforces it per trade.
const converseSchemaFor = (trade) => ({
  ...CONVERSE_SCHEMA,
  properties: {
    ...CONVERSE_SCHEMA.properties,
    nextAction: { type: "string", enum: trade === "medspa" ? ["ask_description", "ask_consent", "ask_photo", "assess", "none"] : ["ask_description", "ask_address", "ask_photo", "assess", "none"] },
  },
});

export async function converse({ trade = "roofing", messages = [], caseState = {}, tenant = { name: "the business" } } = {}) {
  const out = await sparkJson({
    system: fill(section("converse"), { trade, tenant }) + (trade === "medspa" ? `\n\nMed spa rules:\n${medspaRules()}` : ""),
    user: JSON.stringify({ conversation: messages, caseState, rule: trade === "medspa" ? "Order: ask_description, then ask_consent (photo optional), then ask_photo, then assess. Never ask for an address." : "Order: ask_description, then ask_address, then ask_photo, then assess. If caseState.address is filled and there is no photo, nextAction is ask_photo. Never ask for consent." }),
    schema: converseSchemaFor(trade),
    name: "turn",
    model: MODELS.sparkLight,
  });
  const extracted = {};
  for (const k of ["description", "address", "urgency", "intent"]) if (out.extracted?.[k]) extracted[k] = String(out.extracted[k]);
  return { reply: String(out.reply || ""), extracted, nextAction: out.nextAction || "none" };
}

export async function reactivateMessage({ lead = {}, tenant = { name: "the business" } } = {}) {
  const out = await sparkJson({
    system: fill(section("reactivateMessage"), { tenant }),
    user: JSON.stringify({ lead: { firstName: lead.firstName, name: lead.name, history: lead.history || [], serviceType: lead.serviceType } }),
    schema: { type: "object", additionalProperties: false, properties: { message: { type: "string" }, generic: { type: "boolean" } }, required: ["message", "generic"] },
    name: "reopener",
    model: MODELS.sparkLight,
  });
  const generic = !Array.isArray(lead.history) || lead.history.length === 0 || out.generic === true;
  return { message: String(out.message || ""), generic };
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
          { type: "input_text", text: fill(section("renderReportVisual"), { tenant: input.tenant || {} }) + " Keep every word and the outlined photo exactly as in the reference; change only the layout and finish." },
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
