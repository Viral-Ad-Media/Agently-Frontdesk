import { useState } from "react";
import { ShieldCheck } from "lucide-react";

// Med spa photos are sensitive: explicit consent before any upload, in plain words.
export default function ConsentCard({ tenant, onConsent, onSkip }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <section className="fd-card p-5" aria-label="Photo consent">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-lg">Before you share a photo</h3>
      </div>
      <ul className="mt-3 space-y-1.5 text-[14px] text-muted-foreground">
        <li>Your photo is used only to match your concern to {tenant.name}'s own services and to prepare for your consultation.</li>
        <li>A clinician reviews it. Nothing here is a diagnosis or medical advice, and no result is promised.</li>
        <li>You can skip the photo and still book a consultation.</li>
      </ul>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
        <span>I agree to share a photo for this purpose.</span>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={!agreed} onClick={onConsent} className="fd-btn-primary">
          Continue to photo
        </button>
        <button type="button" onClick={onSkip} className="fd-btn-outline">
          Skip the photo
        </button>
      </div>
    </section>
  );
}
