import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutDashboard, Mic, MicOff, RotateCcw } from "lucide-react";
import { gateway } from "@/gateway";
import { appendMessage, createCase, getCase, getState, setActiveTenant, updateCase, useStore } from "@/lib/store";
import { route } from "@/lib/router";
import { assessAndVerify } from "@/lib/pipeline";
import { runAgentTurn } from "@/lib/agent";
import AgentChecks from "@/components/frontdesk/AgentChecks";
import { jobStatus, customerMaySee } from "@/lib/verify";
import { measure } from "@/lib/eye";
import { STATUS_LABEL } from "@/lib/quote";
import { readPhoto } from "@/lib/photo";
import useVoice from "@/hooks/useVoice";
import Logo from "@/components/shared/Logo";
import ProviderBadge from "@/components/shared/ProviderBadge";
import Composer from "@/components/frontdesk/Composer";
import CaptureGuide from "@/components/frontdesk/CaptureGuide";
import LiveEye from "@/components/frontdesk/LiveEye";
import ConsentCard from "@/components/frontdesk/ConsentCard";
import OutlinedPhoto from "@/components/frontdesk/OutlinedPhoto";
import AssessmentCard from "@/components/frontdesk/AssessmentCard";
import RepairPreview from "@/components/frontdesk/RepairPreview";
import EmergencyBanner from "@/components/frontdesk/EmergencyBanner";
import SlotPicker, { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";
import PhotoCheck from "@/components/frontdesk/PhotoCheck";
import VoiceOrb from "@/components/frontdesk/VoiceOrb";
import TypingDots from "@/components/shared/TypingDots";
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
  const [liveEye, setLiveEye] = useState(false); // camera capture open
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
        appendMessage(id, { role: "assistant", content: `Hi, this is the front desk at ${t.name.replace(/\.$/, "")}. ${t.words.greeting}` });
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
        const all = getState();
        const res = await runAgentTurn({
          ai: gateway,
          trade: after.trade,
          messages: after.messages.map(({ role, content }) => ({ role, content })),
          tenant: t,
          route: route("converse"),
          caseId: id,
          caseState: {
            description: after.description,
            address: after.customer.address,
            consent: !!after.consent,
            photo: !!after.photo,
            lastQuestion: after.lastQuestion,
          },
          data: { slots: all.slots.filter((sl) => sl.tenantId === after.tenantId), cases: all.cases, current: after, stormRuns: all.stormRuns || [] },
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
        appendMessage(id, { role: "assistant", content: res.reply, trace: res.trace });
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
    async (file, sensor = null) => {
      if (!caseId || busy) return;
      setFailure(null);
      setLiveEye(false);
      try {
        const photo = await readPhoto(file);
        // Tilt measured by the phone's sensors travels with the photo into the Eye maths.
        if (sensor) photo.sensor = sensor;
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
      updateCase(caseId, { photo: { dataUrl: photo.dataUrl, width: photo.width, height: photo.height, name: photo.name, fromVideo: photo.fromVideo, quality: photo.quality, sensor: photo.sensor || null, at: new Date().toISOString() } });
      appendMessage(caseId, { role: "user", content: spa ? "Here's a photo of the area." : "Here's a photo of the damage.", photo: true });
      const run = async () => {
        setBusy(true);
        setFailure(null);
        try {
          const cur = getCase(caseId);
          const t = tenants[cur.tenantId];
          setProgress(spa ? "Noting the area…" : "Outlining the damage…");
          const seg = await gateway.segmentDamage({ trade: cur.trade, photoName: photo.name, width: photo.width, height: photo.height, dataUrl: photo.dataUrl, caseId });
          const region = seg.regions[0];
          const sensorTilt = Number.isFinite(photo.sensor?.deviceTiltDeg) ? photo.sensor.deviceTiltDeg : null;
          const m = !spa && region ? { ...measure({ polygon: region.polygon, reference: seg.reference, tiltDeg: sensorTilt ?? seg.tiltDeg }), tiltSource: sensorTilt !== null ? "phone sensors" : "estimated from the photo" } : null;
          updateCase(caseId, { segmentation: seg, measurement: m });
          setProgress(spa ? "Matching to our services…" : "Working out what failed…");
          const { assessment: a, quote: q, verification } = await assessAndVerify({ ai: gateway, trade: cur.trade, description: cur.description, urgency: cur.urgency, seg, measurement: m, dataUrl: photo.dataUrl, tenant: t, caseId, onProgress: setProgress });
          updateCase(caseId, { assessment: a, quote: q, verification, status: "assessed", lastQuestion: "none", provider: seg.provider });
          const held = q.low != null && !customerMaySee(getCase(caseId), jobStatus(getCase(caseId), { tenant: t, slots: getState().slots }));
          const reply = a.emergency?.isEmergency
            ? held
              ? `Make it safe first. A ${t.words.pro} is checking your photo before we share a range; you can book an ${t.words.visit} now.`
              : "Make it safe first. Once you have, here is what I can see and a draft range."
            : held
              ? `Here's what I can see. A ${t.words.pro} is double-checking it before we share a range, so pick an ${t.words.visit} time below.`
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
  const showGuide = !c.photo && c.lastQuestion === "ask_photo" && !busy && !pending && !liveEye;
  const showLiveEye = liveEye && !c.photo && !busy && !pending;
  const showSlots = (c.assessment || (spa && c.status === "assessed")) && !c.bookingSlotId;
  const orbState = voice.listening ? "listening" : busy ? "thinking" : voice.speaking ? "speaking" : "idle";

  return (
    <div className="flex h-[100svh] flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8">
        <div className="min-w-0 [&_*]:truncate">
          <Logo to="/site" word={tenant.name} as="h1" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ProviderBadge className="hidden sm:inline-flex" />
          {voice.supported && (
            <button type="button" onClick={toggleVoice} className={`${voiceMode ? "fd-btn-primary" : "fd-btn-outline"} fd-btn-sm w-10 px-0 sm:w-auto sm:px-3`} aria-pressed={voiceMode} aria-label={voiceMode ? "End call" : "Talk instead"}>
              {voiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} <span className="hidden sm:inline">{voiceMode ? "End call" : "Talk instead"}</span>
            </button>
          )}
          <Link to="/frontdesk" className="fd-btn-outline fd-btn-sm w-10 px-0 sm:w-auto sm:px-3" aria-label="Front desk">
            <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Front desk</span>
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
                  {m.channel === "call" && <span className="mb-1 block text-[12px] text-background/70">Said on the phone</span>}
                  {m.content}
                  {m.photo && c.photo && <OutlinedPhoto src={c.photo.dataUrl} segmentation={c.segmentation} className="mt-2 border-0" />}
                </div>
              ) : (
                <div className="space-y-4" data-testid="assistant-message">
                  <p className="text-[13px] text-muted-foreground">{tenant.name}</p>
                  <p className="text-[17px] leading-relaxed">{m.content}</p>
                  <AgentChecks trace={m.trace} />
                  {m.kind === "assessment" && c.assessment && (
                    <>
                      <EmergencyBanner emergency={c.assessment?.emergency} />
                      <AssessmentCard segmentation={c.segmentation} measurement={c.measurement} assessment={c.assessment} quote={customerQuote(c, tenant, slots)} tenant={tenant} compact />
                      <RepairPreview c={c} tenant={tenant} />
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
          {busy && !progress && <TypingDots className="w-fit rounded-[18px] rounded-bl-md bg-secondary px-3.5 py-3" />}

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
          {showLiveEye && <LiveEye onCapture={onPhoto} onClose={() => setLiveEye(false)} spa={spa} />}
          {showGuide && <CaptureGuide onPhoto={onPhoto} onLiveEye={() => setLiveEye(true)} busy={busy} spa={spa} />}
          {showSlots && <SlotPicker caseId={c.id} tenant={tenant} address={c.customer.address} onBooked={onBooked} />}
          <div ref={endRef} />
        </div>
      </div>

      <Composer value={input} onChange={setInput} onSend={() => send()} onPhoto={onPhoto} voice={voice} busy={busy} placeholder={spa ? "Tell us what you've noticed…" : "Describe the problem…"} />
    </div>
  );
}

// What the customer sees of the quote: the range only once the job verifies or a person signs it off.
function customerQuote(c, tenant, slots) {
  if (!c.quote || c.quote.low == null) return c.quote; // no range to hold back
  if (customerMaySee(c, jobStatus(c, { tenant, slots }))) return c.quote;
  return { ...c.quote, low: null, high: null, total: null, lines: [], reason: `A ${tenant.words?.pro || "person"} is checking this one before a range is shared. Nothing is lost: book a time and they'll bring it.` };
}

