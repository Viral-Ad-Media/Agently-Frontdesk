import { useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

// One-click sample jobs, so anyone without a camera (a judge on a laptop) can run the full photo path:
// outline, assessment card and draft quote. The photos are synthetic illustrations made with Meta's Muse Image.
// Each runs through the same pipeline as a customer's own photo; nothing about the result is pre-made.
export const SAMPLES = [
  { id: "lifted-shingles", src: "/images/roof-lifted-shingles.webp", title: "Lifted shingles", description: "Shingles lifted and blew off after last night's storm." },
  { id: "chimney-flashing", src: "/images/chimney-flashing.webp", title: "Flashing gap", description: "Water is getting in around the chimney. The metal flashing has pulled away." },
  { id: "ceiling-stain", src: "/images/ceiling-stain.webp", title: "Ceiling stain", description: "A brown water stain is spreading on the bedroom ceiling under the roof." },
];

export async function sampleFile(sample) {
  const res = await fetch(sample.src);
  if (!res.ok) throw new Error("The sample photo could not be loaded.");
  const blob = await res.blob();
  return new File([blob], `sample-${sample.id}.webp`, { type: blob.type || "image/webp" });
}

export default function SamplePhotos({ onPick, busy = false, compact = false }) {
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
        {SAMPLES.map((s) => (
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
