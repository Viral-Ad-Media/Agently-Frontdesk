import { useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

// One-click sample jobs, so anyone without a camera (a judge on a laptop) can run the full photo path:
// outline, assessment card and draft quote. The photos are synthetic illustrations made with Meta's Muse Image.
// Each runs through the same pipeline as a customer's own photo; nothing about the result is pre-made.
import { samplesFor } from "@/config/media";

export const SAMPLES = samplesFor("roofing");

export async function sampleFile(sample) {
  const res = await fetch(sample.src, { mode: "cors" });
  if (!res.ok) throw new Error("The sample photo could not be loaded.");
  const blob = await res.blob();
  return new File([blob], `sample-${sample.id}.webp`, { type: blob.type || "image/webp" });
}

export default function SamplePhotos({ onPick, busy = false, compact = false, trade = "roofing" }) {
  const list = samplesFor(trade);
  const [loading, setLoading] = useState(null);
  const pick = async (s) => {
    if (busy || loading) return;
    setLoading(s.id);
    try {
      await onPick(s, await sampleFile(s));
    } finally {
      setLoading(null);
    }
  };
  return (
    <div aria-label="Sample photos">
      <p className="text-[13px] text-muted-foreground">{compact ? "No camera? Try a sample job:" : "No photo to hand? Use a sample:"}</p>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {list.map((s) => (
          <li key={s.id}>
            <button type="button" disabled={busy || !!loading} onClick={() => pick(s)} className="group block w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-foreground/40 disabled:opacity-60" aria-label={`Use the sample photo: ${s.title}`}>
              <span className="relative block aspect-[4/3] overflow-hidden">
                <img src={s.src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                {loading === s.id && (
                  <span className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></span>
                )}
              </span>
              <span className="block px-2 py-1.5">
                <span className="flex items-center gap-1 text-[13px] font-medium"><ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />{s.title}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">Sample photo — synthetic demo image</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
