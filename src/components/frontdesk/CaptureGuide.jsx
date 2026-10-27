import { useRef } from "react";
import { Camera } from "lucide-react";

const shots = [
  ["Wide", "the whole roof section from the ground"],
  ["Straight-on", "square to the damage, not from below"],
  ["45°", "one angled shot shows depth"],
  ["Close-up", "fill the frame with the damage"],
  ["Reference", "a shingle tab, brick or tape measure in frame gives scale"],
];

const spaShots = [
  ["Light", "daylight from a window, no flash, no filters"],
  ["Straight-on", "face the camera, relaxed expression"],
  ["Close", "fill the frame with the area you mean"],
  ["Clean", "no makeup on the area if you can"],
];

// Guided capture: tells the customer what to shoot and takes the photo. Retake prompts arrive in Phase 1.
export default function CaptureGuide({ onPhoto, busy, spa = false }) {
  const fileRef = useRef(null);
  return (
    <section className="fd-card p-5" aria-label="Add a photo">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <h3 className="text-lg">{spa ? "Add a photo of the area" : "Add a photo of the damage"}</h3>
      </div>
      <ul className="mt-3 grid gap-1.5 text-[14px] sm:grid-cols-2">
        {(spa ? spaShots : shots).map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="w-20 shrink-0 font-spec text-[11px] uppercase text-primary">{k}</span>
            <span className="text-muted-foreground">{v}</span>
          </li>
        ))}
      </ul>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" capture="environment" hidden onChange={(e) => e.target.files[0] && onPhoto(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => fileRef.current.click()} className="fd-btn-primary mt-4 w-full sm:w-auto">
        <Camera className="h-4 w-4" /> Take a photo or short video
      </button>
      <p className="mt-2 text-[13px] text-muted-foreground">One photo is enough to start. A short video works too: we pick a clear frame and show it to you first.</p>
    </section>
  );
}
