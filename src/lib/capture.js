// Guided-capture quality checks, run in the browser before a photo goes to the gateway.
// Pure pixel maths on a downscaled copy: brightness, sharpness (variance of a Laplacian) and size.

export const MIN_EDGE_PX = 480;
export const DARK_MEAN = 45; // 0-255
export const BLUR_VARIANCE = 25;

export function analyseCanvas(canvas) {
  const w = Math.min(320, canvas.width);
  const h = Math.round((canvas.height / canvas.width) * w);
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const mean = sum / (w * h);
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const lapMean = lapSum / n;
  const variance = lapSq / n - lapMean * lapMean;
  return { brightness: Math.round(mean), sharpness: Math.round(variance * 10) / 10 };
}

export function captureIssues({ width, height, brightness, sharpness }) {
  const issues = [];
  if (Math.max(width, height) < MIN_EDGE_PX) issues.push({ code: "small", message: "The photo is very small. Move closer or use the main camera." });
  if (brightness < DARK_MEAN) issues.push({ code: "dark", message: "It's too dark to see the damage. Try again in better light or turn the flash on." });
  if (sharpness < BLUR_VARIANCE) issues.push({ code: "blurry", message: "The photo looks blurry. Hold still, tap to focus, and take it again." });
  return issues;
}
