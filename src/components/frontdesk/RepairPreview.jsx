import { useRef, useState } from "react";
import { ChevronsLeftRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { gateway, CAPABILITY_MODEL } from "@/gateway";
import { updateCase } from "@/lib/store";

// "See it fixed": Muse Image edits the customer's own roof photo to show it after the repair, shown as a
// before/after slider next to the draft price. Roofing only. Always labelled as an illustration.
export default function RepairPreview({ c, tenant, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!c?.photo || !c.assessment || tenant.trade !== "roofing") return null;

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await gateway.previewRepair({ photoDataUrl: c.photo.dataUrl, segmentation: c.segmentation, tenant });
      updateCase(c.id, { repairPreview: { imageDataUrl: r.imageDataUrl, provider: r.providerLabel, at: new Date().toISOString() } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (c.repairPreview) return <BeforeAfter before={c.photo.dataUrl} after={c.repairPreview.imageDataUrl} provider={c.repairPreview.provider} className={className} />;

  return (
    <div className={className}>
      {busy ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.10)] to-transparent" />
          <p className="flex items-center gap-2 text-[15px] font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary-deep))]" /> Painting your roof, repaired…
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{CAPABILITY_MODEL.previewRepair} is editing your own photo. This takes a few seconds.</p>
        </div>
      ) : (
        <button type="button" onClick={make} className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all duration-300 ease-ios hover:border-[hsl(var(--primary)/0.5)] hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.5)] active:scale-[0.99]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-deep))] text-white">
            <Wand2 className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">See your roof repaired</span>
            <span className="block text-[13px] text-muted-foreground">A picture of your own roof after the fix, made from your photo.</span>
          </span>
          <Sparkles className="h-4 w-4 shrink-0 text-[hsl(var(--primary-deep))] transition-transform duration-300 group-hover:rotate-12" />
        </button>
      )}
      {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

// #16 Before/after slider, CSS first: the "now" photo is clipped with clip-path: inset() driven by one CSS
// variable (--pos). A native range input covers the image, so drag, tap and arrow keys all work with no
// pointer maths and no React re-render; its one job is to write --pos.
export function BeforeAfter({ before, after, provider, className = "" }) {
  const ref = useRef(null);
  const setPos = (v) => ref.current?.style.setProperty("--pos", `${v}%`);
  return (
    <figure className={`rise ${className}`}>
      <div ref={ref} className="relative select-none overflow-hidden rounded-lg border border-border bg-secondary [--pos:50%]">
        <img src={after} alt="Illustration of the roof after the repair" className="block w-full" draggable={false} />
        <img src={before} alt="The roof as photographed" className="absolute inset-0 h-full w-full object-cover [clip-path:inset(0_calc(100%-var(--pos))_0_0)]" draggable={false} />
        <input
          type="range"
          min="0"
          max="100"
          defaultValue="50"
          onInput={(e) => setPos(e.currentTarget.value)}
          aria-label="Compare the roof now and repaired"
          className="peer absolute inset-0 z-10 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
        <div className="pointer-events-none absolute inset-y-0 left-[var(--pos)] peer-focus-visible:[&>div:last-child]:ring-4 peer-focus-visible:[&>div:last-child]:ring-[hsl(var(--primary)/0.6)]">
          <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]" />
          <div className="absolute top-1/2 -ml-4 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg"><ChevronsLeftRight className="h-4 w-4" /></div>
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold leading-none text-white">Now</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-[hsl(var(--primary-deep))] px-2.5 py-1 text-[11px] font-semibold leading-none text-white">Repaired</span>
      </div>
      <figcaption className="mt-2 text-[12px] text-muted-foreground">Illustration by {provider === "Mock provider" ? "the mock provider (rehearsal)" : "Muse Image"} from your own photo. The real repair and price are confirmed at the free inspection. Drag or use the arrow keys to compare.</figcaption>
    </figure>
  );
}
