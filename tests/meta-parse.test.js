import { test } from "node:test";
import assert from "node:assert/strict";

// parseSamLane lives in a Vite-only module (it imports prompts.md?raw), so the parser is mirrored here
// against the documented lane format from dev.meta.ai/docs/sam/reading-segmentation.
function parseSamLane(sse) {
  const deltas = [];
  for (const line of sse.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const ev = JSON.parse(line.slice(5).trim());
      if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") deltas.push(ev.delta);
    } catch { /* skip */ }
  }
  const lane = deltas.join("");
  const boxes = [];
  const re = /<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?\|>/g;
  let m;
  while ((m = re.exec(lane))) {
    const [, x1, y1, x2, y2, w, h, c] = m.map(Number);
    boxes.push({ x1, y1, x2, y2, w, h, confidence: Number.isFinite(c) ? c : null });
  }
  return boxes;
}

test("SAM lane: boxes with confidence are parsed out of the streamed deltas", () => {
  const sse = [
    'data: {"type":"response.created"}',
    'data: {"type":"response.output_text.delta","delta":"<0f>0<|box;x1=353;y1=382;x2=453;y2=427;w=537;h=561;c=0.96|><|mask;x=0;y=0;c=0.96;data=46,101,!abc|>,1<|box;x1=260;y1=382;x2=340;y2=427;w=537;h=561;c=0.71|><|mask;x=0;y=0;data=46,81,!def|>"}',
    'data: {"type":"response.completed"}',
  ].join("\n");
  const boxes = parseSamLane(sse);
  assert.equal(boxes.length, 2);
  assert.deepEqual(boxes[0], { x1: 353, y1: 382, x2: 453, y2: 427, w: 537, h: 561, confidence: 0.96 });
  assert.equal(boxes[1].confidence, 0.71);
});

test("SAM lane: no match is an empty list, not an error", () => {
  assert.deepEqual(parseSamLane('data: {"type":"response.completed"}'), []);
});
