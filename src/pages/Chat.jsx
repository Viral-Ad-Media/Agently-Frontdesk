import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutDashboard, Mic, MicOff, RotateCcw } from "lucide-react";
import { gateway } from "@/gateway";
import { appendMessage, createCase, getCase, setActiveTenant, updateCase, useStore } from "@/lib/store";
import { measure } from "@/lib/eye";
import { draftQuote, draftServiceQuote, STATUS_LABEL } from "@/lib/quote";
import { readPhoto } from "@/lib/photo";
import useVoice from "@/hooks/useVoice";
import Logo from "@/components/shared/Logo";
import ProviderBadge from "@/components/shared/ProviderBadge";
import Composer from "@/components/frontdesk/Composer";
import CaptureGuide from "@/components/frontdesk/CaptureGuide";
import ConsentCard from "@/components/frontdesk/ConsentCard";
import OutlinedPhoto from "@/components/frontdesk/OutlinedPhoto";
import AssessmentCard from "@/components/frontdesk/AssessmentCard";
import EmergencyBanner from "@/components/frontdesk/EmergencyBanner";
import SlotPicker, { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";
import PhotoCheck from "@/components/frontdesk/PhotoCheck";
import VoiceOrb from "@/components/frontdesk/VoiceOrb";
import ReportButton from "@/components/frontdesk/ReportButton";

// The customer's front desk: one case, from first message to booked visit. Chat or voice, same case.
export default function Chat() {
  const [params, setParams] = useSearchParams();
  const [caseId, setCaseId] = useState(() => {
    const id = params.get("case");
    return id && getCase(id) ? id : null;
  });
  const c = useStore((s) => s.cases.find((x) => x.id === caseId));
  const tenants = useStore((s) => s.tenants);
  const activeTenant = useStore((s) => s.tenant);
  const tenant = (c && tenants[c.tenantId]) || activeTenant;
  const slots = useStore((s) => s.slots);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [failure, setFailure] = useState(null);
  const [pending, setPending] = useState(null); // a photo waiting for the customer's "use it" tap
  const [voiceMode, setVoiceMode] = useState(false);
  const endRef = useRef(null);
  const sendRef = useRef(null);
  const voiceModeRef = useRef(false);
  voiceModeRef.current = voiceMode;
  const voice = useVoice({ onFinal: (t) => sendRef.current(t) });
  const spa = tenant.trade === "medspa";

  // Open a case for the requested tenant and get the first question. A ?q= from the home page becomes the first message.
  useEffect(() => {
    if (caseId) return;
    const wanted = params.get("tenant");
    if (wanted && tenants[wanted]) setActiveTenant(wanted);
    const t = (wanted && tenants[wanted]) || activeTenant;
    const id = createCase({ tenantId: t.id, source: "chat" });
    setCaseId(id);
    setParams({ case: id }, { replace: true });
    (async () => {
      const q = params.get("q");
      if (q) {
        await converseWith(id, q);
      } else {
        appendMessage(id, { role: "assistant", content: `Hi, this is the front desk at ${t.name}. ${t.words.greeting}` });
        updateCase(id, { lastQuestion: "ask_description" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [c?.messages?.length, progress, busy, pending]);

  // Voice mode: speak each reply, then listen for the next turn.
  const say = useCallback(
    (text) => {
      if (!voiceModeRef.current) return;
      voice.speak(text, () => {
        if (voiceModeRef.current) voice.start();
      });
    },
    [voice]
  );

  const converseWith = useCallback(
    async (id, text) => {
      const cur = getCase(id);
      if (!cur) return;
      appendMessage(id, { role: "user", content: text });
      setBusy(true);
      setFailure(null);
      try {
        const after = getCase(id);
        const t = tenants[after.tenantId];
        const res = await gateway.converse({
          trade: after.trade,
          messages: after.messages.map(({ role, content }) => ({ role, content })),
          tenant: t,
          caseState: {
            description: after.description,
            address: after.customer.address,
            consent: !!after.consent,
            photo: !!after.photo,
            lastQuestion: after.lastQuestion,
          },
        });
        const ex = res.extracted || {};
        updateCase(id, (prev) => ({
          description: ex.description || prev.description,
          urgency: ex.urgency || prev.urgency,
          intent: ex.intent || prev.intent,
          customer: { ...prev.customer, address: ex.address || prev.customer.address },
          lastQuestion: res.nextAction,
          provider: res.provider,
        }));
        appendMessage(id, { role: "assistant", content: res.reply });
        say(res.reply);
      } catch (e) {
        setFailure({ message: e.message, retry: () => converseWith(id, text) });
      } finally {
        setBusy(false);
      }
    },
    [tenants, say]
  );

  const send = useCallback(
    async (override) => {
      const text = (typeof override === "string" ? override : input).trim();
      if (!text || busy || !caseId) return;
      setInput("");
      await converseWith(caseId, text);
    },
    [input, busy, caseId, converseWith]
  );
  sendRef.current = send;

  // Step one: read the file (photo or video frame), run the capture checks, and show the frame first.
  const onPhoto = useCallback(
    async (file) => {
      if (!caseId || busy) return;
      setFailure(null);
      try {
        const photo = await readPhoto(file);
        setPending(photo);
      } catch (e) {
        setFailure({ message: e.message, retry: null });
      }
    },
    [caseId, busy]
  );

  // Step two: outlined assessment and draft quote. Every AI step goes through the gateway.
  const acceptPhoto = useCallback(
    async (photo) => {
      if (!caseId || busy) return;
      setPending(null);
      setBusy(true);
      setFailure(null);
      updateCase(caseId, { photo: { dataUrl: photo.dataUrl, width: photo.width, height: photo.height, name: photo.name, fromVideo: photo.fromVideo, quality: photo.quality } });
      appendMessage(caseId, { role: "user", content: spa ? "Here's a photo of the area." : "Here's a photo of the damage.", photo: true });
      const run = async () => {
        setBusy(true);
        setFailure(null);
        try {
          const cur = getCase(caseId);
          const t = tenants[cur.tenantId];
          setProgress(spa ? "Noting the area…" : "Outlining the damage…");
          const seg = await gateway.segmentDamage({ trade: cur.trade, photoName: photo.name, width: photo.width, height: photo.height, dataUrl: photo.dataUrl });
          const region = seg.regions[0];
          const m = !spa && region ? measure({ polygon: region.polygon, reference: seg.reference, tiltDeg: seg.tiltDeg }) : null;
          updateCase(caseId, { segmentation: seg, measurement: m });
          setProgress(spa ? "Matching to our services…" : "Working out what failed…");
          const a = await gateway.assess({ trade: cur.trade, description: cur.description, urgency: cur.urgency, segmentation: seg, measurement: m, dataUrl: photo.dataUrl, tenant: t });
          setProgress(spa ? "Looking up the published price…" : "Drafting your price range…");
          const base = spa
            ? draftServiceQuote({ service: (t.services || []).find((s) => s.id === a.serviceMatch?.[0]?.serviceId), disclaimer: t.disclaimer })
            : draftQuote({ material: a.material.name, measurement: m, rateCard: t.rateCard });
          const q = { ...base, status: "draft", history: [{ status: "draft", at: new Date().toISOString(), by: "ai" }] };
          updateCase(caseId, { assessment: a, quote: q, status: "assessed", lastQuestion: "none", provider: seg.provider });
          const reply = a.emergency?.isEmergency
            ? "Make it safe first. Once you have, here is what I can see and a draft range."
            : spa
              ? `Here's what we've noted and the published range for the matched service. A clinician reviews it before anything is recommended. Pick a ${t.words.visit} time below.`
              : `Here's what I can see, with a draft range. A ${t.words.pro} confirms the price on site, so pick an ${t.words.visit} time below.`;
          appendMessage(caseId, { role: "assistant", kind: "assessment", content: reply });
          say(reply);
        } catch (e) {
          setFailure({ message: e.message, retry: run });
        } finally {
          setProgress(null);
          setBusy(false);
        }
      };
      await run();
    },
    [caseId, busy, tenants, spa, say]
  );

  const onConsent = () => {
    updateCase(caseId, { consent: { at: new Date().toISOString(), scope: "photo for service match and consultation" }, lastQuestion: "ask_photo" });
    appendMessage(caseId, { role: "assistant", content: "Thank you. Add a photo of the area when you're ready: natural light, no filters." });
  };

  const onSkipPhoto = () => {
    updateCase(caseId, { lastQuestion: "none", status: "assessed" });
    appendMessage(caseId, { role: "assistant", kind: "assessment", content: "No problem. A clinician will go through it with you in person. Pick a consultation time below." });
  };

  const onBooked = (slot) => {
    updateCase(caseId, (prev) => ({
      quote: prev.quote ? { ...prev.quote, status: "awaiting_approval", history: [...(prev.quote.history || []), { status: "awaiting_approval", at: new Date().toISOString(), by: "customer" }] } : prev.quote,
    }));
    const text = spa
      ? `You're booked for ${fmtDay(slot.start)} at ${fmtTime(slot.start)}. A clinician is reviewing your notes and will confirm the plan at your consultation.`
      : `You're booked for ${fmtDay(slot.start)} at ${fmtTime(slot.start)}. The front desk is reviewing your draft quote and will send the confirmed range before the visit.`;
    appendMessage(caseId, { role: "assistant", kind: "booking", content: text });
    say(text);
  };

  const toggleVoice = () => {
    if (!voice.supported) return;
    if (voiceMode) {
      setVoiceMode(false);
      voice.stop();
      voice.stopSpeaking();
    } else {
      setVoiceMode(true);
      voice.start();
    }
  };

  if (!c) return null;
  const bookedSlot = c.bookingSlotId ? slots.find((s) => s.id === c.bookingSlotId) : null;
  const showConsent = spa && !c.consent && c.lastQuestion === "ask_consent" && !busy && !pending;
  const showGuide = !c.photo && c.lastQuestion === "ask_photo" && !busy && !pending;
  const showSlots = (c.assessment || (spa && c.status === "assessed")) && !c.bookingSlotId;
  const orbState = voice.listening ? "listening" : busy ? "thinking" : voice.speaking ? "speaking" : "idle";

  return (
    <div className="flex h-[100svh] flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8">
        <Logo word={tenant.name} />
        <div className="flex items-center gap-2">
          <ProviderBadge className="hidden sm:inline-flex" />
          {voice.supported && (
            <button type="button" onClick={toggleVoice} className={voiceMode ? "fd-btn-primary h-9 px-3 text-[13px]" : "fd-btn-outline h-9 px-3 text-[13px]"} aria-pressed={voiceMode}>
              {voiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {voiceMode ? "End call" : "Talk instead"}
            </button>
          )}
          <Link to="/frontdesk" className="fd-btn-outline h-9 px-3 text-[13px]">
            <LayoutDashboard className="h-4 w-4" /> Front desk
          </Link>
        </div>
      </header>

      {voiceMode && (
        <div className="flex flex-col items-center gap-1 border-b border-border bg-card py-4">
          <VoiceOrb state={orbState} size={104} onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={busy} />
          <p className="font-spec text-[11px] uppercase text-muted-foreground">Browser voice · Muse Voice Transcribe at the Meta swap</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 md:px-8">
        <div className="mx-auto max-w-2xl space-y-5 py-6">
          {c.messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-lg rounded-br-sm bg-foreground px-4 py-2.5 text-[15px] text-background">
                  {m.content}
                  {m.photo && c.photo && <OutlinedPhoto src={c.photo.dataUrl} segmentation={c.segmentation} className="mt-2 border-0" />}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[13px] text-muted-foreground">{tenant.name}</p>
                  <p className="text-[17px] leading-relaxed">{m.content}</p>
                  {m.kind === "assessment" && c.assessment && (
                    <>
                      <EmergencyBanner emergency={c.assessment?.emergency} />
                      <AssessmentCard segmentation={c.segmentation} measurement={c.measurement} assessment={c.assessment} quote={c.quote} tenant={tenant} compact />
                    </>
                  )}
                  {m.kind === "booking" && bookedSlot && (
                    <div className="fd-card p-5">
                      <p className="font-spec text-[11px] uppercase text-muted-foreground">{tenant.words.visit} booked</p>
                      <p className="mt-1 text-lg">
                        {fmtDay(bookedSlot.start)} · {fmtTime(bookedSlot.start)}–{fmtTime(bookedSlot.end)}
                      </p>
                      <p className="text-[15px] text-muted-foreground">{spa ? `${tenant.name}, ${tenant.serviceArea}` : c.customer.address}</p>
                      {c.quote && (
                        <p className="mt-3 text-[14px]">
                          {spa ? "Plan status" : "Quote status"}: <span className="font-medium">{STATUS_LABEL[c.quote.status] || "Draft"}</span>
                          {c.quote.status === "sent" && c.quote.low !== null && <span className="text-muted-foreground"> · confirmed range ${c.quote.low}–${c.quote.high}</span>}
                        </p>
                      )}
                      <ReportButton c={c} tenant={tenant} className="mt-3" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {voice.listening && voice.interim && <p className="text-[15px] italic text-muted-foreground">{voice.interim}…</p>}
          {progress && (
            <div className="flex items-center gap-3 text-[15px] text-muted-foreground" aria-live="polite">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {progress}
            </div>
          )}
          {busy && !progress && <p className="font-spec text-[11px] uppercase text-muted-foreground animate-pulse">Typing…</p>}

          {failure && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-[15px]">
              <p>Something went wrong: {failure.message}</p>
              {failure.retry && (
                <button type="button" onClick={failure.retry} className="fd-btn-outline mt-3">
                  <RotateCcw className="h-4 w-4" /> Try again
                </button>
              )}
            </div>
          )}

          {pending && <PhotoCheck photo={pending} onRetake={onPhoto} onUse={() => acceptPhoto(pending)} />}
          {showConsent && <ConsentCard tenant={tenant} onConsent={onConsent} onSkip={onSkipPhoto} />}
          {showGuide && <CaptureGuide onPhoto={onPhoto} busy={busy} spa={spa} />}
          {showSlots && <SlotPicker caseId={c.id} tenant={tenant} address={c.customer.address} onBooked={onBooked} />}
          <div ref={endRef} />
        </div>
      </div>

      <Composer value={input} onChange={setInput} onSend={() => send()} onPhoto={onPhoto} voice={voice} busy={busy} placeholder={spa ? "Tell us what you've noticed…" : "Describe the problem…"} />
    </div>
  );
}
