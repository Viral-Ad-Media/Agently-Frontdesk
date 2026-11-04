import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BellRing, Check, LayoutDashboard, Share } from "lucide-react";
import { addTenant, setActiveTenant, useStore } from "@/lib/store";
import { enablePush, fetchDesk, isIos, isStandalone, pushSupported, saveOwnerKey } from "@/lib/cloud";
import { tenantForSite } from "@/lib/returning";
import Logo from "@/components/shared/Logo";

// The owner's phone: opened from the QR code on the desk. Saves the private owner link on this phone, brings
// the published desk here, and turns on push alerts. On iPhone, push needs the desk on the Home Screen first.
export default function Alerts() {
  const [params] = useSearchParams();
  const desk = params.get("desk") || "";
  const tenants = useStore((s) => s.tenants);
  const [state, setState] = useState({ step: "loading" });

  useEffect(() => {
    const key = params.get("key");
    if (!desk || !key) return setState({ step: "error", text: "This link is missing its desk or key. Open it again from the desk's Alerts panel." });
    saveOwnerKey(desk, key);
    // Add to Home Screen then opens this same private link, not the desk's home (the Home Screen app has its own storage).
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.href = `/api/manifest?desk=${encodeURIComponent(desk)}&key=${encodeURIComponent(key)}`;
    const local = tenantForSite(tenants, desk) || Object.values(tenants).find((t) => t.cloud?.host === desk);
    if (local) {
      setActiveTenant(local.id);
      return setState({ step: "ready", name: local.name });
    }
    fetchDesk(desk).then((t) => {
      if (!t) return setState({ step: "error", text: "That desk isn't published. Publish it from the desk on your computer first." });
      addTenant(t);
      setState({ step: "ready", name: t.name });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turnOn = async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await enablePush(desk);
      setState((s) => ({ ...s, step: "on", busy: false }));
    } catch (e) {
      setState((s) => ({ ...s, busy: false, error: e.message }));
    }
  };

  const iosNeedsHome = isIos() && !isStandalone();
  return (
    <div className="min-h-[100svh] bg-background">
      <header className="border-b border-border px-4 py-3"><Logo word="Agently Front Desk" /></header>
      <main className="mx-auto max-w-[480px] px-5 py-10">
        <BellRing className="h-8 w-8 text-[hsl(var(--ios-red))]" strokeWidth={1.75} />
        <h1 className="mt-4 text-[30px] font-bold leading-tight tracking-[-0.03em]">Lead alerts on this phone</h1>
        {state.step === "loading" && <p className="mt-3 text-muted-foreground">Connecting to your desk…</p>}
        {state.step === "error" && <p className="mt-3 text-[hsl(var(--ios-red))]">{state.text}</p>}
        {(state.step === "ready" || state.step === "on") && (
          <>
            <p className="mt-3 text-[16px] text-muted-foreground">For {state.name}: a notification for every new lead, every photo estimate waiting for you and every booking, even with the app closed.</p>
            {iosNeedsHome ? (
              <ol className="fd-card mt-6 space-y-3 p-5 text-[15px]">
                <li className="flex gap-2"><span className="font-semibold">1.</span> Tap <Share className="inline h-4 w-4" /> Share at the bottom of Safari.</li>
                <li className="flex gap-2"><span className="font-semibold">2.</span> Tap "Add to Home Screen", then Add.</li>
                <li className="flex gap-2"><span className="font-semibold">3.</span> Open Front Desk from your Home Screen. It opens on this page: tap Turn on alerts there.</li>
              </ol>
            ) : state.step === "on" ? (
              <p className="mt-6 flex items-center gap-2 text-[17px] font-medium text-[hsl(var(--ios-green))]"><Check className="h-5 w-5" /> Alerts are on for this phone.</p>
            ) : (
              <button type="button" onClick={turnOn} disabled={state.busy || !pushSupported()} className="fd-btn-primary mt-6 h-12 w-full text-[16px]">
                <BellRing className="h-5 w-5" /> {state.busy ? "Turning on…" : "Turn on alerts"}
              </button>
            )}
            {state.error && <p className="mt-3 text-[14px] text-[hsl(var(--ios-red))]">{state.error}</p>}
            <Link to="/frontdesk" className="fd-btn-outline mt-3 h-11 w-full"><LayoutDashboard className="h-4 w-4" /> Open the front desk</Link>
          </>
        )}
      </main>
    </div>
  );
}
