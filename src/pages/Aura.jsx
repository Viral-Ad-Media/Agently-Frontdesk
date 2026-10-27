
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/shared/Logo";
import Orb from "@/components/aura/Orb";
import Composer from "@/components/aura/Composer";
import DiagnosisCard from "@/components/aura/DiagnosisCard";
import EmergencyBanner from "@/components/aura/EmergencyBanner";
import useVoice from "@/hooks/useVoice";

const greeting = { role: "assistant", content: "Hi, I'm Aura. Tell me what's broken — type it, say it, or attach a photo — and I'll work out the trade, the cost and whether you can fix it yourself." };
const labels = { idle: "Ready", listening: "Listening", processing: "Thinking", speaking: "Speaking" };

export default function Aura() {
  const [params] = useSearchParams();
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const endRef = useRef(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const sendRef = useRef(null);
  const voice = useVoice({ onFinal: (t) => sendRef.current(t) });

  const send = useCallback(async (override) => {
    const text = (typeof override === "string" ? override : input).trim();
    if ((!text && !photo) || busy) return;
    const content = text || "Here's a photo of the problem.";
    const next = [...messages, { role: "user", content, photo: photo?.name }];
    setMessages(next);
    setInput("");
    setBusy(true);
    let photo_url;
    if (photo) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: photo });
      ({ signed_url: photo_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 }));
      setPhoto(null);
    }
    const history = next.map(({ role, content }) => ({ role, content }));
    const { data } = await base44.functions.invoke("aura", { messages: history, photo_url }).catch(() => ({ data: null }));
    const reply = data?.reply || "Sorry, I lost the connection for a moment. Could you say that again?";
    setMessages((m) => [...m, { role: "assistant", content: reply, diagnosis: data?.diagnosis, emergency: data?.emergency }]);
    setBusy(false);
    if (!mutedRef.current) voice.speak(reply);
  }, [input, photo, busy, messages, voice]);
  sendRef.current = send;

  useEffect(() => {
    const q = params.get("q");
    if (q) setTimeout(() => sendRef.current(q), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const state = voice.listening ? "listening" : busy ? "processing" : voice.speaking ? "speaking" : "idle";

  return (
    <div className="flex h-[100svh] flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Logo />
        <button
          onClick={() => { setMuted(!muted); voice.stopSpeaking(); }}
          aria-label="Toggle voice replies"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-all duration-300 hover:border-foreground active:scale-90"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex flex-col items-center pb-2">
        <Orb state={state} size={170} />
        <AnimatePresence mode="wait">
          <motion.p key={state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 font-spec text-[11px] uppercase text-muted-foreground">
            {labels[state]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="blueprint-lines flex-1 overflow-y-auto px-6 md:px-8">
        <div className="mx-auto max-w-2xl pb-6">
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} className="border-t border-border py-5">
              <p className={`mb-2 font-spec text-[10px] uppercase ${m.role === "user" ? "text-muted-foreground" : "text-primary"}`}>{m.role === "user" ? "You" : "Aura"}</p>
              <p className={m.role === "user" ? "text-lg text-foreground/80" : "font-heading text-2xl font-light leading-snug"}>{m.content}</p>
              {m.photo && <p className="mt-2 font-spec text-[11px] uppercase text-muted-foreground">Attached: {m.photo}</p>}
              {m.emergency && <EmergencyBanner emergency={m.emergency} />}
              {m.diagnosis && <DiagnosisCard d={m.diagnosis} emergency={m.emergency} />}
            </motion.div>
          ))}
          {voice.listening && voice.interim && <p className="border-t border-border py-5 text-lg italic text-muted-foreground">{voice.interim}…</p>}
          {busy && <p className="border-t border-border py-5 font-spec text-xs uppercase text-primary animate-pulse">Aura is analysing…</p>}
          <div ref={endRef} />
        </div>
      </div>

      <Composer
        value={input} onChange={setInput} onSend={() => send()} busy={busy}
        onPhoto={setPhoto} photoName={photo?.name} onClearPhoto={() => setPhoto(null)} voice={voice}
      />
    </div>
  );
}