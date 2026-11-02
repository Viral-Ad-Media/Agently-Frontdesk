// The eval set: synthetic jobs with the outcome a careful front desk should reach. Synthetic data only.
// Segmentation is given as a fixture (what SAM returned) so every provider is judged on the same evidence.
// Trades are the two this build ships (roofing, med spa); plumbing, carpentry and bricklaying are not built.

const POLY = [
  [372, 318],
  [604, 296],
  [648, 412],
  [612, 486],
  [455, 502],
  [386, 430],
];
const POLY2 = [
  [120, 140],
  [260, 130],
  [280, 220],
  [140, 240],
];
const REF = { label: "standard 3-tab shingle tab (305 mm)", bbox: [690, 560, 782, 586], knownWidthM: 0.305 };
const roofSeg = (extra = {}) => ({ regions: [{ label: "missing and lifted shingle tabs", bbox: [372, 296, 648, 502], polygon: POLY, areaPercent: 7.4 }], reference: REF, tiltDeg: 24, confidence: 0.74, ...extra });
const spaSeg = { regions: [{ label: "area of concern", bbox: [516, 418, 672, 560], polygon: [[540, 430], [640, 418], [672, 500], [630, 560], [548, 548], [516, 490]], areaPercent: 1.9 }], reference: null, tiltDeg: 0, confidence: 0.7 };

export const EVAL_JOBS = [
  { id: "R1", trade: "roofing", title: "Ceiling drip, clear photo with a reference", description: "Water dripping through the bedroom ceiling after the storm", address: "14 Larkspur Lane, Lyons", seg: roofSeg(), expected: "verified" },
  { id: "R2", trade: "roofing", title: "Shingles blown off, says it's not leaking", description: "Wind blew some shingles off the back slope, no leak inside yet", address: "3 Pine Ridge, Boulder", seg: roofSeg(), expected: "verified" },
  { id: "R3", trade: "roofing", title: "Hail damage with a water stain", description: "Hail last night, now a brown water stain on the hallway ceiling", address: "88 Elm Street, Longmont", seg: roofSeg(), expected: "verified" },
  { id: "E1", trade: "roofing", title: "Edge: blurry photo", description: "Roof is leaking over the kitchen", address: "5 Birch Way, Lyons", seg: roofSeg(), photoIssues: ["blurry"], expected: "retake" },
  { id: "E2", trade: "roofing", title: "Edge: no reference object in frame", description: "Water coming in near the eave where shingles are missing", address: "21 Mill Road, Boulder", seg: roofSeg({ reference: null }), expected: "verified", note: "Percent only, no dollar total; nothing to hold back." },
  { id: "E3", trade: "roofing", title: "Edge: missing address", description: "Shingles missing and water dripping in the attic", address: "", seg: roofSeg(), expected: "needs_review" },
  { id: "E4", trade: "roofing", title: "Edge: description contradicts the photo", description: "The gutter is hanging off the front of the house and water pours down the wall", address: "9 Aspen Court, Lyons", seg: roofSeg(), expected: "escalated" },
  { id: "E5", trade: "roofing", title: "Edge: price far outside the rate card", description: "Leak over the garage after high winds", address: "40 Quarry Lane, Lyons", seg: roofSeg(), tamperQuote: { material: 450 }, expected: "needs_review" },
  { id: "E6", trade: "roofing", title: "Edge: urgent leak near electrics", description: "Water is dripping onto the light fitting and it was sparking", address: "2 River Road, Boulder", seg: roofSeg(), expected: "escalated" },
  { id: "E7", trade: "roofing", title: "Edge: unsure of the material", description: "Some roof pieces slid off and there's a damp patch inside", address: "17 Canyon Drive, Lyons", seg: roofSeg(), assessOverride: { material: { name: "concrete tile", confidence: 0.42, alternatives: [] } }, expected: "needs_review" },
  { id: "E8", trade: "roofing", title: "Edge: two separate problems in one photo", description: "Leak in two places after the storm", address: "61 Ridge View, Boulder", seg: roofSeg({ regions: [roofSeg().regions[0], { label: "cracked ridge cap", bbox: [120, 130, 280, 240], polygon: POLY2, areaPercent: 2.1 }] }), expected: "escalated" },
  { id: "S1", trade: "medspa", title: "Dull, dry skin with consent", description: "My skin looks dull and dry lately", consent: true, seg: spaSeg, expected: "verified" },
  { id: "S2", trade: "medspa", title: "Breakouts on the chin with consent", description: "Breakouts on my chin that keep coming back", consent: true, seg: spaSeg, expected: "verified" },
  { id: "S3", trade: "medspa", title: "Edge: photo without recorded consent", description: "Uneven tone and sun spots on my cheeks", consent: false, seg: spaSeg, expected: "needs_review" },
];
