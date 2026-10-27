import { test } from "node:test";
import assert from "node:assert/strict";
import { polygonArea, areaPercent, measure, scaleFromReference, tiltCorrect } from "../src/lib/eye.js";

const square = [
  [100, 100],
  [200, 100],
  [200, 200],
  [100, 200],
];

test("shoelace area of a 100x100 square is 10,000 normalised units²", () => {
  assert.equal(polygonArea(square), 10000);
  assert.equal(polygonArea([...square].reverse()), 10000, "winding order does not matter");
});

test("area percent is relative to the 1000x1000 frame", () => {
  assert.equal(areaPercent(square), 1);
});

test("fewer than three points has no area", () => {
  assert.equal(polygonArea([[1, 1]]), 0);
  assert.equal(polygonArea(null), 0);
});

test("no reference means no square-metre claim and a site visit flag", () => {
  const m = measure({ polygon: square, reference: null, tiltDeg: 30 });
  assert.equal(m.areaM2, null);
  assert.equal(m.basis, "no-reference");
  assert.equal(m.siteVisitNeeded, true);
  assert.equal(m.areaPercent, 1);
});

test("a reference of known width gives metres per unit from its longest side", () => {
  // 100 units wide, 0.5 m real -> 0.005 m per unit
  assert.equal(scaleFromReference({ bbox: [0, 0, 100, 20], knownWidthM: 0.5 }), 0.005);
  assert.equal(scaleFromReference({ bbox: [0, 0, 100, 20], knownWidthM: 0 }), null);
  assert.equal(scaleFromReference(null), null);
});

test("with a reference, area is in square metres and tilt-corrected", () => {
  const reference = { label: "test", bbox: [0, 0, 100, 10], knownWidthM: 1 }; // 0.01 m per unit
  const flat = measure({ polygon: square, reference, tiltDeg: 0 });
  assert.equal(flat.areaM2, 1); // 100 units = 1 m, so 1 m²
  assert.equal(flat.basis, "reference");
  assert.equal(flat.siteVisitNeeded, false);
  const tilted = measure({ polygon: square, reference, tiltDeg: 60 });
  assert.equal(tilted.areaM2, 2); // 1 / cos(60°)
});

test("tilt correction clamps to 75° and ignores bad input", () => {
  assert.equal(tiltCorrect(10, 0), 10);
  assert.equal(Math.round(tiltCorrect(10, 90) * 100) / 100, Math.round((10 / Math.cos((75 * Math.PI) / 180)) * 100) / 100);
  assert.equal(tiltCorrect(10, "nope"), 10);
});
