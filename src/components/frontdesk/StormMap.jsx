import { useEffect, useRef, useState } from "react";
import { project, fitZoom, bboxOfPoints, leadPoint, pointInStorm } from "@/lib/storm";

const TILE = (z, x, y) => `https://${"abcd"[(x + y) % 4]}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;

// A small slippy-map without a map library: CARTO light tiles under an SVG of the storm path and customer pins.
// Fits the storm (with room around it) or, with no storm, every customer.
export default function StormMap({ leads, storm, height = 360 }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pins = leads.map((l) => ({ lead: l, p: leadPoint(l) })).filter((x) => x.p);
  let frame;
  if (storm) {
    const pts = storm.rings.flat();
    const [a, b, c, d] = bboxOfPoints(pts);
    const padX = (c - a) * 0.45 + 0.05;
    const padY = (d - b) * 0.45 + 0.05;
    frame = [a - padX, b - padY, c + padX, d + padY];
  } else {
    frame = pins.length ? bboxOfPoints(pins.map((x) => x.p)) : [-100, 28, -94, 33.5];
  }
  const z = fitZoom(frame, width, height, 16);
  const zi = Math.floor(z);
  const k = 2 ** (z - zi);
  const [cx0, cy0] = project([frame[0], frame[3]], z);
  const [cx1, cy1] = project([frame[2], frame[1]], z);
  const ox = (cx0 + cx1) / 2 - width / 2;
  const oy = (cy0 + cy1) / 2 - height / 2;
  const xy = (p) => {
    const [x, y] = project(p, z);
    return [x - ox, y - oy];
  };

  const size = 256 * k;
  const tiles = [];
  const n = 2 ** zi;
  for (let tx = Math.floor(ox / size); tx <= Math.floor((ox + width) / size); tx++) {
    for (let ty = Math.floor(oy / size); ty <= Math.floor((oy + height) / size); ty++) {
      if (ty < 0 || ty >= n) continue;
      tiles.push({ key: `${zi}-${tx}-${ty}`, src: TILE(zi, ((tx % n) + n) % n, ty), left: tx * size - ox, top: ty * size - oy });
    }
  }

  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-lg border border-border bg-secondary" style={{ height }}>
      {tiles.map((t) => (
        <img key={t.key} src={t.src} alt="" draggable={false} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="pointer-events-none absolute select-none" style={{ left: t.left, top: t.top, width: size, height: size }} />
      ))}
      <svg width={width} height={height} className="absolute inset-0" role="img" aria-label={storm ? `Map of the storm path and ${pins.length} customers` : `Map of ${pins.length} customers`}>
        {storm?.rings.map((ring, i) => (
          <g key={i}>
            <polygon points={ring.map((p) => xy(p).join(",")).join(" ")} fill="hsl(var(--primary) / 0.16)" stroke="hsl(var(--primary-deep))" strokeWidth="2" strokeLinejoin="round" />
            <polygon points={ring.map((p) => xy(p).join(",")).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 10" className="motion-safe:animate-[storm-march_1.6s_linear_infinite]" />
          </g>
        ))}
        {pins.map(({ lead, p }) => {
          const [x, y] = xy(p);
          if (x < -10 || y < -10 || x > width + 10 || y > height + 10) return null;
          const inside = storm && pointInStorm(p, storm);
          if (inside && lead.optOut) {
            return (
              <g key={lead.id}>
                <title>{lead.name} · opted out, never contacted</title>
                <circle cx={x} cy={y} r="5.5" fill="hsl(var(--card))" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
                <line x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
              </g>
            );
          }
          if (inside) {
            return (
              <g key={lead.id}>
                <title>{lead.name} · in the storm path</title>
                <circle cx={x} cy={y} r="12" fill="hsl(var(--primary) / 0.35)" className="origin-center motion-safe:animate-[pin-pulse_1.8s_ease-out_infinite]" style={{ transformBox: "fill-box" }} />
                <circle cx={x} cy={y} r="5.5" fill="hsl(var(--primary-deep))" stroke="white" strokeWidth="1.5" />
              </g>
            );
          }
          return (
            <g key={lead.id}>
              <title>{lead.name}</title>
              <circle cx={x} cy={y} r="4" fill="hsl(var(--foreground) / 0.55)" stroke="white" strokeWidth="1" />
            </g>
          );
        })}
      </svg>
      <p className="absolute bottom-1 right-2 rounded bg-card/80 px-1.5 text-[10px] text-muted-foreground">© OpenStreetMap contributors © CARTO</p>
    </div>
  );
}
