// The customer's photo with the segmentation outline drawn over it.
// Polygon coordinates are normalised 0-1000, so the overlay scales with the image.
export default function OutlinedPhoto({ src, segmentation, className = "", showReference = true }) {
  const regions = segmentation?.regions || [];
  const ref = segmentation?.reference;
  return (
    <div className={`relative overflow-hidden rounded-lg border border-border bg-secondary ${className}`}>
      <img src={src} alt="Photo of the damage" className="block w-full" />
      {(regions.length > 0 || ref) && (
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {regions.map((r, i) => (
            <polygon
              key={i}
              points={r.polygon.map((p) => p.join(",")).join(" ")}
              fill="hsl(var(--primary) / 0.28)"
              stroke="hsl(var(--primary))"
              strokeWidth="5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ))}
          {showReference && ref && (
            <rect
              x={ref.bbox[0]}
              y={ref.bbox[1]}
              width={ref.bbox[2] - ref.bbox[0]}
              height={ref.bbox[3] - ref.bbox[1]}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="3"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
      {regions[0] && (
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 font-spec text-[11px] uppercase text-foreground">
          {regions[0].label}
        </span>
      )}
      {showReference && ref && (
        <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2.5 py-1 font-spec text-[11px] uppercase text-foreground">
          Scale: {ref.label}
        </span>
      )}
    </div>
  );
}
