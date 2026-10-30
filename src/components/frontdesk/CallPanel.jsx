import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mic, PhoneIncoming, Square } from "lucide-react";
import { gateway, PROVIDER } from "@/gateway";
import { createCaseFromCall } from "@/lib/store";
import { recordWav } from "@/lib/recorder";

// Callers reach the same front desk as chatters: the call is transcribed, qualified by the same brain,
// and lands in the same case record. On a real provider the owner records the caller's words with the
// microphone (Muse Voice Transcribe); on mock a rehearsed transcript plays instead, labelled.
export default function CallPanel({ tenant }) {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(null);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const qualify = async (t) => {
    const q = await gateway.converse({
      trade: tenant.trade,
      tenant,
      messages: [{ role: "user", content: t.transcript }],
      caseState: { channel: "call", description: "", address: "", photo: false, lastQuestion: null },
    });
    const id = createCaseFromCall({ tenantId: tenant.id, transcript: t.transcript, extracted: q.extracted, reply: q.reply, provider: q.provider });
    setResult({ id, transcript: t.transcript, reply: q.reply, provider: t.providerLabel });
  };

  const playRehearsed = async () => {
    setBusy(true);
    setError(null);
    try {
      await qualify(await gateway.transcribeCall({ audio: null, tenant }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const r = await recordWav({ maxSeconds: 20, onLevel: setLevel });
      setRecording(r);
    } catch (e) {
      setError(e.name === "NotAllowedError" ? "Microphone permission was refused." : e.message);
    }
  };

  const stopRecording = async () => {
    const r = recording;
    setRecording(null);
    setBusy(true);
    try {
      const audio = await r.stop();
      if (audio.seconds < 1) throw new Error("That was too short to transcribe. Hold the button and speak the caller's words.");
      await qualify(await gateway.transcribeCall({ audio, tenant }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setLevel(0);
    }
  };

  return (
    <section className="fd-card p-5" aria-label="Phone calls">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Phone calls</h2>
          <p className="text-[14px] text-muted-foreground">A call is transcribed and qualified by the same front desk, into the same case.</p>
        </div>
        {PROVIDER === "mock" ? (
          <button type="button" onClick={playRehearsed} disabled={busy} className="fd-btn-outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneIncoming className="h-4 w-4" />}
            {busy ? "Transcribing…" : "Play a rehearsed call (demo)"}
          </button>
        ) : recording ? (
          <button type="button" onClick={stopRecording} className="fd-btn-primary">
            <Square className="h-4 w-4 fill-current" /> Stop and transcribe
            <span className="ml-1 inline-block h-2 w-10 overflow-hidden rounded-full bg-white/30" aria-hidden>
              <span className="block h-full bg-white" style={{ width: `${Math.round(level * 100)}%` }} />
            </span>
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={busy} className="fd-btn-outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {busy ? "Transcribing…" : "Record an incoming call"}
          </button>
        )}
      </div>
      {PROVIDER !== "mock" && !result && !recording && (
        <p className="mt-2 text-[13px] text-muted-foreground">Speak the caller's words into the microphone (up to 20 seconds), e.g. the problem and the address. Muse Voice Transcribe turns it into the transcript that opens the case.</p>
      )}
      {error && <p className="mt-3 text-[14px] text-destructive">{error}</p>}
      {result && (
        <div className="mt-4 space-y-2 rounded-lg bg-secondary p-4 text-[14px]">
          <p>
            <span className="text-muted-foreground">Caller: </span>
            {result.transcript}
          </p>
          <p>
            <span className="text-muted-foreground">Front desk: </span>
            {result.reply}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Transcribed by {result.provider}. The case is in the leads list; the customer continues in{" "}
            <Link to={`/chat?case=${result.id}`} className="text-primary underline">
              their chat
            </Link>{" "}
            to add the photo.
          </p>
        </div>
      )}
    </section>
  );
}
