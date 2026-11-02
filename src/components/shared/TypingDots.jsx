// Three dots that pulse in turn (CSS keyframes, staggered delays). Announced once as text for screen readers.
export default function TypingDots({ label = "Typing", className = "" }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-muted-foreground ${className}`}>
      <span className="typing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="sr-only">{label}…</span>
    </span>
  );
}
