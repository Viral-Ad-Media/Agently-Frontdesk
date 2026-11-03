// Severity is always a word as well as a colour. Med spa uses review-priority words, never medical ones.
const tones = {
  Minor: "bg-emerald-600/10 text-emerald-800",
  Moderate: "bg-primary/10 text-[hsl(var(--primary-deep))]",
  Severe: "bg-destructive/10 text-destructive",
};

const spaWords = { Minor: "Routine review", Moderate: "Clinician review", Severe: "Clinician first" };

export default function Severity({ value, spa = false, className = "" }) {
  const tone = tones[value] || "bg-secondary text-muted-foreground";
  const word = spa ? spaWords[value] || "Review" : value || "Unknown";
  return (
    <span className={`fd-pill ${tone} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {word}
    </span>
  );
}
