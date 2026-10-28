import { useEffect, useRef, useState } from "react";
import { Camera, X, Ruler } from "lucide-react";
import { analyseCanvas, captureIssues } from "@/lib/capture";

// The Live Eye: the phone's camera with a live level, the gyroscope's tilt, a sharpness and light meter,
// and a reference-in-frame check. The measured tilt travels with the photo into the Eye maths.
// Falls back to the file picker where there is no camera or no sensor permission.
export default function LiveEye({ onCapture, onClose, spa = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [tilt, setTilt] = useState(null); // degrees from vertical, from the device orientation sensor
  const [roll, setRoll] = useState(0); // left-right level
  const [sensors, setSensors] = useState("unknown"); // unknown | granted | denied
  const [metrics, setMetrics] = useState(null);
  const [referenceInFrame, setReferenceInFrame] = useState(false);
  const [steady, setSteady] = useState(0);
  const lastTilt = useRef(null);

  // Camera
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setError(e.name === "NotAllowedError" ? "Camera permission was refused. You can still choose a photo from your gallery." : "No camera available here. Choose a photo instead.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Orientation sensor (iOS asks for permission on a user gesture; the Start button below does that)
  const enableSensors = async () => {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        setSensors(r === "granted" ? "granted" : "denied");
      } else {
        setSensors("granted");
      }
    } catch {
      setSensors("denied");
    }
  };
  useEffect(() => {
    if (sensors !== "granted") return;
    const onOrient = (e) => {
      if (e.beta === null || e.beta === undefined) return;
      // beta: front-back pitch (90 = phone held upright, facing forward). Tilt from vertical = |90 - beta|.
      const t = Math.round(Math.abs(90 - e.beta));
      setTilt(t);
      setRoll(Math.round(e.gamma || 0));
      const delta = lastTilt.current === null ? 0 : Math.abs(t - lastTilt.current);
      lastTilt.current = t;
      setSteady((s) => (delta <= 1 ? Math.min(s + 1, 30) : 0));
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [sensors]);
  useEffect(() => {
    if (sensors === "unknown" && typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") setSensors("granted");
  }, [sensors]);

  // Live sharpness and light meter, sampled from the video twice a second
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = Math.round((v.videoHeight / v.videoWidth) * 320);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      setMetrics(analyseCanvas(c));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const issues = metrics ? captureIssues({ width: videoRef.current?.videoWidth || 1920, height: videoRef.current?.videoHeight || 1080, ...metrics }) : [];
  const tiltOk = tilt === null || tilt <= 45;
  const levelOk = Math.abs(roll) <= 6;
  const ready = !!metrics && issues.length === 0 && tiltOk && levelOk;

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `live-eye-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file, { deviceTiltDeg: tilt, roll, referenceInFrame, sensors: sensors === "granted" });
      },
      "image/jpeg",
      0.9
    );
  };

  // Auto-capture once the shot has been steady and clean for about two seconds
  useEffect(() => {
    if (ready && steady >= 4 && (spa || referenceInFrame)) capture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steady, ready]);

  return (
    <section className="fd-card overflow-hidden" aria-label="Live capture">
      <div className="relative bg-black">
        <video ref={videoRef} playsInline muted className="block max-h-[62svh] w-full object-cover" />
        {/* Level line: rotates with the phone's roll so the user squares up */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-px w-[70%] -translate-x-1/2 bg-white/70" style={{ transform: `translateX(-50%) rotate(${-roll}deg)` }} />
          <div className={`absolute left-1/2 top-1/2 h-px w-[70%] -translate-x-1/2 ${levelOk ? "bg-emerald-400" : "bg-primary"}`} />
          <div className="absolute inset-x-[8%] inset-y-[14%] rounded-lg border border-white/40" />
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Pill ok={tilt !== null ? tiltOk : null}>{tilt === null ? (sensors === "denied" ? "Tilt: no sensor" : "Tilt: —") : `Tilt ${tilt}°${tiltOk ? "" : " · too steep"}`}</Pill>
          <Pill ok={levelOk}>{levelOk ? "Level" : `Level ${roll > 0 ? "→" : "←"}`}</Pill>
          {metrics && <Pill ok={!issues.some((i) => i.code === "blurry")}>{issues.some((i) => i.code === "blurry") ? "Hold still" : "Sharp"}</Pill>}
          {metrics && <Pill ok={!issues.some((i) => i.code === "dark")}>{issues.some((i) => i.code === "dark") ? "Too dark" : "Light ok"}</Pill>}
        </div>
        {error && <p className="absolute inset-x-3 bottom-3 rounded-lg bg-background/95 p-3 text-[14px]">{error}</p>}
      </div>

      <div className="space-y-3 p-4">
        {sensors === "unknown" && (
          <button type="button" onClick={enableSensors} className="fd-btn-outline w-full">
            Allow motion sensors for the tilt reading
          </button>
        )}
        {!spa && (
          <label className="flex cursor-pointer items-start gap-3 text-[15px]">
            <input type="checkbox" checked={referenceInFrame} onChange={(e) => setReferenceInFrame(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span>
              <Ruler className="mr-1 inline h-4 w-4 text-primary" />
              Something of known size is in frame (a shingle tab, a brick, a tape measure). Without it we can't give square metres.
            </span>
          </label>
        )}
        <p className="text-[13px] text-muted-foreground">
          {ready ? (spa || referenceInFrame ? "Steady… capturing automatically." : "Looks good. Tick the reference box or tap Capture.") : "Square up to the damage, hold still, and keep it under 45° tilt."}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={capture} disabled={!!error} className="fd-btn-primary flex-1">
            <Camera className="h-4 w-4" /> Capture
          </button>
          <button type="button" onClick={onClose} className="fd-btn-outline">
            <X className="h-4 w-4" /> Choose a file instead
          </button>
        </div>
      </div>
    </section>
  );
}

function Pill({ ok, children }) {
  const tone = ok === null ? "bg-background/80 text-foreground" : ok ? "bg-emerald-600 text-white" : "bg-primary text-white";
  return <span className={`rounded-full px-2.5 py-1 font-spec text-[11px] uppercase ${tone}`}>{children}</span>;
}
