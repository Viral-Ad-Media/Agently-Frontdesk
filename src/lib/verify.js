import { policyFor } from "../config/policy.js";

// Three-layer verification (Agents 102 workshop), the deterministic parts. Pure: only the policy config is imported.
//   Layer 1: coded checks, each with its exact reason. They cannot be skipped by the model.
//   Checklist: every item the trade needs, PROVEN only by the photo and description (the evidence is the
//     reference here; there is no hidden answer key), compared with the trade's coverage bar.
//   Layer 2 (the Muse Spark judge) and Layer 3 (human sign-off) live in the gateway and the dashboard;
//   `verdict` combines all three into the job's status.

const BANNED = [
  { re: /\bfinal price\b(?![^.]*\b(confirm|on site|inspection)\b)/i, why: "says 'final price' outside a draft" },
  { re: /\b(certified|licensed|insured|guarantee[ds]?)\b/i, why: "claims a certification or guarantee" },
  { re: /\byou (have|are suffering from)\b|\bdiagnos(is|ed)\b/i, why: "reads as a diagnosis" },
];

const round2 = (n) => Math.round(n * 100) / 100;

// Checklist items for the job's trade, each PROVEN / NOT PROVEN / ESCALATED with the evidence or the gap named.
export function checklist(c, policy) {
  const a = c.assessment || {};
  const seg = c.segmentation;
  const text = String(c.description || "").toLowerCase();
  const item = (id, status, evidence) => {
    const def = policy.checklist.find((x) => x.id === id);
    return { id, label: def?.label || id, required: !!def?.required, status, evidence };
  };
  if (c.trade === "medspa") {
    return [
      text.trim() ? item("concern", "proven", `Client wrote: "${c.description.slice(0, 80)}"`) : item("concern", "not_proven", "Nothing described yet."),
      !c.photo ? item("consent", "proven", "No photo shared, so no consent needed.") : c.consent ? item("consent", "proven", "Consent recorded before the photo.") : item("consent", "escalated", "A photo arrived without recorded consent."),
      a.serviceMatch?.length ? item("service", "proven", `Matched: ${a.serviceMatch.map((s) => s.serviceId).join(", ")}`) : item("service", "not_proven", "No published service matched."),
      Array.isArray(a.clinicianFlags) ? item("flags", "proven", a.clinicianFlags.length ? `${a.clinicianFlags.length} noted for the clinician` : "None raised") : item("flags", "not_proven", "Clinician checks not recorded."),
    ];
  }
  const region = seg?.regions?.[0];
  const mat = a.material;
  return [
    region && a.failedPart ? item("damage", "proven", `Outlined: ${region.label}`) : item("damage", "not_proven", region ? "Outlined, but nothing named as failed." : "No damage outlined in the photo."),
    mat?.name && mat.confidence >= 0.6 ? item("material", "proven", `${mat.name} (${Math.round(mat.confidence * 100)}%)`) : item("material", "not_proven", mat?.name ? `Only ${Math.round((mat.confidence || 0) * 100)}% sure it's ${mat.name}; needs a closer photo.` : "Material not identified."),
    /\b(leak|drip|water|damp|wet|stain)/.test(text) ? item("leak", "proven", "Customer describes water getting in.") : /\b(no leak|not leaking|dry)\b/.test(text) ? item("leak", "proven", "Customer says it is not leaking.") : item("leak", "not_proven", "Not stated. Ask whether water is getting in."),
    c.measurement?.areaM2 != null ? item("area", "proven", `${c.measurement.areaM2} m² from the outline and ${c.measurement.reference?.label || "a reference"}`) : item("area", "not_proven", c.measurement ? `${c.measurement.areaPercent}% of the frame only; needs a reference object.` : "No outline to measure."),
    a.emergency?.isEmergency ? item("safety", "escalated", a.emergency.reason || "Safety hazard described.") : item("safety", "proven", "No hazard described by the customer."),
    c.customer?.address ? item("address", "proven", c.customer.address) : item("address", "not_proven", "No property address yet."),
  ];
}

export function coverage(items, bar) {
  const proven = items.filter((i) => i.status === "proven").length;
  const ratio = items.length ? proven / items.length : 0;
  const blocking = items.filter((i) => i.required && i.status !== "proven").map((i) => i.label);
  return { proven, total: items.length, ratio, bar, pass: ratio >= bar && !blocking.length, blocking, missing: items.filter((i) => i.status !== "proven").map((i) => i.label) };
}

// Layer 1: the coded checks. Each returns pass / fail / pending (not reached yet) and an exact reason.
export function layer1(c, { tenant, slots = [], now = Date.now() } = {}) {
  const spa = c.trade === "medspa";
  const out = [];
  const add = (id, stage, label, status, reason) => out.push({ id, stage, label, status, reason });

  // After capture
  const missing = [!c.description?.trim() && "job description", !spa && !c.customer?.address && "address", !c.trade && "trade"].filter(Boolean);
  add("details", "capture", "Job details present", missing.length ? "fail" : "pass", missing.length ? `Missing: ${missing.join(", ")}.` : spa ? "Trade and description present." : "Trade, description and address present.");
  if (!c.photo) add("photo", "capture", "Usable photo", spa && c.lastQuestion !== "ask_photo" ? "pass" : "pending", spa ? "Photo is optional for a consultation." : "No photo yet.");
  else {
    const issues = c.photo.quality?.issues || [];
    add("photo", "capture", "Usable photo", issues.length && !c.photo.acceptedAnyway ? "fail" : "pass", issues.length ? `Photo check: ${issues.map((i) => i.code).join(", ")}${c.photo.acceptedAnyway ? " (customer chose to use it anyway)" : ""}.` : "Sharp, bright enough and large enough.");
  }

  // After assessment
  if (c.photo) {
    const regions = c.segmentation?.regions?.length || 0;
    add("segmentation", "assessment", "Damage outlined", !c.segmentation ? "pending" : regions ? "pass" : "fail", !c.segmentation ? "Not outlined yet." : regions ? `${regions} region${regions > 1 ? "s" : ""} outlined by SAM.` : "Segmentation failed: escalate to a person.");
  }
  if (!spa && c.measurement) {
    const claimsArea = c.measurement.areaM2 != null;
    const hasRef = !!c.measurement.reference;
    add("measurement", "assessment", "No measurement without a reference", claimsArea && !hasRef ? "fail" : "pass", claimsArea ? (hasRef ? `Measured against ${c.measurement.reference.label}.` : "An area is claimed with no reference in the photo.") : "No area claimed: needs a reference, shown as a percent only.");
  }

  // After quoting
  const q = c.quote;
  if (q) {
    if (q.low == null) add("quote", "quote", "Quote matches the rate card", "pass", q.reason || "No dollar total; a person confirms on site.");
    else if (spa) {
      const svc = (tenant?.services || []).find((s) => q.lines?.[0]?.label === s.name);
      add("quote", "quote", "Quote matches the published price", svc && svc.priceLow === q.low && svc.priceHigh === q.high ? "pass" : "fail", svc ? (svc.priceLow === q.low && svc.priceHigh === q.high ? `${svc.name}: published $${svc.priceLow}–$${svc.priceHigh}.` : `Range differs from the published ${svc.name} price.`) : "Quoted service is not on the published list.");
    } else {
      const rc = tenant?.rateCard;
      const sum = round2((q.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0));
      const problems = [];
      if (Math.abs(sum - Number(q.total)) > 0.02) problems.push(`line items add up to $${sum}, not $${q.total}`);
      if (Math.round(q.total * 0.8) !== q.low || Math.round(q.total * 1.2) !== q.high) {
        if (!q.editedByOwner) problems.push("range is not the ±20% band around the total");
      }
      if (rc && q.rates?.material != null && !Object.values(rc.materials).includes(q.rates.material)) problems.push(`material rate $${q.rates.material}/m² is not on the rate card`);
      if (rc && q.rates?.labourPerHour != null && q.rates.labourPerHour !== rc.labourPerHour) problems.push(`labour rate $${q.rates.labourPerHour}/h is not on the rate card`);
      if (c.measurement && c.measurement.areaM2 == null && q.total != null) problems.push("a dollar total with no measurement");
      add("quote", "quote", "Quote matches the rate card", problems.length ? "fail" : "pass", problems.length ? `Quote: ${problems.join("; ")}.` : `Lines add up to $${sum}; rates from the rate card.`);
    }
  }

  // Booking
  if (c.bookingSlotId) {
    const slot = slots.find((s) => s.id === c.bookingSlotId);
    const taken = slots.filter((s) => s.id === c.bookingSlotId && s.caseId && s.caseId !== c.id).length;
    add("booking", "booking", "Slot exists, is free and in the future", !slot ? "fail" : taken ? "fail" : new Date(slot.start).getTime() <= now ? "fail" : "pass", !slot ? "The booked slot no longer exists." : taken ? "That slot is already taken by another job." : new Date(slot.start).getTime() <= now ? "The slot is in the past." : "Real slot, held for this job only.");
  }

  // Content
  const said = (c.messages || []).filter((m) => m.role === "assistant").map((m) => m.content || "").join(" \n ");
  const hits = BANNED.filter((b) => b.re.test(said));
  if (said) add("content", "capture", "No banned content", hits.length ? "fail" : "pass", hits.length ? `A reply ${hits.map((h) => h.why).join(" and ")}.` : "No diagnosis, certification or final-price claims.");
  return out;
}

// Combines the layers into the job's status. Human sign-off (Layer 3) is the only thing that makes a job done.
export function verdict({ checks, cover, judge, confidence, threshold, forceHuman = false }) {
  const reasons = [];
  for (const k of checks.filter((x) => x.status === "fail")) reasons.push(k.reason);
  if (cover && cover.ratio < cover.bar) reasons.push(`Checklist ${cover.proven}/${cover.total} proven (${Math.round(cover.ratio * 100)}%), below the ${Math.round(cover.bar * 100)}% bar. Missing: ${cover.missing.join(", ")}.`);
  else if (cover?.blocking?.length) reasons.push(`Must be proven before quoting: ${cover.blocking.join(", ")}.`);
  if (judge && judge.verdict === "FAIL") reasons.push(...judge.issues.map((i) => `Judge: ${i.detail}`));
  if (confidence != null && threshold != null && confidence < threshold) reasons.push(`Confidence ${Math.round(confidence * 100)}% is below the ${Math.round(threshold * 100)}% bar for quoting.`);
  if (forceHuman) reasons.push("The router flagged this job for a person (safety or conflicting evidence).");
  const escalated = judge?.escalated || forceHuman;
  return { status: reasons.length ? (escalated ? "escalated" : "needs_review") : "verified", reasons };
}

export const VERIFY_LABEL = { verified: "Verified", needs_review: "Needs review", escalated: "Escalated to you", pending: "Checking" };

// Everything the dashboard needs for one job: Layer 1 checks, checklist coverage, the stored judge result
// and the combined status. Recomputed from the case each time, so it can never go stale.
export function jobStatus(c, { tenant, slots = [], now = Date.now() } = {}) {
  const pol = policyFor(c.trade);
  const checks = layer1(c, { tenant, slots, now });
  const assessed = !!c.assessment;
  const items = assessed ? checklist(c, pol) : [];
  const cover = assessed ? coverage(items, pol.coverageBar) : null;
  const v = c.verification || null;
  const judge = v?.judge ? { ...v.judge, escalated: !!v.escalated } : null;
  const confidence = c.assessment?.confidence ?? null;
  if (!assessed) {
    const fails = checks.filter((k) => k.status === "fail");
    return { status: fails.length ? "needs_review" : "pending", reasons: fails.map((k) => k.reason), checks, items, cover, judge, policy: pol };
  }
  const { status, reasons } = verdict({ checks, cover, judge, confidence, threshold: c.quote?.low != null ? pol.thresholds.quote : null, forceHuman: !!v?.forceHuman });
  return { status, reasons, checks, items, cover, judge, policy: pol };
}

// Hold the customer's range back until the job verifies or a person signs it off with a reason.
export function customerMaySee(c, js) {
  return js.status === "verified" || !!c.quote?.override || ["approved", "sent"].includes(c.quote?.status);
}
