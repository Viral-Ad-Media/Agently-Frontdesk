// Records the microphone and returns a mono 16-bit WAV (16 kHz) as base64, which is what
// Muse Voice Transcribe accepts. Decoding goes through the browser's AudioContext.

export async function recordWav({ maxSeconds = 20, onLevel } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let meter = null;
  if (onLevel) {
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    meter = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v - 128) ** 2;
      onLevel(Math.min(1, Math.sqrt(sum / buf.length) / 40));
    }, 100);
  }
  rec.start();
  const stopped = new Promise((resolve) => (rec.onstop = resolve));
  const stop = () => rec.state !== "inactive" && rec.stop();
  const timer = setTimeout(stop, maxSeconds * 1000);
  return {
    stop: async () => {
      clearTimeout(timer);
      stop();
      await stopped;
      if (meter) clearInterval(meter);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
      const wav = encodeWav(downmix(audio), 16000, audio.sampleRate);
      await ctx.close();
      return { base64: toBase64(wav), mimeType: "audio/wav", seconds: Math.round(audio.duration) };
    },
  };
}

function downmix(audio) {
  const n = audio.length;
  const out = new Float32Array(n);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / audio.numberOfChannels;
  }
  return out;
}

function encodeWav(samples, targetRate, sourceRate) {
  const ratio = sourceRate / targetRate;
  const len = Math.floor(samples.length / ratio);
  const pcm = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[Math.floor(i * ratio)]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, targetRate, true);
  v.setUint32(28, targetRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return buf;
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
