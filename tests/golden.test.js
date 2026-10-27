// Golden tests for the Eye: segmentation outline, measurement and material against hand-checked expectations.
// Provider under test: GOLDEN_PROVIDER=mock (default). Real providers run through the same contract once configured.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mock from "../src/gateway/providers/mock.js";
import { measure, polygonArea } from "../src/lib/eye.js";

const providers = { mock };
const providerName = process.env.GOLDEN_PROVIDER || "mock";
const provider = providers[providerName];
const manifest = JSON.parse(readFileSync(new URL("./golden/manifest.json", import.meta.url), "utf-8"));

// Intersection over union of two normalised polygons, by rasterising onto a 250x250 grid. Good enough to rank outlines.
export function polygonIoU(a, b, grid = 250) {
  let inter = 0;
  let union = 0;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x = ((gx + 0.5) / grid) * 1000;
      const y = ((gy + 0.5) / grid) * 1000;
      const ia = inside(a, x, y);
      const ib = inside(b, x, y);
      if (ia && ib) inter++;
      if (ia || ib) union++;
    }
  }
  return union ? inter / union : 0;
}

function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

test(`golden set (${providerName}): ${manifest.photos.length} photos`, async (t) => {
  assert.ok(provider, `unknown provider ${providerName}`);
  const results = [];
  for (const g of manifest.photos) {
    await t.test(g.id, async () => {
      const seg = await provider.segmentDamage({ trade: "roofing", photoName: g.file.split("/").pop(), width: 1200, height: 900 });
      const region = seg.regions[0];
      assert.ok(region, "a region was returned");
      const iou = polygonIoU(region.polygon, g.expectedPolygon);
      const m = measure({ polygon: region.polygon, reference: seg.reference, tiltDeg: seg.tiltDeg });
      const expected = measure({ polygon: g.expectedPolygon, reference: g.reference, tiltDeg: g.tiltDeg });
      const a = await provider.assess({ trade: "roofing", description: `${g.damage} on the roof`, segmentation: seg, measurement: m });
      const areaOk = expected.areaM2 === null ? m.areaM2 === null : m.areaM2 !== null && Math.abs(m.areaM2 - expected.areaM2) / expected.areaM2 <= 0.2;
      const materialOk = a.material.name === g.material;
      results.push({ id: g.id, iou: Math.round(iou * 100) / 100, areaOk, materialOk, areaM2: m.areaM2, expectedAreaM2: expected.areaM2 });
      if (g.reference) assert.ok(areaOk, `area ${m.areaM2} m² within 20% of ${expected.areaM2} m²`);
      else assert.equal(m.areaM2, null, "no reference → no square metres");
      assert.ok(polygonArea(region.polygon) > 0);
    });
  }
  const n = results.length;
  const materialRight = results.filter((r) => r.materialOk).length;
  const areaRight = results.filter((r) => r.areaOk).length;
  const meanIoU = results.reduce((s, r) => s + r.iou, 0) / n;
  console.log(`golden (${providerName}): material right ${materialRight}/${n}, area within 20% ${areaRight}/${n}, mean outline IoU ${meanIoU.toFixed(2)}`);
  console.table(results);
  assert.ok(materialRight / n >= 0.5, "material right on most photos");
});
