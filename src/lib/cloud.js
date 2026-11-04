// Browser side of the small cross-device layer (server/cloud.js): publish a desk so its website's chat works
// on any device, alert the owner about leads (web push and email), and pull leads from other devices.
// Every call is best-effort. If the backend is down, the desk keeps working in this browser as before.
import { getCase, getState, updateCase, updateTenant, importRemoteLeads } from "./store";

const OWNER = "frontdesk.owner"; // { [deskKey]: ownerKey }, this browser only
const BROWSER = "frontdesk.browser";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked */
  }
}

function browserId() {
  let id = readJson(BROWSER, null);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    writeJson(BROWSER, id);
  }
  return id;
}

// A website desk is keyed by its website; a built-in demo desk by this browser, so two people rehearsing the
// same demo business never share alerts.
export const deskKeyOf = (t) => t?.setup?.host || (t?.id ? `demo-${t.id}-${browserId()}` : "");
export const ownerKey = (key) => readJson(OWNER, {})[key] || null;
export function saveOwnerKey(key, value) {
  const all = readJson(OWNER, {});
  all[key] = value;
  writeJson(OWNER, all);
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}
const post = (path, body) => api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

// Publish (or update) this desk. Marks the tenant with `cloud` so its chat reports leads to the owner.
export async function publishDesk(tenant) {
  const key = deskKeyOf(tenant);
  if (!key) return null;
  const { cloud, ...clean } = tenant;
  try {
    const res = await post("/api/desk", { tenant: { ...clean, deskKey: key }, ownerKey: ownerKey(key) });
    if (res.ownerKey) saveOwnerKey(key, res.ownerKey);
    if (!cloud) updateTenant(tenant.id, { cloud: { host: res.host, at: new Date().toISOString() } });
    return res;
  } catch (e) {
    return { ok: false, error: e.message, status: e.status };
  }
}

// A customer on another device opens a website's chat: fetch the desk its owner published.
export async function fetchDesk(host) {
  try {
    const d = await api(`/api/desk?site=${encodeURIComponent(host)}`);
    return d.tenant ? { ...d.tenant, cloud: { host: d.tenant.deskKey || host, fetched: true } } : null;
  } catch {
    return null;
  }
}

// The owner removes a business they published: the cloud copy, its alerts, address book and lead copies go.
// Returns { ok } when the cloud copy is gone (or there never was one this browser owns).
export async function removeDesk(tenant) {
  const key = tenant?.cloud?.host || tenant?.setup?.host;
  if (!key || !ownerKey(key)) return { ok: true, cloud: false, notOwner: !!tenant?.cloud?.host };
  try {
    await post("/api/desk", { action: "remove", site: key, ownerKey: ownerKey(key) });
    const all = readJson(OWNER, {});
    delete all[key];
    writeJson(OWNER, all);
    return { ok: true, cloud: true };
  } catch (e) {
    // Already gone from the cloud: nothing left to remove there.
    if (e.status === 404) return { ok: true, cloud: false };
    return { ok: false, error: e.message };
  }
}

// ----- Returning customers on any device -----

// Earlier enquiries at this address from the desk's cloud address book. Quick or nothing: the chat never waits
// more than 2.5 s for it.
export async function fetchHistory(host, address, caseId) {
  if (!host || !address) return [];
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), 2500);
  try {
    const d = await api(`/api/desk?site=${encodeURIComponent(host)}&history=${encodeURIComponent(address)}&case=${encodeURIComponent(caseId || "")}`, ctl ? { signal: ctl.signal } : undefined);
    return Array.isArray(d.earlier) ? d.earlier : [];
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Keep the cloud copy of a lead current after each reply (no alert), so the owner's other devices see the
// conversation and the customer is remembered by address on any device. Only for a published desk.
const synced = new Map();
export async function syncLead(caseId) {
  const c = getCase(caseId);
  const tenant = c && getState().tenants[c.tenantId];
  if (!c || !tenant?.cloud?.host) return null;
  const mark = `${c.updatedAt || ""}:${c.messages?.length || 0}`;
  if (synced.get(caseId) === mark) return null;
  synced.set(caseId, mark);
  try {
    return await post("/api/alerts", { action: "lead", host: tenant.cloud.host, caseId, lead: await snapshot(c) });
  } catch {
    return null;
  }
}

// ----- Lead alerts -----

const agentFor = (t) => t?.words?.agentName || "Aura";
const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
function alertText(c, tenant, kind) {
  const who = c.customer?.name || (c.customer?.address ? `Customer at ${c.customer.address}` : "A customer");
  const said = (c.description || c.messages?.find((m) => m.role === "user")?.content || "").slice(0, 160);
  if (kind === "assessed") {
    const q = c.quote;
    const range = q?.low != null ? `${money(q.low)} – ${money(q.high)}` : "no range yet";
    return { title: "Photo estimate waiting for you", body: `${who}: ${c.assessment?.failedPart || said}. Draft ${range}. Approve it before it's sent.` };
  }
  if (kind === "booked") return { title: `${tenant.words?.visit ? tenant.words.visit[0].toUpperCase() + tenant.words.visit.slice(1) : "Visit"} booked`, body: `${who} booked through ${agentFor(tenant)}.${said ? ` "${said}"` : ""}` };
  if (kind === "urgent") return { title: "Urgent lead", body: `${who}: ${said}` };
  return { title: "New lead", body: `${who} is chatting with ${agentFor(tenant)}: "${said}"` };
}

async function thumb(dataUrl, edge = 480) {
  if (!dataUrl || typeof document === "undefined") return null;
  try {
    const img = await new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = no;
      i.src = dataUrl;
    });
    const k = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * k);
    cv.height = Math.round(img.naturalHeight * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

// What the owner's desk on another device needs to show the lead: no AI traces, photos shrunk.
async function snapshot(c) {
  const { report, repairPreview, ...rest } = c;
  const snap = structuredClone(rest);
  snap.messages = (snap.messages || []).map(({ trace, ...m }) => m);
  if (snap.photo?.dataUrl) snap.photo = { ...snap.photo, dataUrl: await thumb(snap.photo.dataUrl) };
  return snap;
}

// Tell the owner about a lead event, once per case and event. Only for a desk this browser got from the
// published copy (or published itself), so a local-only rehearsal never alerts anyone.
export async function alertOwner(caseId, kind = "new") {
  const c = getCase(caseId);
  const tenant = c && getState().tenants[c.tenantId];
  if (!c || !tenant?.cloud?.host || c.alerted?.[kind]) return null;
  updateCase(caseId, (prev) => ({ alerted: { ...(prev.alerted || {}), [kind]: new Date().toISOString() } }));
  const { title, body } = alertText(getCase(caseId), tenant, kind);
  try {
    return await post("/api/alerts", { action: "notify", host: tenant.cloud.host, caseId, kind, title, body, lead: await snapshot(getCase(caseId)) });
  } catch {
    return null;
  }
}

export async function alertStatus(key) {
  return api(`/api/alerts?site=${encodeURIComponent(key)}&key=${encodeURIComponent(ownerKey(key) || "")}`);
}

export async function saveAlertEmail(key, email) {
  return post("/api/alerts", { action: "subscribe", host: key, ownerKey: ownerKey(key), email });
}

export async function sendTestAlert(key) {
  return post("/api/alerts", { action: "test", host: key, ownerKey: ownerKey(key) });
}

const b64ToBytes = (b64) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
};

export function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows computer";
  return "This device";
}

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isIos = () => typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent);
export const isStandalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

// Turn on push alerts on this device for the desk. Needs the owner key on this device.
export async function enablePush(key) {
  if (!pushSupported()) throw new Error(isIos() && !isStandalone() ? "On iPhone, tap Share, then Add to Home Screen, open the desk from there and turn alerts on." : "This browser can't receive push alerts.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked for this site. Allow them in the browser's site settings, then try again.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { publicKey } = await api("/api/alerts?vapid=1");
  if (!publicKey) throw new Error("Push alerts are not switched on for this server yet.");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  return post("/api/alerts", { action: "subscribe", host: key, ownerKey: ownerKey(key), subscription: sub.toJSON(), label: deviceLabel() });
}

// The desk on the owner's computer pulls leads that came in from customers' own devices.
export async function pullRemoteLeads(tenant) {
  const key = tenant?.cloud?.host;
  if (!key || !ownerKey(key)) return 0;
  try {
    const { leads } = await api(`/api/alerts?site=${encodeURIComponent(key)}&key=${encodeURIComponent(ownerKey(key))}&leads=1`);
    return importRemoteLeads((leads || []).map((l) => ({ ...l, tenantId: tenant.id })));
  } catch {
    return 0;
  }
}

// The link that puts this desk's alerts on the owner's phone (it carries the owner key, so keep it private).
export const phoneLink = (key) => `${window.location.origin}/alerts?desk=${encodeURIComponent(key)}&key=${encodeURIComponent(ownerKey(key) || "")}`;
