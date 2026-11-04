import { useEffect, useState } from "react";
import { Check, Copy, Download, QrCode, X } from "lucide-react";

// The business's own chat link: no code needed. Customers who open it reach this desk, under the business's
// name, from anywhere the owner puts it (Google listing, Facebook button, Instagram bio, invoices, a yard sign).
export const chatLinkFor = (host) => `${window.location.origin}/chat?site=${encodeURIComponent(host)}`;

const PLACES = ["Google Business Profile", "Facebook button", "Instagram bio", "Text replies", "Invoices", "Yard signs and trucks"];

export default function ShareLink({ host, name }) {
  const url = chatLinkFor(host);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    import("qrcode")
      .then((m) => m.toDataURL(url, { margin: 1, width: 480, color: { dark: "#0b0b0d", light: "#ffffff" } }))
      .then((d) => live && setQr(d))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link is selectable */
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start" data-testid="share-link">
      {qr ? (
        <img src={qr} alt={`QR code that opens ${name || "the business"}'s chat`} className="h-32 w-32 shrink-0 rounded-xl bg-white p-1.5" />
      ) : (
        <div className="h-32 w-32 shrink-0 rounded-xl bg-secondary" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-2.5 pl-3">
          <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 select-all break-all font-mono text-[13px] underline-offset-2 hover:underline" data-testid="share-url">{url}</a>
          <button type="button" onClick={copy} className="fd-btn-outline fd-btn-sm shrink-0"><Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {qr && (
            <a href={qr} download={`${host}-chat-qr.png`} className="fd-btn-outline fd-btn-sm">
              <Download className="h-4 w-4" /> Download QR code
            </a>
          )}
          {copied && <span className="inline-flex items-center gap-1 text-[13px] text-[hsl(var(--ios-green))]"><Check className="h-4 w-4" /> Link copied</span>}
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">Put it anywhere customers find you:</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {PLACES.map((p) => (
            <li key={p} className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground">{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// The same link on the desk, for an owner who comes back later to find it.
export function SharePanel({ tenant, onClose }) {
  const host = tenant.cloud?.host || tenant.setup?.host;
  return (
    <section aria-label="Your chat link" className="fd-card rise overflow-hidden lg:col-span-12" data-testid="share-panel">
      <header className="flex min-h-[60px] items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white" style={{ background: "linear-gradient(180deg, hsl(var(--ios-green) / 0.88), hsl(var(--ios-green)))" }} aria-hidden>
            <QrCode className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold leading-tight tracking-[-0.02em]">Your chat link</h2>
            <p className="truncate text-[13px] text-muted-foreground">No code needed: anyone who opens it reaches {tenant.name}'s front desk</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close chat link">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="px-4 py-4">
        {host ? <ShareLink host={host} name={tenant.name} /> : <p className="text-[15px] text-muted-foreground">Set this business up from its website first, then its chat link shows here.</p>}
      </div>
    </section>
  );
}
