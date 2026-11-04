import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Mail, Send, Smartphone, X } from "lucide-react";
import { alertStatus, deskKeyOf, enablePush, isIos, isStandalone, ownerKey, phoneLink, publishDesk, pushSupported, saveAlertEmail, sendTestAlert } from "@/lib/cloud";

// Lead alerts for the owner: web push on this computer or phone, and email. Alerts arrive with the desk closed.
// Nothing here ever messages a customer.
export default function AlertsPanel({ tenant, onClose }) {
  const key = tenant.cloud?.host || deskKeyOf(tenant);
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);
  const [qr, setQr] = useState(null);
  const [showPhone, setShowPhone] = useState(false);
  const published = !!(tenant.cloud && ownerKey(key));

  const refresh = async () => {
    try {
      const s = await alertStatus(key);
      setStatus(s);
      setEmail((e) => e || s.email || "");
    } catch (e) {
      setStatus({ error: e.message });
    }
  };
  useEffect(() => {
    if (published) refresh();
  }, [published, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showPhone || !published) return;
    import("qrcode").then((m) => m.toDataURL(phoneLink(key), { margin: 1, width: 360, color: { dark: "#0b0b0d", light: "#ffffff" } }).then(setQr)).catch(() => setQr(null));
  }, [showPhone, published, key]);

  const act = async (name, fn, done) => {
    setBusy(name);
    setNote(null);
    try {
      await fn();
      setNote({ ok: true, text: done });
      await refresh();
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Lead alerts" className="fd-card rise overflow-hidden lg:col-span-12" data-testid="alerts-panel">
      <header className="flex min-h-[60px] items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white" style={{ background: "linear-gradient(180deg, hsl(var(--ios-red) / 0.88), hsl(var(--ios-red)))" }} aria-hidden>
            <BellRing className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold leading-tight tracking-[-0.02em]">Lead alerts</h2>
            <p className="truncate text-[13px] text-muted-foreground">New leads, photo estimates waiting for you and bookings, even with the desk closed</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close lead alerts">
          <X className="h-4 w-4" />
        </button>
      </header>

      {!published ? (
        <div className="px-4 py-4 text-[15px]">
          <p>Alerts need this desk published, so a customer's chat on any device can reach you.</p>
          <button type="button" disabled={busy === "publish"} onClick={() => act("publish", async () => { const r = await publishDesk(tenant); if (!r?.ok) throw new Error(r?.error || "Publishing failed."); }, "Published. Now turn alerts on.")} className="fd-btn-primary fd-btn-sm mt-3">
            <Send className="h-4 w-4" /> Publish this desk
          </button>
        </div>
      ) : (
        <div className="grid gap-0 md:grid-cols-3 md:divide-x md:divide-border">
          <div className="px-4 py-4">
            <p className="flex items-center gap-2 text-[15px] font-medium"><Bell className="h-4 w-4 text-[hsl(var(--ios-red))]" /> This device</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{status?.push ? `On for ${status.push} device${status.push === 1 ? "" : "s"}: ${status.devices.join(", ")}.` : "Get a notification here for every new lead."}</p>
            {isIos() && !isStandalone() && <p className="mt-1 text-[13px] text-muted-foreground">On iPhone: tap Share, then Add to Home Screen, and turn alerts on from the Home Screen app.</p>}
            <button type="button" disabled={busy === "push" || !pushSupported() || status?.pushReady === false} onClick={() => act("push", () => enablePush(key), "Alerts are on for this device.")} className="fd-btn-primary fd-btn-sm mt-3" data-testid="alerts-push">
              <BellRing className="h-4 w-4" /> {busy === "push" ? "Turning on…" : "Turn on alerts here"}
            </button>
            {status?.pushReady === false && <p className="mt-2 text-[12px] text-muted-foreground">Push isn't configured on this server yet.</p>}
          </div>
          <form
            className="px-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              act("email", () => saveAlertEmail(key, email), email ? `Alerts will go to ${email}.` : "Email alerts are off.");
            }}
          >
            <p className="flex items-center gap-2 text-[15px] font-medium"><Mail className="h-4 w-4 text-[hsl(var(--ios-blue))]" /> Email</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{status?.email ? `Sending to ${status.email}.` : "Arrives even when every browser is closed."}</p>
            <div className="mt-3 flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Alert email address</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" className="h-9 w-full rounded-lg border border-border bg-secondary px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
              </label>
              <button type="submit" disabled={busy === "email"} className="fd-btn-outline fd-btn-sm">Save</button>
            </div>
            {status?.emailReady === false && <p className="mt-2 text-[12px] text-muted-foreground">Email isn't configured on this server yet.</p>}
          </form>
          <div className="px-4 py-4">
            <p className="flex items-center gap-2 text-[15px] font-medium"><Smartphone className="h-4 w-4 text-[hsl(var(--ios-green))]" /> Your phone</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Scan with your phone's camera, then tap "Turn on alerts". The link is private to you.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowPhone((v) => !v)} className="fd-btn-outline fd-btn-sm">{showPhone ? "Hide" : "Show"} phone link</button>
              <button type="button" disabled={busy === "test"} onClick={() => act("test", async () => { const r = await sendTestAlert(key); if (!r.push && !r.email) throw new Error("No alert went out. Turn on push or add an email first."); }, "Test alert sent.")} className="fd-btn-outline fd-btn-sm" data-testid="alerts-test">
                <Send className="h-4 w-4" /> Send a test alert
              </button>
            </div>
            {showPhone && (
              <div className="mt-3 flex items-center gap-3">
                {qr ? <img src={qr} alt="QR code that opens lead alerts on your phone" className="h-28 w-28 rounded-lg bg-white p-1" /> : <div className="h-28 w-28 rounded-lg bg-secondary" />}
                <a href={phoneLink(key)} className="min-w-0 break-all text-[12px] text-muted-foreground underline underline-offset-2">{phoneLink(key)}</a>
              </div>
            )}
          </div>
        </div>
      )}
      {(note || status?.error) && (
        <p className={`flex items-center gap-2 border-t border-border px-4 py-2.5 text-[13px] ${note?.ok ? "text-[hsl(var(--ios-green))]" : "text-[hsl(var(--ios-red))]"}`} role="status">
          {note?.ok && <Check className="h-4 w-4" />} {note?.text || status?.error}
        </p>
      )}
    </section>
  );
}
