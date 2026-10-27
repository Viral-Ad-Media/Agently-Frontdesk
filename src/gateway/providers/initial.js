// Interim provider (Phase 1): Claude via the Anthropic Messages API, behind the dev proxy in vite.config.js.
// Same return shapes as mock.js. Prompts are read from prompts/prompts.md, never written here.
// Swapping to Meta models is a provider change, not a UI change.
import promptsMd from "../../../prompts/prompts.md?raw";

export const LABEL = "Interim provider (Claude)";

const MODEL = import.meta.env.VITE_ANTHROPIC_MODEL || "claude-sonnet-5-5";

function section(name) {
  const re = new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=^## |\\s*$)`, "m");
  const m = promptsMd.match(re);
  if (!m) throw new Error(`prompts.md has no section "${name}"`);
  return m[1].trim();
}

function sharedRules() {
  const m = promptsMd.match(/Shared rules for every prompt:\n([\s\S]*?)\n\n## /);
  return m ? m[1].trim() : "";
}

const fill = (text, vars) => text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), vars) ?? "unknown");

function imageBlock(dataUrl) {
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl || "");
  return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
}

async function ask({ system, user, image = null, maxTokens = 1200 }) {
  const content = [];
  const img = imageBlock(image);
  if (img) content.push(img);
  content.push({ type: "text", text: user });
  const res = await fetch("/api/ai/anthropic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: `${system}\n\n${sharedRules()}\n\nReturn only a JSON object. No prose, no code fences.`,
      messages: [{ role: "user", content }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || data.error || `Interim provider returned ${res.status}`);
  const text = (data.content || []).map((b) => b.text || "").join("");
  const json = text.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("Interim provider returned something that was not JSON.");
  }
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
const pt = (p) => [clamp(p[0], 0, 1000), clamp(p[1], 0, 1000)];

export async function segmentDamage({ dataUrl, photoName = "" } = {}) {
  if (!dataUrl) throw new Error("segmentDamage needs the photo.");
  const out = await ask({
    system: section("segmentDamage"),
    user: `Photo file name: ${photoName}. Return {"regions":[{"label","bbox":[x0,y0,x1,y1],"polygon":[[x,y],...]}],"reference":{"label","bbox":[x0,y0,x1,y1],"knownWidthM"}|null,"tiltDeg","confidence"} with every coordinate normalised 0-1000.`,
    image: dataUrl,
  });
  const regions = (out.regions || []).filter((r) => Array.isArray(r.polygon) && r.polygon.length >= 3).map((r) => {
    const polygon = r.polygon.map(pt);
    const xs = polygon.map((p) => p[0]);
    const ys = polygon.map((p) => p[1]);
    let twice = 0;
    for (let i = 0; i < polygon.length; i++) {
      const [x1, y1] = polygon[i];
      const [x2, y2] = polygon[(i + 1) % polygon.length];
      twice += x1 * y2 - x2 * y1;
    }
    return {
      label: String(r.label || "damage"),
      bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      polygon,
      areaPercent: Math.round((Math.abs(twice) / 2 / 1e6) * 1000) / 10,
    };
  });
  const ref = out.reference && out.reference.knownWidthM > 0 && Array.isArray(out.reference.bbox) ? { label: String(out.reference.label), bbox: out.reference.bbox.map((n) => clamp(n, 0, 1000)), knownWidthM: Number(out.reference.knownWidthM) } : null;
  return { regions, reference: ref, tiltDeg: clamp(out.tiltDeg, 0, 75), confidence: clamp(out.confidence, 0, 1) };
}

export async function assess({ trade = "roofing", description = "", urgency = null, segmentation = null, measurement = null, dataUrl = null, tenant = { name: "the business" } } = {}) {
  const out = await ask({
    system: fill(section("assess"), { trade, tenant }),
    user: JSON.stringify({ description, urgency, segmentation, measurement }),
    image: dataUrl,
  });
  const sev = ["Minor", "Moderate", "Severe"].includes(out.severity) ? out.severity : "Moderate";
  return {
    summary: String(out.summary || ""),
    severity: sev,
    material: {
      name: String(out.material?.name || "unknown"),
      confidence: clamp(out.material?.confidence, 0, 1),
      alternatives: (out.material?.alternatives || []).slice(0, 2).map((a) => ({ name: String(a.name), confidence: clamp(a.confidence, 0, 1) })),
    },
    failedPart: String(out.failedPart || "unknown"),
    workNeeded: (out.workNeeded || []).map(String),
    emergency: out.emergency && out.emergency.isEmergency ? { isEmergency: true, reason: String(out.emergency.reason || ""), actions: (out.emergency.actions || []).map(String), hotline: String(out.emergency.hotline || "911") } : null,
    confidence: clamp(out.confidence, 0, 1),
  };
}

export async function converse({ trade = "roofing", messages = [], caseState = {}, tenant = { name: "the business" } } = {}) {
  const out = await ask({
    system: fill(section("converse"), { trade, tenant }),
    user: JSON.stringify({ conversation: messages, caseState }),
    maxTokens: 400,
  });
  const actions = ["ask_description", "ask_address", "ask_photo", "assess", "none"];
  return {
    reply: String(out.reply || ""),
    extracted: out.extracted && typeof out.extracted === "object" ? out.extracted : {},
    nextAction: actions.includes(out.nextAction) ? out.nextAction : "none",
  };
}

export async function reactivateMessage({ lead = {}, tenant = { name: "the business" } } = {}) {
  const out = await ask({ system: fill(section("reactivateMessage"), { tenant }), user: JSON.stringify({ lead }), maxTokens: 300 });
  const generic = !Array.isArray(lead.history) || lead.history.length === 0 || out.generic === true;
  return { message: String(out.message || ""), generic };
}

// Claude does not generate images; the interim report visual is the same canvas composition the mock uses.
export { renderReportVisual } from "./mock.js";

export async function transcribeCall() {
  throw new Error("Call transcription arrives with the Meta provider (Muse Voice Transcribe) in Phase 4.");
}
