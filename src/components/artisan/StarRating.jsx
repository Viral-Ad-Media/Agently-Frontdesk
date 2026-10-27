
import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, size = "md", className = "" }) {
  const px = size === "lg" ? "h-8 w-8" : "h-4 w-4";
  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star
            className={`${px} transition-all duration-300 ${n <= value ? "fill-primary text-primary" : "text-border"}`}
            strokeWidth={n <= value ? 0.5 : 1.5}
          />
        );
        if (!onChange) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="transition-transform duration-300 ease-viscous hover:scale-125 active:scale-95"
          >
            {star}
          </button>
        );
      })}
      {onChange && <span className="ml-2 font-spec text-xs uppercase text-muted-foreground">{value ? `${value}/5` : "Rate"}</span>}
    </div>
  );
}