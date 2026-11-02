import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Check, Mic, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { gateway, PROVIDER, CAPABILITY_MODEL } from "@/gateway";
import { useStore, moveQuote, moveLeadMessage } from "@/lib/store";
import { recordWav } from "@/lib/recorder";
import { deskSnapshot, planAction, confirmWord, readUtterance } from "@/lib/desk";
import { jobStatus } from "@/lib/verify";
import { summarise } from "@/components/frontdesk/DailySummary";
import useVoice from "@/hooks/useVoice";

const spring = { type: "spring", stiffness: 420, damping: 34 };

// Talk to your desk: the owner asks out loud between jobs ("brief me", "approve the Larkspur quote") and the desk
// answers out loud. Muse Voice Transcribe hears it (browser speech recognition on the mock), Muse Spark picks the
// intent, and src/lib/desk.js checks it against the live desk. Nothing is approved or sent until the owner says yes.
export default function DeskAssistant() {
  const { cases: allCases, slots: allSlots, leads: allLeads, tenant } = useStore();
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [muted, setMuted] = useState(false);
  const [rec, setRec] = useState(null);
  const [level, setLevel] = useState(0);
  const bodyRef = useRef(null);
  const handleRef = useRef(null);

  const voice = useVoice({ onFinal: (t) => handleRef.current?.(t) });
  const canRecord = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window !== "undefined" && !!window.MediaRecorder;
  const micMode = PROVIDER !== "mock" && canRecord ? "transcribe" : voice.supported ? "browser" : null;

  const cases = allCases.filter((c) => c.tenantId === tenant.id);
  const leads = allLeads.filter((l) => l.tenantId === tenant.id);
  const snap = () =>
    deskSnapshot({
      tenant,
      cases,
      leads,
      summary: summarise({ tenant, cases, slots: allSlots.filter((s) => s.tenantId === tenant.id), leads }),
      isVerified: (c) => jobStatus(c, { tenant, slots: allSlots }).status === "verified" || !!c.quote?.override,
    });

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [log, busy, pending]);

  const say = (line) => {
    setLog((l) => [...l, { role: "desk", text: line }]);
    if (!muted) voice.speak(line);
  };

  const execute = (action) => {
    setPending(null);
    let ok = true;
    for (const step of action.steps) {
      const r = action.intent.endsWith("_quote") ? moveQuote(action.targetId, step) : moveLeadMessage(action.targetId, step);
      if (r !== step) ok = false;
    }
    say(ok ? action.done : "That didn't go through. It may have changed since you asked; check the card.");
  };

  const handle = async (raw) => {
    const t = raw.trim();
    if (!t || busy) return;
    setLog((l) => [...l, { role: "owner", text: t }]);
    setText("");
    if (pending) {
      const w = confirmWord(t);
      if (w === "yes") return execute(pending);
      setPending(null);
      if (w === "no") return say("Okay, I left it as it was.");
    }
    setBusy(true);
    const s = snap();
    let r;
    try {
      r = await gateway.deskCommand({ utterance: t, snapshot: s, tenant });
    } catch {
      r = { ...readUtterance(t, s), reply: "" };
    }
    setBusy(false);
    const plan = planAction(r, s);
    if (plan.action) {
      setPending(plan.action);
      return say(`${plan.action.prompt} Say yes, or tap Confirm.`);
    }
    if (plan.error) return say(plan.error);
    say(r.reply || (r.intent === "brief" ? s.summary : "I can brief you on today, or approve and send a quote or a re-opener."));
  };
  handleRef.current = handle;

  const mic = async () => {
    if (micMode === "browser") return voice.listening ? voice.stop() : voice.start();
    if (rec) {
      const r = rec;
      setRec(null);
      setLevel(0);
      setBusy(true);
      try {
        const audio = await r.stop();
        const { transcript } = await gateway.transcribeCall({ audio, tenant });
        setBusy(false);
        if (transcript) handle(transcript);
        else say("I didn't catch that. Try again, or type it.");
      } catch (e) {
        setBusy(false);
        say(`I couldn't hear that (${e.message}). You can type instead.`);
      }
      return;
    }
    voice.stopSpeaking();
    try {
      setRec(await recordWav({ maxSeconds: 12, onLevel: setLevel }));
    } catch {
      say("I can't reach the microphone. You can type instead.");
    }
  };
  const listening = !!rec || voice.listening;

  const s = open ? snap() : null;
  const firstQuote = s?.quotes.find((q) => q.low !== null && q.status !== "approved");
  const firstReopener = s?.reopeners.find((r) => r.status === "draft" || r.status === "approved");
  const chips = s
    ? ["Brief me", firstQuote && `Approve the quote for ${firstQuote.who}`, firstReopener && `Send ${firstReopener.name.split(" ")[0]}'s re-opener`].filter(Boolean)
    : [];

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={spring}
            className="fixed bottom-5 right-5 z-30 inline-flex h-12 items-center gap-2.5 rounded-full bg-foreground pl-1.5 pr-4 text-[15px] font-semibold text-background shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)] active:scale-[0.96]"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[hsl(var(--ios-indigo))] to-[hsl(var(--ios-blue))]">
              <AudioLines className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
            </span>
            Ask your desk
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            key="sheet"
            role="dialog"
            aria-label="Your desk"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={spring}
            className="fd-card fixed inset-x-3 bottom-3 z-40 flex max-h-[min(620px,calc(100dvh-24px))] flex-col overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]"
            style={{ transformOrigin: "bottom right" }}
          >
            <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[hsl(var(--ios-indigo))] to-[hsl(var(--ios-blue))] text-white">
                <AudioLines className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold leading-tight">Your desk</h2>
                <p className="truncate text-[13px] text-muted-foreground">
                  {CAPABILITY_MODEL.deskCommand}
                  {micMode === "transcribe" ? ` · ${CAPABILITY_MODEL.transcribeCall}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => (setMuted((m) => !m), voice.stopSpeaking())} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={muted ? "Turn voice on" : "Mute voice"} title={muted ? "Turn voice on" : "Mute voice"}>
                {muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
              </button>
              <button type="button" onClick={() => (setOpen(false), voice.stopSpeaking())} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>

            <div ref={bodyRef} className="min-h-[200px] flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {log.length === 0 && (
                <div className="rise">
                  <p className="text-[15px] leading-relaxed text-foreground/80">Ask out loud or type, between jobs. I can brief you and approve or send what's waiting. Nothing is approved or sent until you say yes.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chips.map((c) => (
                      <button key={c} type="button" onClick={() => handle(c)} className="max-w-full truncate rounded-full bg-secondary px-3.5 py-2 text-[14px] font-medium text-foreground transition-colors duration-200 ease-ios hover:bg-[hsl(var(--secondary-hover))] active:scale-[0.97]">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {log.map((m, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  className={`w-fit max-w-[85%] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug ${m.role === "owner" ? "ml-auto rounded-br-md bg-[hsl(var(--ios-blue))] text-white" : "rounded-bl-md bg-secondary text-foreground"}`}
                >
                  {m.text}
                </motion.p>
              ))}
              {busy && (
                <p className="flex w-fit gap-1 rounded-[18px] rounded-bl-md bg-secondary px-3.5 py-3" aria-label="Thinking">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </p>
              )}
            </div>

            <AnimatePresence>
              {pending && (
                <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring} className="shrink-0 overflow-hidden border-t border-border bg-[hsl(var(--ios-blue)/0.06)]">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-[hsl(var(--ios-blue))]">Needs your OK</p>
                    <button type="button" onClick={() => (setPending(null), say("Okay, I left it as it was."))} className="fd-btn-outline fd-btn-sm">Cancel</button>
                    <button type="button" onClick={() => (setLog((l) => [...l, { role: "owner", text: "Confirm" }]), execute(pending))} className="fd-btn-primary fd-btn-sm">
                      <Check className="h-4 w-4" /> Confirm
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handle(text);
              }}
              className="flex shrink-0 items-center gap-2 border-t border-border p-3"
            >
              {micMode && (
                <button
                  type="button"
                  onClick={mic}
                  disabled={busy && !listening}
                  aria-label={listening ? "Stop listening" : "Talk"}
                  aria-pressed={listening}
                  className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-200 ease-ios active:scale-95 disabled:opacity-50 ${listening ? "bg-[hsl(var(--ios-red))] text-white" : "bg-secondary text-foreground hover:bg-[hsl(var(--secondary-hover))]"}`}
                >
                  {listening && <span className="absolute inset-0 rounded-full bg-[hsl(var(--ios-red)/0.35)]" style={{ transform: `scale(${1 + level * 0.6})`, transition: "transform 100ms linear" }} aria-hidden />}
                  {listening ? <Square className="relative h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
              <input
                value={listening && voice.interim ? voice.interim : text}
                onChange={(e) => setText(e.target.value)}
                placeholder={listening ? "Listening…" : "Ask your desk…"}
                aria-label="Ask your desk"
                className="h-11 min-w-0 flex-1 rounded-full bg-secondary px-4 text-[16px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]"
              />
              <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[hsl(var(--ios-blue))] text-white transition-opacity duration-200 disabled:opacity-30 active:scale-95">
                <Send className="h-[18px] w-[18px]" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
