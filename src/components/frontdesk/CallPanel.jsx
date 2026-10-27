import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, PhoneIncoming } from "lucide-react";
import { gateway } from "@/gateway";
import { createCaseFromCall } from "@/lib/store";

// Callers reach the same front desk as chatters: the call is transcribed, qualified by the same brain,
// and lands in the same case record. Today the audio is a rehearsed demo clip (labelled); the transcript path is real.
export default function CallPanel({ tenant }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const play = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await gateway.transcribeCall({ audio: null, tenant });
      const q = await gateway.converse({
        trade: tenant.trade,
        tenant,
        messages: [{ role: "user", content: t.transcript }],
        caseState: { channel: "call", description: "", address: "", photo: false, lastQuestion: null },
      });
      const id = createCaseFromCall({ tenantId: tenant.id, transcript: t.transcript, extracted: q.extracted, reply: q.reply, provider: q.provider });
      setResult({ id, transcript: t.transcript, reply: q.reply, provider: t.providerLabel });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fd-card p-5" aria-label="Phone calls">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Phone calls</h2>
          <p className="text-[14px] text-muted-foreground">A call is transcribed and qualified by the same front desk, into the same case.</p>
        </div>
        <button type="button" onClick={play} disabled={busy} className="fd-btn-outline">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneIncoming className="h-4 w-4" />}
          {busy ? "Transcribing…" : "Play a rehearsed call (demo)"}
        </button>
      </div>
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
