// The Eye: pure measurement maths. No AI provider ever replaces this arithmetic.
// Every coordinate is normalised 0-1000 on both axes (gateway, canvas and tests).

export const NORM = 1000;

// Shoelace formula. Points are [x, y] pairs in normalised units.
// Returns the absolute area in normalised units squared (0 .. 1,000,000).
export function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

export function areaPercent(points) {
  return (polygonArea(points) / (NORM * NORM)) * 100;
}

export function bboxOf(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// Metres per normalised unit, from a reference object of known real width in frame.
// The reference's longest bbox side is taken as its known dimension.
export function scaleFromReference(reference) {
  if (!reference || !reference.bbox || !(reference.knownWidthM > 0)) return null;
  const [x0, y0, x1, y1] = reference.bbox;
  const longest = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (!(longest > 0)) return null;
  return reference.knownWidthM / longest;
}

// Apparent area is foreshortened by the camera tilt; divide by cos(tilt) to recover it.
export function tiltCorrect(area, tiltDeg = 0) {
  const t = Math.min(Math.max(Number(tiltDeg) || 0, 0), 75);
  return area / Math.cos((t * Math.PI) / 180);
}

// Full measurement for one outlined region.
// No reference means no square-metre claim: areaM2 stays null and a site visit is flagged.
export function measure({ polygon, reference = null, tiltDeg = 0 }) {
  const pct = areaPercent(polygon);
  const metresPerUnit = scaleFromReference(reference);
  if (metresPerUnit === null) {
    return {
      areaPercent: round(pct, 1),
      areaM2: null,
      basis: "no-reference",
      siteVisitNeeded: true,
      reference: null,
      tiltDeg: Number(tiltDeg) || 0,
    };
  }
  const apparentM2 = polygonArea(polygon) * metresPerUnit * metresPerUnit;
  const corrected = tiltCorrect(apparentM2, tiltDeg);
  return {
    areaPercent: round(pct, 1),
    areaM2: round(corrected, 2),
    basis: "reference",
    siteVisitNeeded: false,
    reference: { label: reference.label, knownWidthM: reference.knownWidthM, metresPerUnit },
    tiltDeg: Number(tiltDeg) || 0,
  };
}

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
