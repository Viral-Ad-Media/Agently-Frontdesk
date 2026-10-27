import { Link } from "react-router-dom";

// Plain wordmark with a simple mark. No borrowed imagery, no invented certifications.
export default function Logo({ light = false, className = "", to = "/", showWord = true, word = "Agently Front Desk" }) {
  return (
    <Link to={to} className={`group flex items-center gap-2.5 ${className}`} aria-label={word}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M6 10v9h12v-9" />
        </svg>
      </span>
      {showWord && (
        <span className={`font-heading text-[17px] font-semibold leading-none tracking-tight ${light ? "text-white" : "text-foreground"}`}>
          {word}
        </span>
      )}
    </Link>
  );
}
