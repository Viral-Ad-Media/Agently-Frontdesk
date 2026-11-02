// Storm Radar: weather alerts from the US National Weather Service, matched against the tenant's
// customers and old enquiries. Pure functions here; the panel lives in components/frontdesk/StormRadar.jsx.
//
// Live data: https://api.weather.gov/alerts/active (public, no key, CORS-enabled GeoJSON).
// Only alerts that carry a storm polygon and a hail/wind/tornado event are kept.
// Customer locations are approximate: the city centre of the lead's address plus a stable jitter,
// because the demo addresses are synthetic. Nothing is geocoded or sent anywhere.

export const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";

// Events a roofer cares about. Order is severity for sorting.
export const STORM_EVENTS = [
  "Tornado Warning",
  "Severe Thunderstorm Warning",
  "Tornado Watch",
  "Severe Thunderstorm Watch",
  "High Wind Warning",
  "Extreme Wind Warning",
  "Special Weather Statement",
  "Severe Weather Statement",
  "Wind Advisory",
];

// City centres for the synthetic lead addresses (lat, lon).
const CITY_CENTRES = {
  austin: [30.2672, -97.7431],
  houston: [29.7604, -95.3698],
  dallas: [32.7767, -96.797],
  "san antonio": [29.4241, -98.4936],
  "fort worth": [32.7555, -97.3308],
};

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Approximate [lon, lat] for a lead: its city centre plus a stable offset of up to ~12 km.
export function leadPoint(lead) {
  const addr = String(lead?.address || "").toLowerCase();
  const city = Object.keys(CITY_CENTRES).find((c) => addr.includes(`, ${c},`) || addr.includes(` ${c}, tx`));
  if (!city) return null;
  const [lat, lon] = CITY_CENTRES[city];
  const h = hash(lead.id || addr);
  const dx = ((h & 0xffff) / 0xffff - 0.5) * 0.24;
  const dy = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * 0.2;
  return [Math.round((lon + dx) * 1e4) / 1e4, Math.round((lat + dy) * 1e4) / 1e4];
}

// Ray casting on [lon, lat] rings. Works for any simple polygon.
export function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInStorm(point, storm) {
  if (!point || !storm?.rings?.length) return false;
  return storm.rings.some((ring) => pointInRing(point, ring));
}

// Customers inside a storm: everyone with a location, split into who may be contacted and who opted out.
export function customersInStorm(leads, storm) {
  const hit = [];
  const optedOut = [];
  for (const l of leads) {
    const p = leadPoint(l);
    if (!pointInStorm(p, storm)) continue;
    (l.optOut ? optedOut : hit).push(l);
  }
  return { hit, optedOut };
}

const num = (v) => {
  const m = String(Array.isArray(v) ? v[0] : v ?? "").match(/[\d.]+/);
  return m ? Number(m[0]) : null;
};

// One NWS GeoJSON feature to the shape the panel uses, or null when it is not a storm with a polygon.
export function normalizeAlert(feature) {
  const p = feature?.properties || {};
  const g = feature?.geometry;
  if (!g || !STORM_EVENTS.includes(p.event)) return null;
  let rings = [];
  if (g.type === "Polygon") rings = [g.coordinates[0]];
  else if (g.type === "MultiPolygon") rings = g.coordinates.map((poly) => poly[0]);
  rings = rings.filter((r) => Array.isArray(r) && r.length >= 3);
  if (!rings.length) return null;
  const params = p.parameters || {};
  return {
    id: p.id || feature.id,
    source: "live",
    event: p.event,
    headline: p.headline || p.event,
    areaDesc: p.areaDesc || "",
    severity: p.severity || "Unknown",
    onset: p.onset || p.effective || p.sent || null,
    ends: p.ends || p.expires || null,
    hailIn: num(params.maxHailSize),
    windMph: num(params.maxWindGust),
    sender: p.senderName || "National Weather Service",
    rings,
  };
}

export function parseAlerts(geojson) {
  const out = (geojson?.features || []).map(normalizeAlert).filter(Boolean);
  return out.sort((a, b) => STORM_EVENTS.indexOf(a.event) - STORM_EVENTS.indexOf(b.event));
}

// Live alerts for a US state. Throws on a network failure so the panel can say so plainly.
export async function fetchLiveStorms(area = "TX", fetchImpl = fetch) {
  const res = await fetchImpl(`${NWS_ALERTS_URL}?area=${encodeURIComponent(area)}`, { headers: { accept: "application/geo+json" } });
  if (!res.ok) throw new Error(`The weather service answered ${res.status}.`);
  return parseAlerts(await res.json());
}

// A rehearsal storm for the demo: a hail line across Dallas-Fort Worth. Synthetic and labelled as such
// everywhere it appears, so the walkthrough works on a calm day.
export function rehearsalStorm(now = new Date()) {
  const onset = new Date(now.getTime() - 14 * 3600 * 1000);
  const ends = new Date(onset.getTime() + 75 * 60 * 1000);
  return {
    id: "rehearsal-dfw-hail",
    source: "rehearsal",
    event: "Severe Thunderstorm Warning",
    headline: "Rehearsal storm: severe thunderstorm with 1.75 in hail and 70 mph gusts across Dallas-Fort Worth",
    areaDesc: "Tarrant, TX; Dallas, TX (rehearsal)",
    severity: "Severe",
    onset: onset.toISOString(),
    ends: ends.toISOString(),
    hailIn: 1.75,
    windMph: 70,
    sender: "Rehearsal data (not a real alert)",
    rings: [
      [
        [-97.62, 32.98],
        [-96.58, 32.96],
        [-96.5, 32.66],
        [-97.55, 32.58],
        [-97.62, 32.98],
      ],
    ],
  };
}

// The plain-English line a message and a claim pack quote. Never adds anything the alert did not say.
export function stormFacts(storm) {
  const bits = [];
  if (storm.hailIn) bits.push(`hail up to ${storm.hailIn} in`);
  if (storm.windMph) bits.push(`gusts to ${storm.windMph} mph`);
  return bits.join(" and ");
}

export function stormWhen(storm) {
  if (!storm?.onset) return "recently";
  const d = new Date(storm.onset);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const part = d.getHours() < 12 ? "morning" : d.getHours() < 17 ? "afternoon" : d.getHours() < 21 ? "evening" : "night";
  if (d.toDateString() === today.toDateString()) return `this ${part}`;
  if (d.toDateString() === y.toDateString()) return part === "night" ? "last night" : `yesterday ${part}`;
  return `on ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
}

// The short area name for a lead ("Fort Worth"), from its address.
export function leadArea(lead) {
  const m = String(lead?.address || "").match(/,\s*([^,]+),\s*TX/i);
  return m ? m[1].trim() : "your area";
}

// Web Mercator helpers for the map (z = zoom level, tiles 256 px).
export function project([lon, lat], z) {
  const s = 256 * 2 ** z;
  const x = ((lon + 180) / 360) * s;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s;
  return [x, y];
}

// Zoom that fits a lon/lat bbox [minLon, minLat, maxLon, maxLat] into width x height pixels.
export function fitZoom(bbox, width, height, pad = 24) {
  for (let z = 12; z >= 2; z -= 0.25) {
    const [x0, y0] = project([bbox[0], bbox[3]], z);
    const [x1, y1] = project([bbox[2], bbox[1]], z);
    if (x1 - x0 <= width - pad * 2 && y1 - y0 <= height - pad * 2) return z;
  }
  return 2;
}

export function bboxOfPoints(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// The storm on record for a case: the one it came from, otherwise a storm in this browser's storm runs whose
// path covers the case address and which started in the 14 days before the enquiry.
export function stormForCase(c, runs = []) {
  if (!c) return null;
  if (c.storm) return c.storm;
  const p = leadPoint({ id: c.leadId || c.id, address: c.customer?.address });
  if (!p) return null;
  const created = new Date(c.createdAt).getTime();
  for (const r of runs) {
    if (r.tenantId !== c.tenantId) continue;
    const onset = new Date(r.storm.onset).getTime();
    if (onset > created || created - onset > 14 * 864e5) continue;
    if (pointInStorm(p, r.storm)) return r.storm;
  }
  return null;
}
