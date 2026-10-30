import { useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

// Drag the outline's points to correct weak segmentation before anything reaches the customer.
// Coordinates stay normalised 0-1000; the measurement and quote recompute live on save.
export default function OutlineEditor({ photo, segmentation, onSave, onCancel }) {
  const svgRef = useRef(null);
  const seed = segmentation.regions?.[0]?.polygon || [
    [350, 350],
    [650, 350],
    [650, 650],
    [350, 650],
  ];
  const [polygon, setPolygon] = useState(() => seed.map((p) => [...p]));
  const [drag, setDrag] = useState(null);
  const ref = segmentation.reference;

  const toNorm = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [clamp(((e.clientX - r.left) / r.width) * 1000), clamp(((e.clientY - r.top) / r.height) * 1000)];
  };
  const onPointerDown = (i) => (e) => {
    e.target.setPointerCapture(e.pointerId);
    setDrag(i);
  };
  const onPointerMove = (e) => {
    if (drag === null) return;
    const [x, y] = toNorm(e);
    setPolygon((poly) => poly.map((p, i) => (i === drag ? [x, y] : p)));
  };
  const onPointerUp = () => setDrag(null);

  return (
    <div className="space-y-3">
      <div className="relative select-none overflow-hidden rounded-lg border border-border bg-secondary">
        <img src={photo} alt="Photo of the damage" className="block w-full" draggable={false} />
        <svg
          ref={svgRef}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <polygon points={polygon.map((p) => p.join(",")).join(" ")} fill="hsl(var(--primary) / 0.28)" stroke="hsl(var(--primary))" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {ref && <rect x={ref.bbox[0]} y={ref.bbox[1]} width={ref.bbox[2] - ref.bbox[0]} height={ref.bbox[3] - ref.bbox[1]} fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
          {polygon.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="20" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="5" vectorEffect="non-scaling-stroke" className="cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown(i)} />
          ))}
        </svg>
      </div>
      <p className="text-[13px] text-muted-foreground">Drag the points onto the damage. The area, measurement and draft range recompute from the corrected outline when you save; the status does not change.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave(polygon)} className="fd-btn-primary">
          <Check className="h-4 w-4" /> Save corrected outline
        </button>
        <button type="button" onClick={() => setPolygon(seed.map((p) => [...p]))} className="fd-btn-outline">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <button type="button" onClick={onCancel} className="fd-btn-outline">
          Cancel
        </button>
      </div>
    </div>
  );
}

const clamp = (n) => Math.round(Math.min(1000, Math.max(0, n)));
