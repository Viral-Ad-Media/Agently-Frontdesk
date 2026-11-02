import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Globe, LayoutDashboard, Loader2, MessageSquare, Quote } from "lucide-react";
import { gateway } from "@/gateway";
import { addTenant } from "@/lib/store";
import { buildTenant } from "@/lib/onboard";
import Logo from "@/components/shared/Logo";
import ProviderBadge from "@/components/shared/ProviderBadge";

const STEPS = ["Reading the website", "Building the desk from what it says", "Ready for your review"];

async function readSite(url) {
  const res = await fetch("/api/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `The site could not be read (${res.status}).`);
  return data;
}

// Instant setup: paste a business website, the desk is built from what the site says, the owner reviews
// and edits every fact, then launches. Nothing goes live without the owner's tap.
export default function Setup() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState(-1);
  const [error, setError] = useState(null);
  const [site, setSite] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const run = async (e) => {
    e?.preventDefault();
    setError(null);
    setTenant(null);
    setStep(0);
    started.current = performance.now();
    clearInterval(timer.current);
    timer.current = setInterval(() => setElapsed((performance.now() - started.current) / 1000), 100);
    try {
      const s = await readSite(url);
      setSite(s);
      setStep(1);
      const draft = await gateway.setupTenant({ site: s });
      const built = buildTenant(draft, { url: s.url });
      if (!built.ok) throw new Error(built.reason);
      built.tenant.setup.provider = draft.providerLabel;
      setTenant(built.tenant);
      setStep(2);
    } catch (err) {
      setError(err.message || "Setup failed.");
      setStep(-1);
    } finally {
      clearInterval(timer.current);
      setElapsed((performance.now() - started.current) / 1000);
    }
  };

  const patch = (fn) => setTenant((t) => fn(structuredClone(t)));
  const spa = tenant?.trade === "medspa";
  const launch = () => {
    addTenant(tenant);
    navigate(`/frontdesk`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <Logo word="Agently Front Desk" />
          <div className="flex items-center gap-2">
            <ProviderBadge className="hidden sm:inline-flex" />
            <Link to="/frontdesk" className="fd-btn-outline h-9 px-3 text-[13px]"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-10 md:px-8 md:py-16">
        <h1 className="font-display-tight max-w-[18ch] text-[44px] leading-[1.02] md:text-[64px]">Your front desk, built from your website.</h1>
        <p className="mt-4 max-w-[56ch] text-[17px] text-muted-foreground">Paste the address of a roofing company or a med spa. The desk reads the site, finds the services, prices and service area it states, and writes its own greeting. You check every fact before it goes live.</p>

        <form onSubmit={run} className="mt-8 flex max-w-[680px] flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Business website</span>
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourbusiness.com" inputMode="url" autoComplete="url" className="h-12 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-[16px] outline-none focus:border-foreground" />
          </label>
          <button type="submit" disabled={!url.trim() || (step >= 0 && step < 2)} className="fd-btn-primary h-12 px-5 text-[15px]">
            {step >= 0 && step < 2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Build my front desk
          </button>
        </form>
        {error && <p className="mt-3 max-w-[680px] text-[15px] text-destructive" role="alert">{error}</p>}

        {step >= 0 && (
          <ol className="mt-8 max-w-[680px] space-y-2" aria-live="polite">
            {STEPS.map((label, i) => (
              <li key={label} className={`flex items-center gap-3 text-[15px] transition-opacity duration-200 ${i > step ? "opacity-40" : ""}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${i < step || step === 2 ? "border-transparent bg-[hsl(var(--primary-deep))] text-white" : "border-border"}`}>
                  {i < step || step === 2 ? <Check className="h-3.5 w-3.5" /> : i === step ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                </span>
                {i === 0 && site ? `Read ${site.host} (${site.pages.length} page${site.pages.length === 1 ? "" : "s"})` : label}
              </li>
            ))}
            <li className="pl-9 text-[12px] font-medium text-muted-foreground tabular-nums">{elapsed.toFixed(1)} s</li>
          </ol>
        )}

        {tenant && (
          <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-label="Review the new desk">
            <div className="fd-card p-6">
              <p className="text-[12px] font-medium text-muted-foreground">Review before launch · built in {elapsed.toFixed(1)} s · {tenant.setup.provider}</p>
              <label className="mt-4 block text-[13px] text-muted-foreground">
                Business name
                <input value={tenant.name} onChange={(e) => patch((t) => ((t.name = e.target.value), t))} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-[17px] text-foreground outline-none focus:border-foreground" />
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <p className="text-[15px]"><span className="block text-[13px] text-muted-foreground">Desk type</span>{spa ? "Med spa: published service menu, clinician approves" : "Roofing: photo, outline, measured estimate"}</p>
                <label className="text-[13px] text-muted-foreground">
                  Service area
                  <input value={tenant.serviceArea} onChange={(e) => patch((t) => ((t.serviceArea = e.target.value), t))} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-[15px] text-foreground outline-none focus:border-foreground" />
                </label>
              </div>

              <h2 className="mt-6 text-lg">Services found on the site</h2>
              {tenant.services.length === 0 && <p className="mt-2 text-[14px] text-muted-foreground">No services with prices were printed on the pages read.{spa ? " Add them after launch, or the desk routes every enquiry to a consultation." : ""}</p>}
              <ul className="mt-2 divide-y divide-border">
                {tenant.services.map((s, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-[15px]">
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    {s.priceLow != null ? (
                      <span className="flex items-center gap-1 tabular-nums">
                        $<input aria-label={`${s.name} low price`} value={s.priceLow} onChange={(e) => patch((t) => ((t.services[i].priceLow = Number(e.target.value) || 0), t))} className="h-9 w-20 rounded-lg border border-border bg-card px-2 outline-none focus:border-foreground" />
                        –<input aria-label={`${s.name} high price`} value={s.priceHigh} onChange={(e) => patch((t) => ((t.services[i].priceHigh = Number(e.target.value) || 0), t))} className="h-9 w-20 rounded-lg border border-border bg-card px-2 outline-none focus:border-foreground" />
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">price not on the site</span>
                    )}
                  </li>
                ))}
              </ul>
              {tenant.setup.unpriced.length > 0 && spa && <p className="mt-2 text-[13px] text-muted-foreground">Listed without a price, so not quoted: {tenant.setup.unpriced.join(", ")}.</p>}

              {tenant.setup.evidence.length > 0 && (
                <>
                  <h2 className="mt-6 text-lg">Where each fact came from</h2>
                  <ul className="mt-2 space-y-2">
                    {tenant.setup.evidence.slice(0, 6).map((ev, i) => (
                      <li key={i} className="flex gap-2 text-[14px]">
                        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span><span className="text-muted-foreground">{ev.field} · </span>“{ev.quote}”</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {tenant.setup.needs.length > 0 && (
                <p className="mt-6 rounded-lg bg-secondary p-3 text-[14px]">
                  <span className="font-medium">Needs you after launch:</span> {tenant.setup.needs.join(", ")}.
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" onClick={launch} className="fd-btn-primary h-11 px-5"><Check className="h-4 w-4" /> Launch this desk</button>
                <button type="button" onClick={() => setTenant(null)} className="fd-btn-outline h-11 px-4">Discard</button>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-medium text-muted-foreground">What customers will see</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-3 text-[15px]">{tenant.name}</div>
                <div className="bg-[hsl(var(--deep))] px-5 py-8 text-white">
                  <p className="text-2xl leading-tight">{tenant.words.heroTitle}</p>
                  <p className="mt-3 text-[15px] text-white/80">{tenant.words.heroText}</p>
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-3 text-[14px] text-muted-foreground">
                    <MessageSquare className="h-4 w-4" /> {tenant.words.placeholder}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[12px] font-medium text-muted-foreground">First message</p>
                  <p className="mt-1 text-[15px]">{tenant.words.greeting}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
