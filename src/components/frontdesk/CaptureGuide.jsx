import { useRef } from "react";
import { Camera } from "lucide-react";
import SamplePhotos from "@/components/frontdesk/SamplePhotos";
import { tradeProfile } from "@/config/trades";
import { samplesFor } from "@/config/media";

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

// Shots for the on-site trades that match a service (plumbing, AC and fridge repair).
const fixShots = [
  ["Wide", "the whole fixture or unit, so we can see what it is"],
  ["Close-up", "fill the frame with the leak, the ice or the fault"],
  ["Label", "the model plate or the error code, if there is one"],
  ["Light", "torch on, flash off if it glares"],
];

const hairShots = [
  ["Light", "daylight from a window, no filters"],
  ["Back", "the back and sides, if someone can help"],
  ["Close", "the ends or the area you mean"],
  ["Goal", "a photo of the style you'd like, if you have one"],
];

// Guided capture: tells the customer what to shoot and takes the photo. Retake prompts arrive in Phase 1.
export default function CaptureGuide({ onPhoto, onLiveEye, onSample = null, onSkip = null, busy, spa = false, trade = null }) {
  const fileRef = useRef(null);
  const prof = tradeProfile(trade || (spa ? "medspa" : "roofing"));
  const list = prof.id === "roofing" ? shots : prof.id === "medspa" ? spaShots : prof.personPhoto ? hairShots : fixShots;
  const title = `Add ${prof.photoAsk}`;
  const skipText = prof.engine === "measure" ? "Skip the photo and book an inspection" : "Skip the photo, match from my description";
  return (
    <section className="fd-card p-5" aria-label="Add a photo">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <h3 className="text-lg">{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
      </div>
      <ul className="mt-3 grid gap-1.5 text-[14px] sm:grid-cols-2">
        {list.map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="w-20 shrink-0 font-spec text-[11px] uppercase text-primary">{k}</span>
            <span className="text-muted-foreground">{v}</span>
          </li>
        ))}
      </ul>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" tabIndex={-1} aria-label={`Choose ${prof.photoAsk}`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPhoto(f); }} />
      <div className="mt-4 flex flex-wrap gap-2">
        {onLiveEye && (
          <button type="button" disabled={busy} onClick={onLiveEye} className="fd-btn-primary">
            <Camera className="h-4 w-4" /> Open the Live Eye
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => fileRef.current.click()} className={onLiveEye ? "fd-btn-outline" : "fd-btn-primary"}>
          Choose a photo or short video
        </button>
        {onSkip && (
          <button type="button" disabled={busy} onClick={onSkip} className="fd-btn-outline">
            {skipText}
          </button>
        )}
      </div>
      {onSample && samplesFor(prof.id).length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <SamplePhotos onPick={(s, file) => onSample(s, file)} busy={busy} trade={prof.id} />
        </div>
      )}
      <p className="mt-2 text-[13px] text-muted-foreground">The Live Eye uses your camera with a level and your phone's tilt sensor, and captures when the shot is steady. One photo is enough; a short video works too.</p>
    </section>
  );
}
