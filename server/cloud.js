// The small cross-device layer: published desks, owner alerts (web push and email) and lead snapshots.
// Everything else stays in the browser. Storage is a private Vercel Blob store when BLOB_READ_WRITE_TOKEN is
// set, and memory for local dev and tests. No AI runs here. Synthetic demo data only.
import crypto from "node:crypto";
import { put, get, list, del } from "@vercel/blob";
import webpush from "web-push";
import { historyFor, upsertHistory } from "../src/lib/history.js";

const mem = new Map();

export function makeStore(env = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return {
      kind: "memory",
      read: async (p) => (mem.has(p) ? structuredClone(mem.get(p)) : null),
      write: async (p, v) => void mem.set(p, structuredClone(v)),
      list: async (prefix) => [...mem.keys()].filter((k) => k.startsWith(prefix)),
      remove: async (p) => void mem.delete(p),
    };
  }
  return {
    kind: "blob",
    async read(p) {
      try {
        const r = await get(p, { access: "private", useCache: false, token });
        if (!r || !r.stream) return null;
        return JSON.parse(await new Response(r.stream).text());
      } catch (e) {
        if (/not.?found|404/i.test(String(e?.message || e))) return null;
        throw e;
      }
    },
    write: (p, v) => put(p, JSON.stringify(v), { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json", token }),
    async list(prefix) {
      const out = await list({ prefix, token, limit: 200 });
      return out.blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).map((b) => b.pathname);
    },
    remove: (p) => del(p, { token }),
  };
}

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
export const cleanHost = (h) =>
  String(h || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/[^a-z0-9.-]/g, "")
    .slice(0, 120);
const fail = (status, error) => Object.assign(new Error(error), { status });
const deskPath = (host) => `desks/${host}.json`;
const alertPath = (host) => `alerts/${host}.json`;
const historyPath = (host) => `history/${host}.json`;
const leadPath = (host, caseId) => `leads/${host}/${String(caseId).replace(/[^a-z0-9-]/gi, "").slice(0, 60)}.json`;

async function ownerDesk(store, host, ownerKey) {
  const rec = await store.read(deskPath(host));
  if (!rec) throw fail(404, "This desk has not been published yet.");
  if (!ownerKey || rec.keyHash !== sha(ownerKey)) throw fail(403, "Only the owner of this desk can do that.");
  return rec;
}

// ----- Published desks: so a customer on any device reaches the same front desk -----

export async function deskGet(store, host) {
  const rec = await store.read(deskPath(cleanHost(host)));
  return rec ? { tenant: rec.tenant, updatedAt: rec.updatedAt } : null;
}

export async function deskPublish(store, { tenant, ownerKey } = {}) {
  const host = cleanHost(tenant?.setup?.host || tenant?.deskKey);
  if (!host || !tenant?.id || !tenant?.name || !tenant?.trade) throw fail(400, "A desk needs a website, a name and a trade.");
  const body = JSON.stringify(tenant);
  if (body.length > 80_000) throw fail(413, "That desk is too large to publish.");
  const rec = await store.read(deskPath(host));
  let key = ownerKey;
  if (rec && rec.keyHash !== sha(ownerKey || "")) throw fail(403, "This website's desk was published from another browser. Use that browser's owner link.");
  if (!rec) key = crypto.randomBytes(18).toString("base64url");
  await store.write(deskPath(host), { tenant: JSON.parse(body), keyHash: sha(key), createdAt: rec?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  return { ok: true, host, ownerKey: key };
}

// The owner removes a business: its published desk, alerts, address book and every lead copy go.
export async function deskRemove(store, { site, ownerKey } = {}) {
  const host = cleanHost(site);
  await ownerDesk(store, host, ownerKey);
  const leads = await store.list(`leads/${host}/`);
  for (const p of [deskPath(host), alertPath(host), historyPath(host), ...leads]) await store.remove(p).catch(() => {});
  return { ok: true, host, removed: leads.length };
}

// ----- Returning customers across devices -----

// A copy of the lead for the owner's other devices, and its address in the desk's address book.
async function saveLead(store, host, caseId, lead) {
  if (!lead || !caseId) return;
  let copy = { ...lead, id: lead.id || String(caseId), remoteAt: new Date().toISOString() };
  if (JSON.stringify(copy).length > 1_500_000) copy = { ...copy, photo: copy.photo ? { ...copy.photo, dataUrl: null } : null };
  await store.write(leadPath(host, caseId), copy);
  if (copy.customer?.address) {
    const book = (await store.read(historyPath(host))) || { entries: [] };
    await store.write(historyPath(host), { entries: upsertHistory(book.entries, copy) });
  }
}

// A customer's chat keeps its lead copy current (no alert is sent). Anyone may call it, as with notify: it
// only writes under a desk that its owner published.
export async function leadSync(store, { host, caseId, lead } = {}) {
  host = cleanHost(host);
  if (!(await store.read(deskPath(host)))) throw fail(404, "No published desk for this website.");
  await saveLead(store, host, caseId, lead);
  return { ok: true };
}

// Earlier enquiries at a property address, for the desk's chat on any device: when, what was reported and where
// it got to, never a name, phone number or email.
export async function deskHistory(store, { site, address, caseId } = {}) {
  const host = cleanHost(site);
  const book = (await store.read(historyPath(host))) || { entries: [] };
  return { earlier: historyFor(book.entries, String(address || "").slice(0, 160), caseId || null) };
}

// ----- Owner alerts -----

export function vapid(env = process.env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || "https://agently-frontdesk.vercel.app" };
}

export async function alertsStatus(store, env, { host, ownerKey }) {
  host = cleanHost(host);
  await ownerDesk(store, host, ownerKey);
  const rec = (await store.read(alertPath(host))) || {};
  return { push: (rec.subs || []).length, devices: (rec.subs || []).map((s) => s.label || "Device"), email: rec.email || null, pushReady: !!vapid(env), emailReady: !!env.RESEND_API_KEY, publicKey: vapid(env)?.publicKey || null };
}

export async function alertsSubscribe(store, env, { host, ownerKey, subscription = null, label = "", email, unsubscribe = null }) {
  host = cleanHost(host);
  await ownerDesk(store, host, ownerKey);
  const rec = (await store.read(alertPath(host))) || { subs: [], recent: [], sentAt: [] };
  rec.subs = rec.subs || [];
  if (subscription?.endpoint && subscription?.keys?.p256dh && subscription?.keys?.auth) {
    rec.subs = rec.subs.filter((s) => s.endpoint !== subscription.endpoint);
    rec.subs.push({ endpoint: String(subscription.endpoint), keys: { p256dh: String(subscription.keys.p256dh), auth: String(subscription.keys.auth) }, label: String(label || "Device").slice(0, 60), addedAt: new Date().toISOString() });
    rec.subs = rec.subs.slice(-10);
  }
  if (unsubscribe) rec.subs = rec.subs.filter((s) => s.endpoint !== unsubscribe);
  if (email !== undefined) {
    const e = String(email || "").trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw fail(400, "That email address doesn't look right.");
    rec.email = e || null;
  }
  await store.write(alertPath(host), rec);
  return alertsStatus(store, env, { host, ownerKey });
}

const escHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function sendEmail(env, { to, subject, title, body, url, business }) {
  if (!env.RESEND_API_KEY || !to) return false;
  const html = `<div style="font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:520px">
<p style="margin:0 0 4px;color:#666;font-size:13px">${escHtml(business)} · Agently Front Desk</p>
<h2 style="margin:0 0 12px;font-size:20px">${escHtml(title)}</h2>
<p style="margin:0 0 20px;white-space:pre-line">${escHtml(body)}</p>
<a href="${escHtml(url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600">Open the front desk</a>
<p style="margin:24px 0 0;color:#888;font-size:12px">You get this because lead alerts are on for ${escHtml(business)}. Nothing has been sent to the customer: quotes and messages wait for your approval.</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.ALERT_FROM || "Agently Front Desk <alerts@agentlycall.com>", to: [to], subject, html, text: `${title}\n\n${body}\n\n${url}` }),
  });
  return res.ok;
}

// A customer's browser reports a lead event. No owner key: anyone can report, so it is deduplicated per case
// and event, capped per hour, and only ever sends to the alerts the owner set up.
export async function alertsNotify(store, env, { host, caseId, kind = "new", title = "", body = "", lead = null, origin = "" } = {}) {
  host = cleanHost(host);
  const desk = await store.read(deskPath(host));
  if (!desk) throw fail(404, "No published desk for this website.");
  const rec = (await store.read(alertPath(host))) || { subs: [], recent: [], sentAt: [] };
  const tag = `${String(caseId).slice(0, 60)}:${String(kind).slice(0, 20)}`;
  rec.recent = rec.recent || [];
  rec.sentAt = (rec.sentAt || []).filter((t) => Date.now() - t < 3600_000);
  await saveLead(store, host, caseId, lead);
  if (rec.recent.includes(tag)) return { duplicate: true, push: 0, email: false };
  if (rec.sentAt.length >= 40) return { throttled: true, push: 0, email: false };
  const business = desk.tenant?.name || host;
  const url = `${origin || "https://agently-frontdesk.vercel.app"}/frontdesk?desk=${encodeURIComponent(host)}${caseId ? `&case=${encodeURIComponent(caseId)}` : ""}`;
  const t = String(title || "New lead").slice(0, 80);
  const b = String(body || "").slice(0, 240);
  let pushed = 0;
  const keys = vapid(env);
  if (keys && rec.subs?.length) {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    const payload = JSON.stringify({ title: `${t} · ${business}`, body: b, url, tag });
    const keep = [];
    for (const sub of rec.subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 3600, urgency: "high" });
        pushed++;
        keep.push(sub);
      } catch (e) {
        if (e?.statusCode !== 404 && e?.statusCode !== 410) keep.push(sub);
      }
    }
    rec.subs = keep;
  }
  const emailed = await sendEmail(env, { to: rec.email, subject: `${t} · ${business}`, title: t, body: b, url, business }).catch(() => false);
  rec.recent = [...rec.recent, tag].slice(-200);
  rec.sentAt.push(Date.now());
  await store.write(alertPath(host), rec);
  return { push: pushed, email: emailed };
}

export async function alertsTest(store, env, { host, ownerKey, origin }) {
  host = cleanHost(host);
  await ownerDesk(store, host, ownerKey);
  return alertsNotify(store, env, { host, caseId: `test-${Date.now()}`, kind: "test", title: "Test alert", body: "Lead alerts are working. New leads, photo estimates waiting for approval and bookings will show up like this.", origin });
}

export async function leadsList(store, { host, ownerKey }) {
  host = cleanHost(host);
  await ownerDesk(store, host, ownerKey);
  const paths = (await store.list(`leads/${host}/`)).slice(0, 25);
  const out = [];
  for (const p of paths) {
    const l = await store.read(p);
    if (l) out.push(l);
  }
  return { leads: out };
}

// One entry point for both the Vercel routes and the Vite dev server.
export async function handleCloud(route, method, query, body, env = process.env) {
  const store = makeStore(env);
  if (route === "desk") {
    if (method === "GET") {
      if (query.history != null) return deskHistory(store, { site: query.site, address: query.history, caseId: query.case });
      const d = await deskGet(store, query.site);
      if (!d) throw fail(404, "No desk is published for this website yet.");
      return d;
    }
    if (method === "POST") return body.action === "remove" ? deskRemove(store, body) : deskPublish(store, body);
  }
  if (route === "alerts") {
    if (method === "GET") {
      if (query.vapid) return { publicKey: vapid(env)?.publicKey || null };
      if (query.leads) return leadsList(store, { host: query.site, ownerKey: query.key });
      return alertsStatus(store, env, { host: query.site, ownerKey: query.key });
    }
    if (method === "POST") {
      const a = body.action;
      if (a === "subscribe") return alertsSubscribe(store, env, body);
      if (a === "notify") return alertsNotify(store, env, body);
      if (a === "lead") return leadSync(store, body);
      if (a === "test") return alertsTest(store, env, body);
    }
  }
  throw fail(405, "Not supported.");
}
