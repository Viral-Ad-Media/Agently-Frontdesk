// One case record is the single source of truth. Chat, dashboard, calendar and reactivation all read and write here.
// Persisted in localStorage for the demo; synthetic data only.
import { useSyncExternalStore } from "react";
import { seedState, seedSlots } from "@/lib/seed";
import { QUOTE_STATUSES, draftQuote } from "@/lib/quote";
import { measure, bboxOf, areaPercent } from "@/lib/eye";

const KEY = "frontdesk.v3";
// Older keys from earlier builds. A visitor who tested an earlier build starts clean instead of seeing that test data.
const OLD_KEYS = ["frontdesk.v2", "frontdesk.v1", "frontdesk"];
const listeners = new Set();
let state = normalize(load());

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 3) return parsed;
    }
  } catch {
    /* fall through to a fresh seed */
  }
  try {
    OLD_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage blocked: nothing to clear */
  }
  return seedState();
}

// Derived fields every screen reads: the active tenant and its rate card.
function normalize(s) {
  s.tenant = s.tenants[s.activeTenantId] || s.tenants[Object.keys(s.tenants)[0]];
  s.rateCard = s.tenant.rateCard;
  if (!Array.isArray(s.stormRuns)) s.stormRuns = [];
  return s;
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Store persist failed (storage full?)", e);
  }
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit(next) {
  state = normalize(next);
  persist();
  listeners.forEach((fn) => fn());
}

export function update(mutator) {
  const draft = structuredClone(state);
  const result = mutator(draft);
  commit(draft);
  return result;
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

// Reset: every lead, booking, calendar event, draft, re-opener, storm run, added business and counter goes back
// to the seed, for every business at once. The saved copy is removed first, so a reload cannot bring old data back.
export function resetDemo() {
  try {
    [KEY, ...OLD_KEYS].forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage blocked: the in-memory reset below still applies */
  }
  commit(seedState());
}

export function setActiveTenant(id) {
  if (!state.tenants[id]) return;
  update((s) => {
    s.activeTenantId = id;
  });
}

// Instant setup: a tenant built from a business website joins the spine and becomes the active desk.
// Every new tenant gets its own calendar slots, generated the same way as the demo tenants'.
export function addTenant(tenant) {
  update((s) => {
    s.tenants[tenant.id] = tenant;
    s.activeTenantId = tenant.id;
    const mine = seedSlots(new Date(), { [tenant.id]: tenant });
    s.slots.push(...mine);
  });
}

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ----- Cases -----

export function createCase({ tenantId, source = "chat" } = {}) {
  return update((s) => {
    const tenant = s.tenants[tenantId] || s.tenant;
    const c = {
      id: uid("case"),
      trade: tenant.trade,
      source,
      tenantId: tenant.id,
      createdAt: new Date().toISOString(),
      status: "open",
      customer: { name: "", phone: "", address: "" },
      intent: null,
      urgency: null,
      description: "",
      consent: null,
      messages: [],
      photo: null,
      segmentation: null,
      measurement: null,
      assessment: null,
      quote: null,
      bookingSlotId: null,
      report: null,
      provider: null,
    };
    s.cases.unshift(c);
    return c.id;
  });
}

// A call lands in the same case record as a chat: transcript as the first message, source "call".
export function createCaseFromCall({ tenantId, transcript, extracted = {}, reply = "", provider = null }) {
  const id = createCase({ tenantId, source: "call" });
  update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c) return;
    c.description = extracted.description || transcript;
    c.urgency = extracted.urgency || null;
    c.intent = extracted.intent || null;
    c.customer.address = extracted.address || "";
    c.lastQuestion = extracted.address ? "ask_photo" : "ask_address";
    c.provider = provider;
    c.messages.push({ at: new Date().toISOString(), role: "user", content: transcript, channel: "call" });
    if (reply) c.messages.push({ at: new Date().toISOString(), role: "assistant", content: reply });
  });
  return id;
}

export function getCase(id) {
  return state.cases.find((c) => c.id === id) || null;
}

export function updateCase(id, patch) {
  update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, typeof patch === "function" ? patch(c) : patch);
    c.updatedAt = new Date().toISOString();
  });
}

export function appendMessage(id, message) {
  update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (c) c.messages.push({ at: new Date().toISOString(), ...message });
  });
}

// ----- Quote status: one-way, human-tapped only -----

function forward(obj, target, by, note = null) {
  const from = QUOTE_STATUSES.indexOf(obj.status);
  const to = QUOTE_STATUSES.indexOf(target);
  if (to <= from) return null;
  if (target === "sent" && obj.status !== "approved") return null;
  obj.status = target;
  obj.history = [...(obj.history || []), { status: target, at: new Date().toISOString(), by, ...(note ? { note } : {}) }];
  return target;
}

// Moves a quote forward to `target`. Backward moves are refused; the AI never calls this.
// `override` is the owner's reason for approving a job that has not verified (Layer 3 sign-off with a reason).
export function moveQuote(id, target, { override = null } = {}) {
  return update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c || !c.quote) return null;
    const r = forward(c.quote, target, "owner", override ? `Approved over failed checks: ${override}` : null);
    if (r && override) c.quote.override = { reason: override, at: new Date().toISOString(), by: "owner" };
    return r;
  });
}

// Owner rejects the draft with a reason. The customer is not told a range; the job stays open for a re-draft.
export function rejectQuote(id, reason) {
  return update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c?.quote || c.quote.status === "sent" || !String(reason || "").trim()) return null;
    c.quote.status = "rejected";
    c.quote.history = [...(c.quote.history || []), { status: "rejected", at: new Date().toISOString(), by: "owner", note: String(reason).trim() }];
    return "rejected";
  });
}

export function editQuoteRange(id, low, high) {
  update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c || !c.quote) return;
    if (c.quote.status === "sent") return;
    c.quote.history = [...(c.quote.history || []), { status: c.quote.status, at: new Date().toISOString(), by: "owner", note: `Range edited from ${c.quote.low == null ? "none" : `$${c.quote.low}–$${c.quote.high}`} to $${Math.round(low)}–$${Math.round(high)}` }];
    c.quote.low = Math.round(low);
    c.quote.high = Math.round(high);
    c.quote.total = Math.round((low + high) / 2);
    c.quote.reason = null;
    if (!c.quote.lines?.length) c.quote.lines = [{ label: "Range entered by the front desk", detail: "manual", amount: null }];
    c.quote.editedByOwner = true;
  });
}

// Owner corrects a weak outline by dragging points. Measurement and quote recompute from the maths;
// the status and its history stay as they are. A sent quote is never changed.
export function correctOutline(id, polygon) {
  return update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c?.segmentation || !c.assessment) return null;
    if (c.quote?.status === "sent") return null;
    if (!c.segmentation.regions?.length) c.segmentation.regions = [{ label: "damage (drawn by the front desk)", bbox: [0, 0, 0, 0], polygon: [], areaPercent: 0 }];
    const region = c.segmentation.regions[0];
    region.polygon = polygon.map(([x, y]) => [x, y]);
    region.bbox = bboxOf(region.polygon);
    region.areaPercent = Math.round(areaPercent(region.polygon) * 10) / 10;
    c.segmentation.correctedByOwner = true;
    if (c.trade !== "roofing") return c.segmentation;
    const t = s.tenants[c.tenantId];
    c.measurement = measure({ polygon: region.polygon, reference: c.segmentation.reference, tiltDeg: c.segmentation.tiltDeg });
    const fresh = draftQuote({ material: c.assessment.material.name, measurement: c.measurement, rateCard: t.rateCard });
    c.quote = { ...fresh, status: c.quote?.status || "draft", history: c.quote?.history || [], editedByOwner: false };
    return c.measurement;
  });
}

// ----- Calendar -----

export function availableSlots(tenantId = state.activeTenantId) {
  const now = Date.now();
  return state.slots.filter((sl) => sl.tenantId === tenantId && !sl.caseId && new Date(sl.start).getTime() > now);
}

// Books a slot for a case. Refuses a slot that is already taken (no double-booking).
export function bookSlot(caseId, slotId) {
  return update((s) => {
    const slot = s.slots.find((x) => x.id === slotId);
    const c = s.cases.find((x) => x.id === caseId);
    if (!slot || !c) return { ok: false, reason: "Slot or case not found." };
    if (slot.caseId && slot.caseId !== caseId) return { ok: false, reason: "That slot was just taken. Pick another." };
    if (c.bookingSlotId && c.bookingSlotId !== slotId) {
      const prev = s.slots.find((x) => x.id === c.bookingSlotId);
      if (prev) prev.caseId = null;
    }
    slot.caseId = caseId;
    c.bookingSlotId = slotId;
    c.status = "booked";
    return { ok: true, slot };
  });
}

export function cancelBooking(caseId) {
  update((s) => {
    const c = s.cases.find((x) => x.id === caseId);
    if (!c || !c.bookingSlotId) return;
    const slot = s.slots.find((x) => x.id === c.bookingSlotId);
    if (slot) slot.caseId = null;
    c.bookingSlotId = null;
    c.status = "open";
  });
}

// ----- Dead-lead reactivation -----

// Stores an AI-drafted re-opener on a lead. Status starts at draft; only owner taps move it.
export function setLeadMessage(leadId, { message, generic, provider }) {
  update((s) => {
    const l = s.leads.find((x) => x.id === leadId);
    if (!l || l.optOut) return;
    l.message = { text: message, generic, provider, status: "draft", history: [{ status: "draft", at: new Date().toISOString(), by: "ai" }] };
    l.reactivation = { ...l.reactivation, status: "drafted" };
  });
}

export function editLeadMessage(leadId, text) {
  update((s) => {
    const l = s.leads.find((x) => x.id === leadId);
    if (!l?.message || l.message.status === "sent") return;
    l.message.text = text;
    l.message.editedByOwner = true;
  });
}

export function moveLeadMessage(leadId, target) {
  return update((s) => {
    const l = s.leads.find((x) => x.id === leadId);
    if (!l?.message || l.optOut) return null;
    const r = forward(l.message, target, "owner");
    if (r === "sent") {
      l.reactivation = { status: "contacted", attempts: (l.reactivation?.attempts || 0) + 1 };
      l.lastContactedAt = new Date().toISOString().slice(0, 10);
    }
    return r;
  });
}

// A reply from the lead lands in the same thread. A reply that books takes the next open slot
// and increments the recovered-jobs counter by exactly one, however many times it is called.
export function leadReply(leadId, text, { books = false } = {}) {
  return update((s) => {
    const l = s.leads.find((x) => x.id === leadId);
    if (!l?.message || l.message.status !== "sent") return { ok: false, reason: "Nothing was sent to this lead yet." };
    l.message.reply = { text, at: new Date().toISOString() };
    l.reactivation = { ...l.reactivation, status: "replied" };
    if (!books || l.recovered) return { ok: true, booked: false };
    const slot = s.slots.find((sl) => sl.tenantId === l.tenantId && !sl.caseId && new Date(sl.start).getTime() > Date.now());
    if (!slot) return { ok: true, booked: false, reason: "No open slots to book into." };
    const tenant = s.tenants[l.tenantId];
    const c = {
      id: uid("case"),
      trade: tenant.trade,
      source: "reactivation",
      tenantId: tenant.id,
      leadId: l.id,
      createdAt: new Date().toISOString(),
      status: "booked",
      customer: { name: l.name, phone: l.phone, address: l.address },
      intent: "repair",
      urgency: "routine",
      description: `${l.serviceType}${l.damageType ? ` - ${l.damageType.toLowerCase()}` : ""} (reactivated lead)`,
      consent: null,
      messages: [
        { at: l.message.history[0].at, role: "assistant", content: l.message.text },
        { at: new Date().toISOString(), role: "user", content: text },
      ],
      photo: null,
      segmentation: null,
      measurement: null,
      assessment: null,
      quote: null,
      bookingSlotId: slot.id,
      report: null,
      provider: l.message.provider,
    };
    slot.caseId = c.id;
    s.cases.unshift(c);
    l.recovered = true;
    l.recoveredCaseId = c.id;
    l.reactivation = { ...l.reactivation, status: "booked" };
    return { ok: true, booked: true, slot, caseId: c.id };
  });
}

// ----- Storm check-ins -----
// One run per storm: the storm itself, who was inside it, who was excluded, and one drafted check-in per
// customer. Same one-way status as quotes; only owner taps move a message to approved or sent.

export function startStormRun({ tenantId, storm, leadIds, excludedIds }) {
  return update((s) => {
    const existing = s.stormRuns.find((r) => r.storm.id === storm.id && r.tenantId === tenantId);
    if (existing) return existing.id;
    const run = { id: uid("storm"), tenantId, storm, leadIds, excludedIds, startedAt: new Date().toISOString(), drafts: {} };
    s.stormRuns.unshift(run);
    return run.id;
  });
}

export function setStormDraft(runId, leadId, { message, provider }) {
  update((s) => {
    const run = s.stormRuns.find((r) => r.id === runId);
    const lead = s.leads.find((l) => l.id === leadId);
    if (!run || !lead || lead.optOut) return;
    run.drafts[leadId] = { text: message, provider, status: "draft", history: [{ status: "draft", at: new Date().toISOString(), by: "ai" }] };
  });
}

export function editStormDraft(runId, leadId, text) {
  update((s) => {
    const d = s.stormRuns.find((r) => r.id === runId)?.drafts[leadId];
    if (!d || d.status === "sent") return;
    d.text = text;
    d.editedByOwner = true;
  });
}

export function moveStormDraft(runId, leadId, target) {
  return update((s) => {
    const d = s.stormRuns.find((r) => r.id === runId)?.drafts[leadId];
    const lead = s.leads.find((l) => l.id === leadId);
    if (!d || !lead || lead.optOut) return null;
    return forward(d, target, "owner");
  });
}

// Approves every remaining draft in one owner tap. Sending stays one tap per message or one "send all approved".
export function moveAllStormDrafts(runId, from, target) {
  return update((s) => {
    const run = s.stormRuns.find((r) => r.id === runId);
    if (!run) return 0;
    let n = 0;
    for (const [leadId, d] of Object.entries(run.drafts)) {
      const lead = s.leads.find((l) => l.id === leadId);
      if (d.status === from && lead && !lead.optOut && forward(d, target, "owner")) n++;
    }
    return n;
  });
}

// A reply to a storm check-in. One that books takes the next open slot, becomes a case that carries the
// storm (for the claim pack), and counts once.
export function stormReply(runId, leadId, text, { books = false } = {}) {
  return update((s) => {
    const run = s.stormRuns.find((r) => r.id === runId);
    const d = run?.drafts[leadId];
    const l = s.leads.find((x) => x.id === leadId);
    if (!d || !l || d.status !== "sent") return { ok: false, reason: "Nothing was sent to this customer yet." };
    d.reply = { text, at: new Date().toISOString() };
    if (!books || d.caseId) return { ok: true, booked: false };
    const slot = s.slots.find((sl) => sl.tenantId === run.tenantId && !sl.caseId && new Date(sl.start).getTime() > Date.now());
    if (!slot) return { ok: true, booked: false, reason: "No open slots to book into." };
    const tenant = s.tenants[run.tenantId];
    const c = {
      id: uid("case"),
      trade: tenant.trade,
      source: "storm",
      tenantId: tenant.id,
      leadId: l.id,
      storm: run.storm,
      createdAt: new Date().toISOString(),
      status: "booked",
      customer: { name: l.name, phone: l.phone, address: l.address },
      intent: "repair",
      urgency: "routine",
      description: `Storm check-in after the ${run.storm.event.toLowerCase()}`,
      consent: null,
      messages: [
        { at: d.history[0].at, role: "assistant", content: d.text },
        { at: new Date().toISOString(), role: "user", content: text },
      ],
      photo: null,
      segmentation: null,
      measurement: null,
      assessment: null,
      quote: null,
      bookingSlotId: slot.id,
      report: null,
      provider: d.provider,
    };
    slot.caseId = c.id;
    s.cases.unshift(c);
    d.caseId = c.id;
    return { ok: true, booked: true, slot, caseId: c.id };
  });
}

// ----- Gateway log -----

export function logGatewayCall(entry) {
  update((s) => {
    s.gatewayLog.unshift(entry);
    if (s.gatewayLog.length > 200) s.gatewayLog.length = 200;
  });
}
