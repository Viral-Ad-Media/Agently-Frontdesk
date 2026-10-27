// One case record is the single source of truth. Chat, dashboard and calendar all read and write here.
// Persisted in localStorage for the demo; synthetic data only.
import { useSyncExternalStore } from "react";
import { seedState } from "@/lib/seed";
import { QUOTE_STATUSES } from "@/lib/quote";

const KEY = "frontdesk.v1";
let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch {
    /* fall through to a fresh seed */
  }
  return seedState();
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
  state = next;
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

export function resetDemo() {
  commit(seedState());
}

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ----- Cases -----

export function createCase({ trade = "roofing", source = "chat" } = {}) {
  return update((s) => {
    const c = {
      id: uid("case"),
      trade,
      source,
      tenantId: s.tenant.id,
      createdAt: new Date().toISOString(),
      status: "open",
      customer: { name: "", phone: "", address: "" },
      intent: null,
      urgency: null,
      description: "",
      messages: [],
      photo: null,
      segmentation: null,
      measurement: null,
      assessment: null,
      quote: null,
      bookingSlotId: null,
      provider: null,
    };
    s.cases.unshift(c);
    return c.id;
  });
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

// Moves a quote forward to `target`. Backward moves are refused; the AI never calls this.
export function moveQuote(id, target) {
  return update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c || !c.quote) return null;
    const from = QUOTE_STATUSES.indexOf(c.quote.status);
    const to = QUOTE_STATUSES.indexOf(target);
    if (to <= from) return null;
    if (target === "sent" && c.quote.status !== "approved") return null;
    c.quote.status = target;
    c.quote.history = [...(c.quote.history || []), { status: target, at: new Date().toISOString(), by: "owner" }];
    return target;
  });
}

export function editQuoteRange(id, low, high) {
  update((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c || !c.quote) return;
    if (c.quote.status === "sent") return;
    c.quote.low = Math.round(low);
    c.quote.high = Math.round(high);
    c.quote.editedByOwner = true;
  });
}

// ----- Calendar -----

export function availableSlots() {
  const now = Date.now();
  return state.slots.filter((sl) => !sl.caseId && new Date(sl.start).getTime() > now);
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

// ----- Gateway log -----

export function logGatewayCall(entry) {
  update((s) => {
    s.gatewayLog.unshift(entry);
    if (s.gatewayLog.length > 200) s.gatewayLog.length = 200;
  });
}
