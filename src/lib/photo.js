import { analyseCanvas, captureIssues } from "@/lib/capture";

// Reads a photo or a short video and returns a downscaled JPEG data URL plus quality checks.
// A video is snapshotted at a clear frame near one second in; the customer sees that frame before anything continues.
export async function readPhoto(file, maxEdge = 1280) {
  const source = file.type.startsWith("video/") ? await videoFrame(file) : await imageElement(file);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(source.el, 0, 0, w, h);
  const metrics = analyseCanvas(canvas);
  const issues = captureIssues({ width: source.width, height: source.height, ...metrics });
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    width: w,
    height: h,
    name: file.name,
    fromVideo: source.fromVideo || false,
    quality: { ...metrics, issues },
  };
}

function imageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ el: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read. Try a JPEG or PNG."));
    };
    img.src = url;
  });
}

function videoFrame(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn't read that video. Try a short MP4 or a photo instead."));
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, Math.max(0, (video.duration || 2) / 2));
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      URL.revokeObjectURL(url);
      resolve({ el: canvas, width: canvas.width, height: canvas.height, fromVideo: true });
    };
    video.src = url;
  });
}
