// Mock provider: deterministic canned output for tests and rehearsals only.
// Always labelled "Mock" in the UI. It never looks at pixels; it returns the same
// outline for every photo, so the owner can rehearse the journey without any key.
//
// Return shapes (the contract every provider must honour):
//   segmentDamage({ trade, photoName, width, height, dataUrl })
//     -> { regions: [{ label, bbox:[x0,y0,x1,y1], polygon:[[x,y]...], areaPercent }],
//          reference: { label, bbox, knownWidthM } | null, tiltDeg, confidence }
//   assess({ trade, description, urgency, segmentation, measurement, tenant })
//     -> { summary, severity: "Minor"|"Moderate"|"Severe", material:{ name, confidence, alternatives:[{name,confidence}] },
//          failedPart, workNeeded:[string], emergency: { isEmergency, reason, actions:[string], hotline } | null, confidence,
//          serviceMatch?: [{ serviceId, name, fit }], clinicianFlags?: [string] }   (med spa only)
//   converse({ trade, messages, caseState, tenant })
//     -> { reply, extracted: { description?, address?, urgency?, intent? },
//          nextAction: "ask_description"|"ask_address"|"ask_consent"|"ask_photo"|"assess"|"none" }
//   reactivateMessage({ lead, tenant, storm? }) -> { message, generic: boolean }   (storm: { event, area, when, hailIn, windMph })
//   renderReportVisual({ photoDataUrl, segmentation, assessment, quote, tenant }) -> { imageDataUrl }
//   transcribeCall({ audio }) -> { transcript, segments: [] }
//
// Coordinates are normalised 0-1000 on both axes.

import { rateCardFromSite, readRateCard } from "../../lib/rateCard.js";
import { areaPercent } from "../../lib/eye.js";
import { readUtterance } from "../../lib/desk.js";
import { findAddress } from "../../lib/address.js";
import { QUESTION, NEEDS, DAY_WORD, THOUGHT } from "../../lib/agent.js";
import { isMenu, mentions, tradeProfile } from "../../config/trades.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Roofing: a fixed damage outline on the upper-middle of the roof, plus a standard 3-tab shingle tab
// as the scale reference. A photo whose file name contains "noref" has no reference in frame,
// which exercises the no-reference rule (percent only, no square metres).
// Med spa: a small concern-area outline, never a reference (nothing is measured in metres).
export async function segmentDamage({ trade = "roofing", photoName = "" } = {}) {
  await wait(900);
  if (isMenu(trade)) {
    const polygon = [
      [540, 430],
      [640, 418],
      [672, 500],
      [630, 560],
      [548, 548],
      [516, 490],
    ];
    return {
      regions: [{ label: trade === "medspa" ? "area of concern" : tradeProfile(trade).concepts?.[0] || "area of concern", bbox: [516, 418, 672, 560], polygon, areaPercent: Math.round(areaPercent(polygon) * 10) / 10 }],
      reference: null,
      tiltDeg: 0,
      confidence: 0.7,
    };
  }
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
    reference: noReference ? null : { label: "standard 3-tab shingle tab (305 mm)", bbox: [690, 560, 782, 586], knownWidthM: 0.305 },
    tiltDeg: 24,
    confidence: 0.74,
  };
}

export async function assess({ trade = "roofing", description = "", urgency = null, measurement = null, tenant = null } = {}) {
  await wait(1100);
  if (trade === "medspa") return assessMedspa({ description, tenant });
  if (isMenu(trade)) return assessMenu({ trade, description, tenant });
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

// Med spa: organises an inquiry and matches it to the spa's own services. Never a diagnosis, never a promised result.
function assessMedspa({ description, tenant }) {
  const text = description.toLowerCase();
  const services = tenant?.services || [];
  const scored = services
    .map((s) => ({ s, hits: s.concerns.filter((c) => text.includes(c.split(" ")[0])).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const matches = (scored.length ? scored : services.slice(0, 1).map((s) => ({ s, hits: 0 }))).slice(0, 2);
  const flags = ["Clinician to confirm skin type and sensitivity before any plan"];
  if (/pain|bleed|spread|grow|chang|itch|fever/.test(text)) flags.push("Client describes a change or discomfort: clinician to review before anything is offered");
  if (/pregnan|breastfeed/.test(text)) flags.push("Client mentions pregnancy or breastfeeding: clinician to advise on suitability");
  if (/retinol|accutane|isotretinoin|antibiotic/.test(text)) flags.push("Client mentions active skincare medication: clinician to check timing");
  const top = matches[0]?.s;
  return {
    summary: `You've described ${description.trim().replace(/\.$/, "") || "a skin concern"}. We've noted the area in your photo and matched it to ${
      top ? top.name : "a consultation"
    } from our service list. A clinician reviews this before anything is recommended.`,
    severity: flags.length > 1 ? "Moderate" : "Minor",
    material: { name: "service match", confidence: scored.length ? 0.7 : 0.4, alternatives: [] },
    failedPart: "Area of concern noted for clinician review (not a diagnosis)",
    workNeeded: ["A clinician reviews your photo and notes", "Consultation to confirm suitability and the plan", "Treatment only after the clinician agrees it with you"],
    serviceMatch: matches.map(({ s, hits }) => ({ serviceId: s.id, name: s.name, fit: hits > 0 ? "likely" : "to discuss" })),
    clinicianFlags: flags,
    emergency: null,
    confidence: scored.length ? 0.7 : 0.45,
  };
}

// Service-menu trades other than the med spa: plumbing, AC and appliance repair, hair salon, barber.
// Matches the enquiry to the business's own published services, flags what the pro must check first,
// and raises the emergency path for the trade's coded hazards. Never a price of its own.
function assessMenu({ trade, description, tenant }) {
  const prof = tradeProfile(trade);
  const text = description.toLowerCase();
  const services = tenant?.services || [];
  const scored = services
    .map((s) => ({ s, hits: s.concerns.filter((c) => mentions(text, c)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const matches = scored.slice(0, 2);
  const flags = [];
  if (trade === "salon" && /colou?r|dye|bleach|highlight|balayage|brassy|grey|gray|roots/.test(text)) flags.push("Colour service: allergy patch test at least 48 hours before");
  if (trade === "salon" && /brassy|orange|patchy|went wrong|green|box dye|box-dye/.test(text)) flags.push("Colour correction: stylist consultation before booking the service");
  if (trade === "barber" && /cut on|irritat|rash|bump|sore/.test(text)) flags.push("Scalp or skin irritation mentioned: barber checks before cutting");
  if (trade === "plumbing" && /water heater|boiler|tank/.test(text)) flags.push("Water heater: plumber checks the age and the pressure relief valve on site");
  if (trade === "hvac" && /error|code|flashing|blinking/.test(text)) flags.push("Error code: technician reads it on the unit's label to confirm the model");
  if (trade === "hvac" && /refrigerant|freon|hissing|ice/.test(text)) flags.push("Possible refrigerant issue: certified technician only, the customer never opens the unit");
  const danger = prof.hazard?.test(description);
  const top = matches[0]?.s;
  const who = prof.reviewer;
  return {
    summary: `You've described ${description.trim().replace(/[.?!]+$/, "").replace(/^[A-Z](?=[a-z])/, (x) => x.toLowerCase()) || "what you need"}. ${top ? `That matches ${top.name} on our menu.` : "Nothing on our published menu matches it exactly, so the " + who + " will advise."} The ${who} confirms it before anything is booked or priced.`,
    severity: danger ? "Severe" : flags.length ? "Moderate" : "Minor",
    material: { name: "service match", confidence: scored.length ? 0.72 : 0.4, alternatives: [] },
    failedPart: top ? top.name : `To confirm with the ${who}`,
    workNeeded: prof.onSite ? [`The ${who} confirms the problem on site`, "Repair at the published price range", "You approve the final price before work starts"] : [`Your ${who} confirms the service with you`, "The service at the published price", "Any extras agreed with you first"],
    serviceMatch: matches.map(({ s }) => ({ serviceId: s.id, name: s.name, fit: "likely" })),
    clinicianFlags: flags,
    emergency: danger
      ? {
          isEmergency: true,
          reason: trade === "hvac" ? "A gas or burning smell, smoke or sparks from an appliance" : "A gas smell, a burst pipe, flooding or water near electrics",
          actions: trade === "hvac" ? ["Switch the unit off at the breaker", "If you smell gas, leave the building and call from outside", "We call you straight back"] : ["Shut off the water at the main stop valve", "If you smell gas, leave the building and call from outside", "Keep clear of water near outlets or wiring"],
          hotline: "911 for gas or fire",
        }
      : null,
    confidence: scored.length ? 0.72 : 0.45,
  };
}

export async function converse({ trade = "roofing", messages = [], caseState = {}, tenant = null } = {}) {
  await wait(600);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content || "").trim();
  const extracted = {};
  const asked = caseState.lastQuestion || null;

  // A phone call: the whole transcript arrives at once, so qualify it in one pass.
  if (caseState.channel === "call" && text) {
    extracted.description = text;
    extracted.urgency = /leak|drip|water|storm|now|urgent|tonight|pouring/i.test(text) ? "urgent" : "routine";
    extracted.intent = trade === "medspa" ? "consultation" : "repair";
    const addr = text.match(/(?:it'?s at|address is|we'?re at|i'?m at)\s+([^.]+)\./i);
    if (addr) extracted.address = addr[1].trim();
    return {
      reply: addr
        ? "Thanks for calling. I've noted the problem and the address. I'm texting you a link so you can add a photo, and we'll outline the damage from there."
        : "Thanks for calling. I've noted the problem. What's the address of the property?",
      extracted,
      nextAction: addr ? "ask_photo" : "ask_address",
    };
  }

  // On-site menu trades (plumbing, AC): what's wrong, the address, then an optional photo.
  if (isMenu(trade) && tradeProfile(trade).onSite) {
    const w = tenant?.words || {};
    if (!caseState.description) {
      if (!text) return { reply: w.greeting || "Tell me what's going on.", extracted, nextAction: "ask_description" };
      extracted.description = text;
      extracted.urgency = tradeProfile(trade).hazard?.test(text) || /urgent|now|tonight|flood|no hot water|not cooling/i.test(text) ? "urgent" : "routine";
      extracted.intent = "repair";
      return { reply: `Got it. What's the address of the property? Street and town is enough.`, extracted, nextAction: "ask_address" };
    }
    if (!caseState.address) {
      if (asked === "ask_address" && text) {
        extracted.address = text;
        return { reply: `Thanks. If you can, add ${tradeProfile(trade).photoAsk}. It's optional, and I'll match it to our services.`, extracted, nextAction: "ask_photo" };
      }
      return { reply: "What's the address of the property? Street and town is enough.", extracted, nextAction: "ask_address" };
    }
    if (!caseState.photo) return { reply: `Add ${tradeProfile(trade).photoAsk} when you're ready, or skip it and I'll go from your description.`, extracted, nextAction: "ask_photo" };
    return { reply: "Thanks. Here's what we've noted.", extracted, nextAction: "assess" };
  }

  if (isMenu(trade)) {
    const studio = trade !== "medspa";
    if (!caseState.description) {
      if (!text) return { reply: studio ? tenant?.words?.greeting || "What would you like?" : "Tell me what you'd like help with, or what you've noticed about your skin.", extracted, nextAction: "ask_description" };
      extracted.description = text;
      extracted.urgency = "routine";
      extracted.intent = "consultation";
      return {
        reply: `Thank you. A photo helps our ${studio ? tradeProfile(trade).reviewer : "clinician"} see what you mean, but it's optional. If you'd like to share one, please confirm consent first.`,
        extracted,
        nextAction: "ask_consent",
      };
    }
    if (!caseState.consent) return { reply: "Whenever you're ready, confirm consent below and add a photo, or tell me more.", extracted, nextAction: "ask_consent" };
    if (!caseState.photo) return { reply: `Add ${tradeProfile(trade).photoAsk} when you're ready. Natural light, no filters.`, extracted, nextAction: "ask_photo" };
    return { reply: `Thank you. Here's what we've noted for the ${studio ? tradeProfile(trade).reviewer : "clinician"}.`, extracted, nextAction: "assess" };
  }

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

export async function reactivateMessage({ lead = {}, tenant = {}, storm = null } = {}) {
  await wait(500);
  const who = tenant.name || "the team";
  if (storm) {
    const first = lead.firstName || lead.name;
    // Freeze and heat check-ins (plumbing, AC): name what the weather service forecast, offer a check, never claim a fault.
    if (storm.kind === "freeze") {
      return {
        message: `Hi ${first}, it's ${who}. The weather service has a hard freeze${storm.lowF != null ? ` with lows near ${storm.lowF}°F` : ""} over ${storm.area || "your area"} ${storm.when || "soon"}. Dripping indoor faucets helps. If anything looks wrong after, reply YES and we'll book a quick pipe check.`,
        generic: false,
      };
    }
    if (storm.kind === "heat") {
      return {
        message: `Hi ${first}, it's ${who}. The weather service expects a heat wave${storm.heatIndexF != null ? ` with a heat index up to ${storm.heatIndexF}°F` : ""} over ${storm.area || "your area"} ${storm.when || "soon"}. Want an AC check before it peaks? Reply YES and we'll book a time.`,
        generic: false,
      };
    }
    // Storm check-in: name the storm the weather service reported, offer a free photo check, never claim damage.
    const facts = [storm.hailIn ? `${storm.hailIn} in hail` : "", storm.windMph ? `${storm.windMph} mph gusts` : ""].filter(Boolean).join(" and ");
    return {
      message: `Hi ${lead.firstName || lead.name}, it's ${who}. The weather service reported ${facts || "a severe storm"} over ${storm.area || "your area"} ${storm.when || "recently"}. Want a free photo check of your roof? Reply YES and we'll book a time.`,
      generic: false,
    };
  }
  const hasHistory = Array.isArray(lead.history) && lead.history.length > 0;
  if (!hasHistory) {
    return { message: `Hi${lead.firstName ? ` ${lead.firstName}` : ""}, it's ${who}. Is this still on your list? Happy to book a quick look whenever suits.`, generic: true };
  }
  const last = lead.history[lead.history.length - 1];
  const when = monthName(last.when);
  const nudge = /postpone|hold/i.test(last.summary) ? "Is now a better time?" : /budget/i.test(last.summary) ? "Happy to talk through options that fit." : /quote/i.test(last.summary) ? "Want us to pick it up where we left off?" : "Would a quick look help?";
  return { message: `Hi ${lead.firstName || lead.name}, it's ${who}. Back in ${when} you asked about ${last.topic}. ${nudge}`, generic: false };
}

function monthName(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  if (!y || !m) return "a while ago";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
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
  canvas.height = H + 260;
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
  const isSpa = tenant?.trade === "medspa";
  ctx.fillStyle = "#101216";
  ctx.font = "600 34px sans-serif";
  ctx.fillText(`${tenant?.name || "Report"} - ${isSpa ? "consultation notes" : "damage report"}`, 40, H + 56);
  ctx.font = "400 24px sans-serif";
  ctx.fillStyle = "#5a5b61";
  wrap(ctx, assessment?.summary || "", 40, H + 100, W - 80, 30, 3);
  ctx.fillStyle = "#101216";
  ctx.font = "500 22px sans-serif";
  const money = quote && quote.low !== null ? `Draft range $${quote.low}-$${quote.high} USD.` : "No dollar total yet.";
  ctx.fillText(`${isSpa ? "Priority" : "Severity"}: ${assessment?.severity || "-"}.  ${money}`, 40, H + 206);
  ctx.font = "400 18px sans-serif";
  ctx.fillStyle = "#5a5b61";
  ctx.fillText(quote?.disclaimer || tenant?.disclaimer || "", 40, H + 238);
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

// setupTenant({ site }) -> { name, trade, tradeLabel, serviceArea, summary, services[], greeting, heroTitle, heroText, placeholder, evidence[], confidence }
// Reads only what the site says: prices that are not written on the site come back null, never guessed.
export async function setupTenant({ site = {} } = {}) {
  await wait(800);
  const text = String(site.text || "");
  const lower = text.toLowerCase();
  const count = (re) => (lower.match(re) || []).length;
  const scores = {
    roofing: count(/roof|shingle|gutter|storm damage|hail/g),
    medspa: count(/facial|botox|filler|laser|med ?spa|skin|peel|injectable|microneedling|aesthetic/g),
    plumbing: count(/plumb|drain|faucet|toilet|water heater|pipe|sewer/g),
    hvac: count(/air condition|\bac\b|a\/c|hvac|refrigerat|fridge|freezer|appliance|cooling/g),
    salon: count(/salon|balayage|highlights|colou?r|blowout|stylist/g),
    barber: count(/barber|fade|beard|shave|line-?up/g),
  };
  const [best, n] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const trade = n === 0 ? "unsupported" : best;
  const rawName = site.siteName || String(site.title || "").split(/\s[|\-–—:]\s/)[0] || site.host || "Your business";
  const name = rawName.trim().slice(0, 60);
  const areaMatch = text.match(/(?:serving|proudly serving|located in|based in)\s+(?:the\s+)?([A-Z][A-Za-z.' ]+(?:,\s*[A-Z]{2})?)/);
  const serviceArea = areaMatch ? areaMatch[1].trim().replace(/\s+(and|&)$/, "") : null;
  const services = [];
  const evidence = [];
  for (const line of text.split("\n")) {
    // A per-unit rate ("$4.50 per sq ft", "$65 per hour") belongs to the rate card, not the service list.
    if (/\$\s?\d[\d,.]*\s*(?:\/|per)\s*(?:sq|m²|m2|square|hour|hr)/i.test(line)) continue;
    const m = line.match(/^-?\s*([A-Za-z][A-Za-z0-9 &'/()+-]{2,48}?)\s*[:\-–—|]?\s*(?:from\s+)?\$(\d[\d,]*)(?:\s*(?:-|–|to)\s*\$?(\d[\d,]*))?/i);
    if (m && /^(from|only|just|starting at|price|prices)$/i.test(m[1].trim())) continue;
    if (m && services.length < 10 && !services.some((x) => x.name.toLowerCase() === m[1].trim().toLowerCase())) {
      const low = Number(m[2].replace(/,/g, ""));
      const high = m[3] ? Number(m[3].replace(/,/g, "")) : low;
      services.push({ name: m[1].trim(), priceLow: low, priceHigh: high, keywords: m[1].toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 4), evidence: line.slice(0, 140) });
    }
  }
  if (serviceArea) evidence.push({ field: "serviceArea", quote: areaMatch[0] });
  evidence.push({ field: "name", quote: site.title || name });
  // Licence, insurance, warranty and review lines the site states, word for word, for the trust card.
  for (const line of text.split("\n").flatMap((l) => l.split(/\s·\s/))) {
    if (evidence.length >= 8) break;
    const q = line.replace(/^-\s*/, "").replace(/[★☆]+/g, "").trim();
    if (/licen[cs]|insured|bonded|warrant|rated \d|\d(?:\.\d)? stars?|since \d{4}|years in business/i.test(q) && q.length < 140 && !evidence.some((e) => e.quote === q)) evidence.push({ field: "trust", quote: q });
  }
  const rateCard = trade === "roofing" ? rateCardFromSite(readRateCard(text), text) : null;
  const isSpa = trade === "medspa";
  if (trade !== "unsupported" && trade !== "roofing" && trade !== "medspa") {
    const prof = tradeProfile(trade);
    return {
      name,
      trade,
      tradeLabel: prof.noun,
      serviceArea,
      summary: site.description || `${name}, read from ${site.host || "its website"}.`,
      services,
      greeting: `Tell me what you need from ${name}, and I'll match it to our services.`,
      heroTitle: `${prof.label}? ${name} can help.`,
      heroText: "Tell us what you need and add a photo if you like. We match it to our menu, give you the published price and book a time.",
      placeholder: "What do you need?",
      evidence,
      confidence: 0.6,
    };
  }
  return {
    name,
    trade,
    tradeLabel: trade === "unsupported" ? "business" : isSpa ? "med spa" : "roofing company",
    serviceArea,
    summary: site.description || `${name}, read from ${site.host || "its website"}.`,
    services,
    greeting: isSpa ? "Tell me what you'd like help with, or what you've noticed about your skin." : "Tell me what's going on with the roof, and where the water is getting in.",
    heroTitle: isSpa ? `Curious about a treatment at ${name}?` : `Roof trouble? ${name} can take a look.`,
    heroText: isSpa
      ? "Tell us what you've noticed, add a photo if you like, and we'll match it to our menu, give you the published price and book a consultation."
      : "Describe the problem and add a photo. We outline the damage, draft a price range and book a free inspection, in minutes.",
    placeholder: isSpa ? "What would you like help with?" : "What's happening with your roof?",
    evidence,
    rateCard,
    confidence: trade === "unsupported" ? 0.3 : 0.6,
  };
}

// "See it fixed" (rehearsal): paints matching new shingles over the outlined damage on the customer's own
// photo, so the before/after flow can be rehearsed offline. Muse Image does the real edit on the meta provider.
export async function previewRepair({ photoDataUrl, segmentation, kind = "repair" } = {}) {
  await wait(1400);
  const img = await loadImage(photoDataUrl);
  if (kind === "look") return { imageDataUrl: lookGrade(img) };
  const W = Math.min(1200, img.width);
  const H = Math.round(img.height * (W / img.width));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  // Average tone of the whole photo, darkened, as the new-shingle colour.
  const sample = ctx.getImageData(0, 0, W, H).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < sample.length; i += 4 * 97) {
    r += sample[i];
    g += sample[i + 1];
    b += sample[i + 2];
    n++;
  }
  const base = [r / n, g / n, b / n].map((v) => Math.round(v * 0.55));

  for (const region of segmentation?.regions || []) {
    const pts = (region.polygon || []).map(([x, y]) => [(x / 1000) * W, (y / 1000) * H]);
    if (pts.length < 3) continue;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const row = Math.max(8, Math.round(H / 60));
    const tab = row * 2.4;
    for (let y = y0 - row, k = 0; y < y1 + row; y += row, k++) {
      for (let x = x0 - tab + (k % 2) * (tab / 2); x < x1 + tab; x += tab) {
        const j = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 14;
        ctx.fillStyle = `rgb(${base[0] + j},${base[1] + j},${base[2] + j})`;
        ctx.fillRect(x, y, tab - 1.5, row - 1.5);
      }
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x0 - tab, y + row - 1.5, x1 - x0 + tab * 2, 1.5);
    }
    ctx.restore();
  }
  return { imageDataUrl: canvas.toDataURL("image/jpeg", 0.85) };
}

// "Preview the look" (rehearsal): a gentle polish grade with a warmer top third, so the before/after flow can be
// rehearsed offline. Muse Image makes the real edit of the hair on the meta provider.
function lookGrade(img) {
  const W = Math.min(1200, img.width);
  const H = Math.round(img.height * (W / img.width));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.filter = "saturate(1.18) contrast(1.06) brightness(1.04)";
  ctx.drawImage(img, 0, 0, W, H);
  ctx.filter = "none";
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  g.addColorStop(0, "rgba(214,160,96,0.22)");
  g.addColorStop(1, "rgba(214,160,96,0)");
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Talk to your desk: a keyword reading of the owner's words, so the voice flow rehearses offline.
export async function deskCommand({ utterance = "", snapshot = { quotes: [], reopeners: [], summary: "" } } = {}) {
  await wait(500);
  const r = readUtterance(utterance, snapshot);
  const reply =
    r.intent === "brief"
      ? snapshot.summary
      : r.intent === "none"
        ? "I can brief you on today, or approve and send a quote or a re-opener. Try \"brief me\" or \"approve the Larkspur quote\"."
        : "";
  return { ...r, reply };
}


// Layer 2 on the mock: a deterministic reviewer that reads the evidence and the drafted card and flags
// contradictions, unsupported claims and missing hazards, so the bounded retry and escalation can be rehearsed.
const OTHER_PARTS = [
  [/\bgutters?\b/, "gutter"],
  [/\bchimney\b/, "chimney"],
  [/\bskylight\b/, "skylight"],
  [/\bsolar panels?\b/, "solar panels"],
  [/\bflat roof\b/, "flat roof"],
  [/\bsiding\b/, "siding"],
];
export async function judgeAssessment({ trade = "roofing", description = "", segmentation = null, measurement = null, assessment = null, quote = null, route = null } = {}) {
  await wait(600);
  const issues = [];
  const text = String(description).toLowerCase();
  if (isMenu(trade)) {
    // Service names are the business's own words ("AC diagnostic visit"), so they are not the card's claim.
    const own = (assessment?.serviceMatch || []).reduce((t, m) => t.split(m.name || "\u0000").join(""), assessment?.summary || "");
    if (/\byou have\b|\bdiagnos/i.test(own)) issues.push({ type: "unsupported", detail: "The summary reads as a diagnosis; it must only describe what the client said." });
    if (tradeProfile(trade).hazard?.test(description) && !assessment?.emergency) issues.push({ type: "missing", detail: "The customer describes a safety hazard that the card does not flag." });
  } else {
    const label = segmentation?.regions?.[0]?.label || "";
    const part = OTHER_PARTS.find(([re]) => re.test(text) && !re.test(label) && !re.test(String(assessment?.failedPart || "").toLowerCase()));
    if (part) issues.push({ type: "contradiction", detail: `The customer describes the ${part[1]}, but the photo and the card are about ${label || "the roof covering"}.` });
    if (measurement?.areaM2 != null && !measurement.reference) issues.push({ type: "unsupported", detail: "An area in square metres is claimed with no reference object in the photo." });
    if (quote?.low != null && measurement?.areaM2 == null) issues.push({ type: "unsupported", detail: "A dollar range is given without a measurement." });
    if (/\b(spark|sparking|burning smell|exposed wir|live wire)/.test(text) && !assessment?.emergency) issues.push({ type: "missing", detail: "The customer describes an electrical hazard that the card does not flag." });
  }
  return { verdict: issues.length ? "FAIL" : "PASS", issues, usage: { model: "mock", effort: route?.effort || "medium", tokens: null } };
}

// ----- The desk agent (plan, act, observe, answer) -----
// agentStep({ trade, tenant, messages, caseState, observations, tools, mustAnswer })
//   -> { action: "tool", tool, args, thought } | { action: "answer", reply, extracted, nextAction, thought }
// Mock: picks tools from the question's wording, then answers only from what the tools returned,
// and carries on qualifying the job with the same questions as converse().
const DAMAGE = {
  roofing: /\b(leak|leaking|drip|dripping|water|shingles?|tiles?|hail damage|damage|missing|crack|hole|gutter|flashing|stain|ceiling|attic|blown|lifted)\b/i,
  medspa: /\b(skin|acne|breakouts?|spots|dull|dry|wrinkles?|lines|tone|pores|scars?|redness)\b/i,
};

// Does the text describe the job itself (not just a question)? Menu trades: any of the business's own service words.
const describesJob = (trade, tenant, text) =>
  isMenu(trade) && trade !== "medspa" ? (tenant?.services || []).some((sv) => sv.concerns.some((c) => mentions(text, c))) : DAMAGE[trade === "medspa" ? "medspa" : "roofing"].test(text);

function qualifyOnly(trade, caseState) {
  if (isMenu(trade) && tradeProfile(trade).onSite) {
    if (!caseState.description) return { reply: "So I can book the right visit, what's going on?", nextAction: "ask_description" };
    if (!caseState.address) return { reply: "What's the address of the property? Street and town is enough.", nextAction: "ask_address" };
    if (!caseState.photo) return { reply: `Add ${tradeProfile(trade).photoAsk} if you can, or skip it.`, nextAction: "ask_photo" };
    return { reply: "", nextAction: "none" };
  }
  if (isMenu(trade) && trade !== "medspa") {
    if (!caseState.description) return { reply: "What would you like booked?", nextAction: "ask_description" };
    return { reply: "", nextAction: "none" };
  }
  if (trade === "medspa") {
    if (!caseState.description) return { reply: "What would you like help with, or what have you noticed about your skin?", nextAction: "ask_description" };
    if (!caseState.consent) return { reply: "When you're ready, confirm consent below and add a photo, or tell me more.", nextAction: "ask_consent" };
    if (!caseState.photo) return { reply: "Add a photo of the area when you're ready.", nextAction: "ask_photo" };
    return { reply: "", nextAction: "none" };
  }
  if (!caseState.description) return { reply: "So I can book the right visit, what's going on with the roof?", nextAction: "ask_description" };
  if (!caseState.address) return { reply: "What's the address of the property? Street and town is enough.", nextAction: "ask_address" };
  if (!caseState.photo) return { reply: "Add a photo of the damage when you're ready and I'll outline what I see.", nextAction: "ask_photo" };
  return { reply: "", nextAction: "none" };
}

const money = (n) => `$${Number(n).toLocaleString("en-US")}`;
const list = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function answerFrom(o, tenant, trade, text = "") {
  const r = o.result || {};
  if (o.tool === "check_calendar") {
    if (!r.open?.length) return r.asked ? `I don't have an open slot on ${r.asked}. ${r.totalOpenThisWeek ? "There are other times this week." : "The calendar is full this week, so I'll ask the team to call you."}` : "The calendar is full this week, so I'll ask the team to call you.";
    const byDay = {};
    for (const s of r.open) (byDay[s.day] ||= []).push(s.time);
    return `Our next open ${tenant.words?.visit || "visit"} times are ${list(Object.entries(byDay).map(([d, ts]) => `${d} at ${list(ts)}`))}.`;
  }
  if (o.tool === "rate_card") {
    if (isMenu(trade)) return `From our menu: ${list((r.services || []).map((s) => `${s.name} ${money(s.from)} to ${money(s.to)}`))}. ${trade === "medspa" ? "A clinician confirms what suits you at the consultation." : `The ${tenant.words?.pro || "team"} confirms the final price at the ${tenant.words?.visit || "visit"}.`}`;
    if (!r.published) return "Our prices aren't published yet, so the team will confirm them at the visit.";
    const named = (r.servicePrices || []).find((s) => s.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && text.toLowerCase().includes(w)));
    if (named) return `${named.name} is ${money(named.from)}${named.to !== named.from ? ` to ${money(named.to)}` : ""} on our published price list. The final price is confirmed at the ${r.visit || "visit"}.`;
    const [mat, rate] = Object.entries(r.materialsPerM2 || {})[0] || [];
    return `Our published rates are ${mat ? `${money(rate)} per square metre for ${mat}` : "on our rate card"}${r.labourPerHour != null ? ` plus ${money(r.labourPerHour)} an hour labour` : ""}. Your draft range comes from your photo, and the final price is confirmed at the ${r.visit}.`;
  }
  if (o.tool === "business_facts") {
    const bits = [r.serviceArea ? `We cover ${r.serviceArea}.` : "", r.firstVisit ? `The first step is a ${r.firstVisit}.` : ""].filter(Boolean);
    const asked = /licen|insur|warrant|guarantee|review|rated|rating|legit|trust/i.test(text);
    if (asked && r.credentials?.length) return `${bits.join(" ")} ${r.credentials.join(". ")}.${r.credentialsSource ? ` (${r.credentialsSource})` : ""}`.trim();
    return `${bits.join(" ")} Anything else, like insurance or warranty details, isn't on my record, so I've noted it for the team to confirm.`.trim();
  }
  if (o.tool === "customer_history") {
    // Looked up because they gave an address: a new customer hears nothing about it.
    const asked = NEEDS.find(([t]) => t === "customer_history")[1].test(text);
    if (!r.addressKnown) return asked ? "I can look up earlier enquiries once I have the property address." : "";
    if (!r.earlier?.length) return asked ? "I can't find an earlier enquiry for this address, so we'll start fresh." : "";
    const e = r.earlier[0];
    const where = e.status === "visit booked" ? "a visit was booked" : e.status === "enquiry" ? "it was an enquiry" : `the quote was ${String(e.status).replace(/_/g, " ")}`;
    return `Welcome back! I can see your earlier enquiry${e.date ? ` from ${e.date}` : ""}${e.reported ? ` about "${e.reported}"` : ""}, and ${where}.`;
  }
  if (o.tool === "storm_reports") {
    if (!r.reports?.length) return "I don't have a storm report on record for your area.";
    const s = r.reports[0];
    const facts = [s.hailIn ? `${s.hailIn} in hail` : "", s.windMph ? `${s.windMph} mph gusts` : ""].filter(Boolean).join(" and ");
    return `The weather service reported ${facts || "a severe storm"} over ${s.area || "the area"}${s.when ? ` ${s.when}` : ""}.`;
  }
  return "";
}


export async function agentStep({ trade = "roofing", tenant = {}, messages = [], caseState = {}, observations = [], mustAnswer = false } = {}) {
  const text = ([...messages].reverse().find((m) => m.role === "user")?.content || "").trim();
  const asking = QUESTION.test(text);
  const needed = asking ? NEEDS.filter(([, re]) => re.test(text)).map(([t]) => t) : [];
  const seen = new Set(observations.map((o) => o.tool));
  const next = needed.find((t) => !seen.has(t));
  if (next && !mustAnswer) {
    await wait(250);
    const day = text.match(DAY_WORD)?.[1]?.toLowerCase() || null;
    return { action: "tool", tool: next, args: next === "check_calendar" ? { day } : next === "rate_card" ? { topic: trade === "medspa" ? (text.match(DAMAGE.medspa)?.[0] || null) : isMenu(trade) ? text : null } : {}, thought: THOUGHT[next] };
  }
  const answers = observations.map((o) => answerFrom(o, tenant, trade, text)).filter(Boolean);
  // A price question that names a listed service ("how much is leak detection?") is a question, not a description.
  const namesService = (tenant.services || []).some((sv) => String(sv.name).toLowerCase().split(/\s+/).some((w) => w.length > 3 && text.toLowerCase().includes(w)));
  const pureQuestion = needed.length > 0 && (!describesJob(trade, tenant, text) || (needed.includes("rate_card") && namesService));
  // An address given inside a question ("do you remember me, 14 Larkspur Ln?") is the property address.
  const typedAddress = pureQuestion && !caseState.address ? findAddress(text) : "";
  const base = pureQuestion
    ? { ...qualifyOnly(trade, { ...caseState, address: caseState.address || typedAddress }), extracted: typedAddress ? { address: typedAddress } : {} }
    : await converse({ trade, messages, caseState, tenant });
  return {
    action: "answer",
    reply: [...answers, base.reply].filter(Boolean).join(" "),
    extracted: base.extracted || {},
    nextAction: base.nextAction,
    thought: answers.length ? `Answered from ${[...seen].join(", ").replace(/_/g, " ")}, then carried on qualifying the job.` : "Nothing to look up. Carried on qualifying the job.",
  };
}
