import { useRef } from "react";
import { Camera, Check } from "lucide-react";

// Shows the chosen frame (and any capture problems) before the assessment runs.
// The customer can retake, or use the photo anyway.
export default function PhotoCheck({ photo, onRetake, onUse }) {
  const fileRef = useRef(null);
  const issues = photo.quality?.issues || [];
  return (
    <section className="fd-card p-5" aria-label="Check your photo">
      <h3 className="text-lg">{photo.fromVideo ? "We picked this frame from your video" : issues.length ? "This photo may not be clear enough" : "Use this photo?"}</h3>
      <img src={photo.dataUrl} alt="Your photo" className="mt-3 w-full rounded-lg border border-border" />
      {issues.length > 0 && (
        <ul className="mt-3 space-y-1 text-[14px] text-[hsl(var(--primary-deep))]">
          {issues.map((i) => (
            <li key={i.code}>{i.message}</li>
          ))}
        </ul>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" capture="environment" hidden onChange={(e) => e.target.files[0] && onRetake(e.target.files[0])} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => fileRef.current.click()} className={issues.length ? "fd-btn-primary" : "fd-btn-outline"}>
          <Camera className="h-4 w-4" /> {photo.fromVideo ? "Choose another" : "Retake"}
        </button>
        <button type="button" onClick={onUse} className={issues.length ? "fd-btn-outline" : "fd-btn-primary"}>
          <Check className="h-4 w-4" /> {issues.length ? "Use it anyway" : "Use this photo"}
        </button>
      </div>
    </section>
  );
}
