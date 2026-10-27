// Mock provider: deterministic canned output for tests and rehearsals only.
// Always labelled "Mock" in the UI. It never looks at pixels; it returns the same
// outline for every photo, so the owner can rehearse the journey without any key.
//
// Return shapes (the contract every provider must honour):
//   segmentDamage({ photoName, width, height })
//     -> { regions: [{ label, bbox:[x0,y0,x1,y1], polygon:[[x,y]...], areaPercent }],
//          reference: { label, bbox, knownWidthM } | null, tiltDeg, confidence }
//   assess({ trade, description, urgency, segmentation, measurement })
//     -> { summary, severity: "Minor"|"Moderate"|"Severe", material:{ name, confidence, alternatives:[{name,confidence}] },
//          failedPart, workNeeded:[string], emergency: { isEmergency, reason, actions:[string], hotline } | null, confidence }
//   converse({ trade, messages, caseState })
//     -> { reply, extracted: { description?, address?, urgency?, intent? }, nextAction: "ask_description"|"ask_address"|"ask_photo"|"assess"|"none" }
//   reactivateMessage({ lead }) -> { message, generic: boolean }
//   renderReportVisual({ photoDataUrl, segmentation, assessment, quote, tenant }) -> { imageDataUrl }
//   transcribeCall({ audio }) -> { transcript, segments: [] }
//
// Coordinates are normalised 0-1000 on both axes.

import { areaPercent } from "@/lib/eye";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A fixed damage outline on the upper-middle of the roof, plus a standard 3-tab shingle tab
// as the scale reference. A photo whose file name contains "noref" has no reference in frame,
// which exercises the no-reference rule (percent only, no square metres).
export async function segmentDamage({ photoName = "" } = {}) {
  await wait(900);
  const polygon = [
    [372, 318],
    [604, 296],
    [648, 412],
    [612, 486],
    [455, 502],
    [386, 430],
  ];
  const noReference = /noref/i.test(photoName);
  return {
    regions: [
      {
        label: "missing and lifted shingle tabs",
        bbox: [372, 296, 648, 502],
        polygon,
        areaPercent: Math.round(areaPercent(polygon) * 10) / 10,
      },
    ],
    reference: noReference
      ? null
      : { label: "standard 3-tab shingle tab (305 mm)", bbox: [690, 560, 782, 586], knownWidthM: 0.305 },
    tiltDeg: 24,
    confidence: 0.74,
  };
}

export async function assess({ description = "", urgency = null, measurement = null } = {}) {
  await wait(1100);
  const text = description.toLowerCase();
  const electrical = /spark|electric|wire|outlet|light fitting|fuse/.test(text);
  const inside = /ceiling|inside|dripping|bucket|bedroom|living room|kitchen/.test(text);
  const severity = electrical ? "Severe" : inside || urgency === "urgent" ? "Moderate" : "Minor";
  const areaNote =
    measurement && measurement.areaM2 !== null
      ? `about ${measurement.areaM2} m² of covering`
      : `roughly ${measurement ? measurement.areaPercent : "a small"}% of the visible roof`;
  return {
    summary: `Wind has lifted and torn away shingle tabs above the eave, exposing the underlay across ${areaNote}. ${
      inside ? "Water reaching the ceiling means the underlay is already letting water through." : "The underlay is still holding, but the next rain will reach it."
    }`,
    severity,
    material: {
      name: "asphalt shingle",
      confidence: 0.78,
      alternatives: [
        { name: "concrete tile", confidence: 0.12 },
        { name: "metal sheet", confidence: 0.06 },
      ],
    },
    failedPart: "Wind-lifted and missing 3-tab shingles above the eave",
    workNeeded: [
      "Remove loose and damaged tabs back to sound shingles",
      "Check and patch the underlay where it is exposed",
      "Fit new matching shingles, sealed at the tabs",
      "Inspect the eave flashing and adjacent courses for lift",
    ],
    emergency: electrical
      ? {
          isEmergency: true,
          reason: "Water near electrics is a shock and fire risk.",
          actions: [
            "Switch off power at the main breaker if you can reach it safely",
            "Do not touch wet switches, outlets or light fittings",
            "Keep everyone out of the wet room",
            "Call the emergency line if you see sparks or smell burning",
          ],
          hotline: "911",
        }
      : null,
    confidence: 0.72,
  };
}

export async function converse({ messages = [], caseState = {} } = {}) {
  await wait(600);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content || "").trim();
  const extracted = {};
  const asked = caseState.lastQuestion || null;

  if (!caseState.description) {
    if (!text) {
      return { reply: "Tell me what's going on with the roof. Where is the water coming in, and when did it start?", extracted, nextAction: "ask_description" };
    }
    extracted.description = text;
    extracted.urgency = /leak|drip|water|storm|now|urgent|tonight|pouring/i.test(text) ? "urgent" : "routine";
    extracted.intent = "repair";
    return {
      reply: "Got it. One thing before the photo: what's the address of the property? Street and town is enough.",
      extracted,
      nextAction: "ask_address",
    };
  }
  if (!caseState.address) {
    if (asked === "ask_address" && text) {
      extracted.address = text;
      return {
        reply: "Thanks. Now a photo of the damage, please. Stand back for a wide shot if you can; a close-up works too.",
        extracted,
        nextAction: "ask_photo",
      };
    }
    return { reply: "What's the address of the property? Street and town is enough.", extracted, nextAction: "ask_address" };
  }
  if (!caseState.photo) {
    return { reply: "Add a photo of the damage when you're ready and I'll outline what I see.", extracted, nextAction: "ask_photo" };
  }
  return { reply: "I've got everything I need. Here is the assessment.", extracted, nextAction: "assess" };
}

export async function reactivateMessage({ lead = {} } = {}) {
  await wait(500);
  const hasHistory = Array.isArray(lead.history) && lead.history.length > 0;
  if (!hasHistory) {
    return { message: `Hi${lead.name ? ` ${lead.name}` : ""}, it's the team here. Is the roof job still on your list? Happy to book a quick look.`, generic: true };
  }
  const last = lead.history[lead.history.length - 1];
  return { message: `Hi ${lead.name}, following up on the ${last.topic} you asked about in ${last.when}. Want us to pick it up where we left off?`, generic: false };
}

// Composes the annotated photo and the summary onto one canvas. Labelled Mock: it is a composition, not a generated image.
export async function renderReportVisual({ photoDataUrl, segmentation, assessment, quote, tenant } = {}) {
  await wait(700);
  const img = await loadImage(photoDataUrl);
  const W = 1200;
  const scale = W / img.width;
  const H = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H + 220;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, W, H);
  for (const r of segmentation?.regions || []) {
    ctx.beginPath();
    r.polygon.forEach(([x, y], i) => {
      const px = (x / 1000) * W;
      const py = (y / 1000) * H;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(241,90,36,0.28)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f15a24";
    ctx.stroke();
  }
  ctx.fillStyle = "#101216";
  ctx.font = "600 34px sans-serif";
  ctx.fillText(`${tenant?.name || "Roof report"} - damage report`, 40, H + 56);
  ctx.font = "400 24px sans-serif";
  ctx.fillStyle = "#5a5b61";
  wrap(ctx, assessment?.summary || "", 40, H + 100, W - 80, 30, 2);
  ctx.fillStyle = "#101216";
  ctx.font = "500 24px sans-serif";
  const money = quote && quote.low !== null ? `Draft range $${quote.low}-$${quote.high} USD. ${quote.disclaimer}` : "No measurement, so no dollar total yet. Site visit to confirm.";
  ctx.fillText(`Severity: ${assessment?.severity || "-"}.  ${money}`, 40, H + 190);
  return { imageDataUrl: canvas.toDataURL("image/jpeg", 0.85) };
}

export async function transcribeCall() {
  await wait(800);
  return {
    transcript: "Hi, we've got water coming through the bedroom ceiling since the storm last night. It's at 14 Larkspur Lane in Lyons.",
    segments: [],
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = w;
      if (++lines >= maxLines - 1) break;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}
