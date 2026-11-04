import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Globe, LayoutDashboard, Loader2, Mic, MicOff, RotateCcw } from "lucide-react";
import { gateway } from "@/gateway";
import { addTenant, appendMessage, createCase, getCase, getState, setActiveTenant, updateCase, useStore } from "@/lib/store";
import { alertOwner, fetchDesk } from "@/lib/cloud";
import { earlierEnquiries, tenantForSite } from "@/lib/returning";
import { route } from "@/lib/router";
import { assessAndVerify } from "@/lib/pipeline";
import { runAgentTurn } from "@/lib/agent";
import AgentChecks from "@/components/frontdesk/AgentChecks";
import { jobStatus, customerMaySee } from "@/lib/verify";
import { measure } from "@/lib/eye";
import { STATUS_LABEL } from "@/lib/quote";
import { isMenu, tradeProfile, withArticle, siteClass } from "@/config/trades";
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
import { TrustChips } from "@/components/shared/TrustCard";
import InsuranceCard, { wantsInsurance } from "@/components/frontdesk/InsuranceCard";
import EmergencyBanner from "@/components/frontdesk/EmergencyBanner";
import SlotPicker, { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";
import PhotoCheck from "@/components/frontdesk/PhotoCheck";
import SamplePhotos from "@/components/frontdesk/SamplePhotos";
import VoiceOrb from "@/components/frontdesk/VoiceOrb";
import TypingDots from "@/components/shared/TypingDots";
import ReportButton from "@/components/frontdesk/ReportButton";

// The customer's front desk: one case, from first message to booked visit. Chat or voice, same case.
const BOOK_INTENT = /\b(book|booking|schedule|appointment|reserve|inspection|consultation|come out|come by|come over|send someone|the chair)\b/i;
import { SAMPLE_ADDRESS as SAMPLE_ADDRESSES } from "@/config/media";

// The desk's own name, said when it greets a customer and when a voice call starts.
const agentName = (t) => t?.words?.agentName || "Aura";

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
  const stormRuns = useStore((s) => s.stormRuns);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [failure, setFailure] = useState(null);
  const [pending, setPending] = useState(null); // a photo waiting for the customer's "use it" tap
  const [draft, setDraft] = useState(null); // the drafted card, shown while the reviewer checks it (price hidden)
  const [liveEye, setLiveEye] = useState(false); // camera capture open
  const [voiceMode, setVoiceMode] = useState(false);
  const [siteState, setSiteState] = useState(null); // null | { host, status: "loading" | "missing" }
  const endRef = useRef(null);
  const sendRef = useRef(null);
  const voiceModeRef = useRef(false);
  const assessRef = useRef(null);
  const toggleVoiceRef = useRef(null);
  voiceModeRef.current = voiceMode;
  const voice = useVoice({ onFinal: (t) => sendRef.current(t) });
  // "spa" = the service-menu engine (med spa, plumbing, AC, salon, barber); the trade profile says the rest.
  const prof = tradeProfile(tenant.trade);
  const spa = isMenu(tenant.trade);
  const medspa = tenant.trade === "medspa";

  // Open a case for the requested tenant and get the first question. A ?q= from the home page becomes the first message.
  useEffect(() => {
    if (caseId) return;
    const start = (t) => {
      setActiveTenant(t.id);
      const id = createCase({ tenantId: t.id, source: params.get("site") ? "website" : "chat" });
      // ?voice=1 (the site's "Talk to us" button) opens straight into a voice call.
      if (params.get("voice")) setTimeout(() => toggleVoiceRef.current?.(), 300);
      setCaseId(id);
      setSiteState(null);
      setParams(params.get("site") ? { case: id, site: params.get("site") } : { case: id }, { replace: true });
      (async () => {
        const q = params.get("q");
        if (q) {
          await converseWith(id, q);
        } else {
          appendMessage(id, { role: "assistant", content: `Hi, I'm ${agentName(t)}, the AI front desk for ${t.name.replace(/\.$/, "")}. ${t.words.greeting}` });
          updateCase(id, { lastQuestion: "ask_description" });
        }
      })();
    };
    // ?site=<host>: opened from the chat button on a business's own website. Use the desk set up from that
    // site in this browser, or the one its owner published, so a customer on any device reaches it.
    const site = params.get("site");
    if (site) {
      const local = tenantForSite(tenants, site);
      if (local) return start(local);
      setSiteState({ host: site, status: "loading" });
      fetchDesk(site).then((remote) => {
        if (!remote) return setSiteState({ host: site, status: "missing" });
        addTenant(remote);
        start(remote);
      });
      return;
    }
    const wanted = params.get("tenant");
    start((wanted && tenants[wanted]) || activeTenant);
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
      if (getCase(id).messages.filter((m) => m.role === "user").length === 1) alertOwner(id, "new");
      // The owner took over this conversation: their reply comes from the front desk, not the AI.
      if (getCase(id)?.takenOver) return;
      setBusy(true);
      setFailure(null);
      try {
        const after = getCase(id);
        const t = tenants[after.tenantId];
        const all = getState();
        const res = await runAgentTurn({
          ai: gateway,
          trade: after.trade,
          messages: after.messages.map(({ role, content }) => ({ role: role === "owner" ? "assistant" : role, content })),
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
        // Same address as an earlier enquiry to this business: link them, so the owner sees the history.
        const linked = getCase(id);
        if (linked.customer.address && !linked.returning) {
          const earlier = earlierEnquiries(linked, getState().cases);
          if (earlier.length) updateCase(id, { returning: { count: earlier.length, ids: earlier.map((e) => e.id), last: { at: earlier[0].createdAt, reported: earlier[0].description || null, status: earlier[0].bookingSlotId ? "visit booked" : earlier[0].quote?.status || "enquiry" } } });
        }
        if (BOOK_INTENT.test(text)) updateCase(id, { bookingOffered: true });
        appendMessage(id, { role: "assistant", content: res.reply, trace: res.trace });
        say(res.reply);
        // A menu trade that has the description but no photo coming can be matched from the text straight away.
        const now = getCase(id);
        if (res.nextAction === "assess" && isMenu(now.trade) && now.trade !== "medspa" && !now.photo && !now.assessment && now.description) setTimeout(() => assessRef.current?.(), 0);
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

  // Sample job (no camera needed): fills in a synthetic description and address only where the customer has not
  // given one, says so in the chat, then runs the sample photo through exactly the same checks and pipeline.
  const onSample = useCallback(
    async (sample, file) => {
      if (!caseId || busy) return;
      const cur = getCase(caseId);
      const SAMPLE_ADDRESS = SAMPLE_ADDRESSES[cur.trade] || "";
      const addDesc = !cur.description;
      const addAddr = !!SAMPLE_ADDRESS && !cur.customer?.address;
      if (addDesc || addAddr) {
        updateCase(caseId, (prev) => ({
          description: prev.description || sample.description,
          customer: { ...prev.customer, address: prev.customer?.address || SAMPLE_ADDRESS || "" },
          lastQuestion: "ask_photo",
        }));
        appendMessage(caseId, { role: "user", content: `Sample job: ${addDesc ? sample.description : ""}${addAddr ? `${addDesc ? " " : ""}Address: ${SAMPLE_ADDRESS}.` : ""}`.trim(), sample: true });
      }
      await onPhoto(file);
    },
    [caseId, busy, onPhoto]
  );

  // Step two: outlined assessment and draft quote. Every AI step goes through the gateway.
  const acceptPhoto = useCallback(
    async (photo) => {
      if (!caseId || busy) return;
      setPending(null);
      setBusy(true);
      setFailure(null);
      updateCase(caseId, { photo: { dataUrl: photo.dataUrl, width: photo.width, height: photo.height, name: photo.name, fromVideo: photo.fromVideo, quality: photo.quality, sensor: photo.sensor || null, at: new Date().toISOString() } });
      appendMessage(caseId, { role: "user", content: medspa ? "Here's a photo of the area." : spa ? "Here's a photo." : "Here's a photo of the damage.", photo: true });
      const run = async () => {
        setBusy(true);
        setFailure(null);
        try {
          const cur = getCase(caseId);
          const t = tenants[cur.tenantId];
          setProgress(medspa ? "Noting the area…" : spa ? "Looking at your photo…" : "Outlining the damage…");
          const seg = await gateway.segmentDamage({ trade: cur.trade, photoName: photo.name, width: photo.width, height: photo.height, dataUrl: photo.dataUrl, caseId });
          const region = seg.regions[0];
          const sensorTilt = Number.isFinite(photo.sensor?.deviceTiltDeg) ? photo.sensor.deviceTiltDeg : null;
          const m = !spa && region ? { ...measure({ polygon: region.polygon, reference: seg.reference, tiltDeg: sensorTilt ?? seg.tiltDeg }), tiltSource: sensorTilt !== null ? "phone sensors" : "estimated from the photo" } : null;
          updateCase(caseId, { segmentation: seg, measurement: m });
          setProgress(spa ? "Matching to our services…" : "Working out what failed…");
          const { assessment: a, quote: q, verification } = await assessAndVerify({ ai: gateway, trade: cur.trade, description: cur.description, urgency: cur.urgency, seg, measurement: m, dataUrl: photo.dataUrl, tenant: t, caseId, onProgress: setProgress, onDraft: setDraft });
          updateCase(caseId, { assessment: a, quote: q, verification, status: "assessed", lastQuestion: "none", provider: seg.provider });
          const held = q.low != null && !customerMaySee(getCase(caseId), jobStatus(getCase(caseId), { tenant: t, slots: getState().slots }));
          const clash = verification.contradiction;
          const reply = clash && !a.emergency?.isEmergency
            ? `Thanks. The photo seems to show ${(seg.regions || []).map((r) => r.label).join(", ") || "something different"}, which doesn't match what you described, so a ${t.words.pro} is checking it before we share a range. If you can, describe it again or send a photo of the part you mean. You can book ${withArticle(t.words.visit)} below either way.`
            : a.emergency?.isEmergency
            ? held
              ? `Make it safe first. A ${t.words.pro} is checking your photo before we share a range; you can book ${withArticle(t.words.visit)} now.`
              : "Make it safe first. Once you have, here is what I can see and a draft range."
            : held
              ? `Here's what I can see. A ${t.words.pro} is double-checking it before we share a range, so pick ${withArticle(t.words.visit)} time below.`
              : spa
              ? `Here's what we've noted and the published range for the matched service. ${medspa ? "A clinician reviews it before anything is recommended" : `The ${t.words.pro} confirms it ${prof.onSite ? "on site" : "with you"}`}. Pick ${withArticle(t.words.visit)} time below.`
              : `Here's what I can see, with a draft range. A ${t.words.pro} confirms the price on site, so pick ${withArticle(t.words.visit)} time below.`;
          appendMessage(caseId, { role: "assistant", kind: "assessment", content: reply });
          say(reply);
          alertOwner(caseId, a.emergency?.isEmergency ? "urgent" : "assessed");
        } catch (e) {
          setFailure({ message: e.message, retry: run });
        } finally {
          setProgress(null);
          setDraft(null);
          setBusy(false);
        }
      };
      await run();
    },
    [caseId, busy, tenants, spa, medspa, prof, say]
  );

  // Service-menu trades can be matched from the description alone: no photo needed for a published price.
  const assessFromText = useCallback(async () => {
    if (!caseId) return;
    setBusy(true);
    setFailure(null);
    try {
      const cur = getCase(caseId);
      const t = tenants[cur.tenantId];
      setProgress("Matching it to our services…");
      const { assessment: a, quote: q, verification } = await assessAndVerify({ ai: gateway, trade: cur.trade, description: cur.description, urgency: cur.urgency, seg: null, measurement: null, dataUrl: null, tenant: t, caseId, onProgress: setProgress, onDraft: setDraft });
      updateCase(caseId, { assessment: a, quote: q, verification, status: "assessed", lastQuestion: "none" });
      const held = q.low != null && !customerMaySee(getCase(caseId), jobStatus(getCase(caseId), { tenant: t, slots: getState().slots }));
      const reply = a.emergency?.isEmergency
        ? `Make it safe first: ${a.emergency.actions?.[0] || "stay clear of it"}. Then pick ${withArticle(t.words.visit)} time below and we'll call you straight back.`
        : held || q.low == null
          ? `Thanks. The ${t.words.pro} looks at this before we share a price. Pick ${withArticle(t.words.visit)} time below.`
          : `Here's the match from our menu and its published price range. The ${t.words.pro} confirms it ${prof.onSite ? "on site" : "with you"}. Pick ${withArticle(t.words.visit)} time below.`;
      appendMessage(caseId, { role: "assistant", kind: "assessment", content: reply });
      say(reply);
      alertOwner(caseId, a.emergency?.isEmergency ? "urgent" : "assessed");
    } catch (e) {
      setFailure({ message: e.message, retry: assessFromText });
    } finally {
      setProgress(null);
      setDraft(null);
      setBusy(false);
    }
  }, [caseId, tenants, prof, say]);
  assessRef.current = assessFromText;

  const onConsent = () => {
    updateCase(caseId, { consent: { at: new Date().toISOString(), scope: "photo for service match and consultation" }, lastQuestion: "ask_photo" });
    appendMessage(caseId, { role: "assistant", content: `Thank you. Add ${prof.photoAsk} when you're ready: natural light, no filters.` });
  };

  const onSkipPhoto = () => {
    // Plumbing, AC, salon and barber can still be matched to the menu from what the customer wrote.
    if (spa && !medspa && getCase(caseId)?.description) {
      updateCase(caseId, { lastQuestion: "none" });
      appendMessage(caseId, { role: "user", content: "No photo, thanks." });
      assessFromText();
      return;
    }
    updateCase(caseId, { lastQuestion: "none", status: "assessed" });
    appendMessage(caseId, {
      role: "assistant",
      kind: "assessment",
      content: spa
        ? `No problem. ${medspa ? "A clinician" : `Your ${tenant.words.pro}`} will go through it with you in person. Pick ${withArticle(tenant.words.visit)} time below.`
        : `No problem. Without a photo there's no assessment or price yet; the ${tenant.words?.pro || "roofer"} looks at it on site. Pick a free ${tenant.words?.visit || "inspection"} time below.`,
    });
  };

  const onBooked = (slot) => {
    updateCase(caseId, (prev) => ({
      quote: prev.quote ? { ...prev.quote, status: "awaiting_approval", history: [...(prev.quote.history || []), { status: "awaiting_approval", at: new Date().toISOString(), by: "customer" }] } : prev.quote,
    }));
    const text = medspa
      ? `You're booked for ${fmtDay(slot.start)} at ${fmtTime(slot.start)}. A clinician is reviewing your notes and will confirm the plan at your consultation.`
      : spa
      ? `You're booked for ${fmtDay(slot.start)} at ${fmtTime(slot.start)}. ${prof.onSite ? `The ${tenant.words.pro} confirms the price on site before any work starts.` : `Your ${tenant.words.pro} confirms the service and price when you arrive.`}`
      : `You're booked for ${fmtDay(slot.start)} at ${fmtTime(slot.start)}. The front desk is reviewing your draft quote and will send the confirmed range before the visit.`;
    appendMessage(caseId, { role: "assistant", kind: "booking", content: text });
    say(text);
    alertOwner(caseId, "booked");
  };

  const toggleVoice = () => {
    if (!voice.supported) return;
    if (voiceMode) {
      setVoiceMode(false);
      voice.stop();
      voice.stopSpeaking();
    } else {
      setVoiceMode(true);
      voiceModeRef.current = true;
      // Introduce itself and the business first, then listen. Mid-conversation it keeps it short.
      const started = (getCase(caseId)?.messages || []).some((m) => m.role === "user");
      const intro = started
        ? `Hi, it's ${agentName(tenant)} from ${tenant.name}. I'm listening, go ahead.`
        : `Hi, I'm ${agentName(tenant)}, the AI front desk for ${tenant.name}. ${tenant.words.greeting}`;
      voice.speak(intro, () => {
        if (voiceModeRef.current) voice.start();
      });
    }
  };

  toggleVoiceRef.current = toggleVoice;

  if (!c && siteState) return <SiteNotReady host={siteState.host} loading={siteState.status === "loading"} />;
  if (!c) return null;
  const bookedSlot = c.bookingSlotId ? slots.find((s) => s.id === c.bookingSlotId) : null;
  const showConsent = prof.personPhoto && !c.consent && c.lastQuestion === "ask_consent" && !busy && !pending;
  const showGuide = !c.photo && c.lastQuestion === "ask_photo" && !busy && !pending && !liveEye;
  const showLiveEye = liveEye && !c.photo && !busy && !pending;
  // The time picker appears after the assessment, after "skip the photo", or as soon as the customer asks to book.
  // Booking in the picker confirms straight away for both trades, and the slot lands on the dashboard calendar.
  const showSlots = (c.assessment || c.status === "assessed" || c.bookingOffered) && !c.bookingSlotId && !busy;
  const orbState = voice.listening ? "listening" : busy ? "thinking" : voice.speaking ? "speaking" : "idle";

  return (
    <div className={`${siteClass(tenant.trade)} flex h-[100svh] flex-col bg-background`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8">
        <div className="min-w-0 [&_*]:truncate">
          {tenant.setup?.url ? (
            <a href={tenant.setup.url} className="flex min-w-0 items-center gap-2" title={`Back to ${tenant.name}`}>
              <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{tenant.name}</h1>
            </a>
          ) : (
            <Logo to="/site" word={tenant.name} as="h1" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ProviderBadge className="hidden sm:inline-flex" />
          {voice.supported && (
            <button type="button" onClick={toggleVoice} className={`${voiceMode ? "fd-btn-primary" : "fd-btn-outline"} fd-btn-sm w-10 px-0 sm:w-auto sm:px-3`} aria-pressed={voiceMode} aria-label={voiceMode ? "End call" : "Talk instead"}>
              {voiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} <span className="hidden sm:inline">{voiceMode ? "End call" : "Talk instead"}</span>
            </button>
          )}
          {/* A customer who came from the business's own website never sees the owner's desk link. */}
          {!tenant.setup && (
            <Link to="/frontdesk" className="fd-btn-outline fd-btn-sm w-10 px-0 sm:w-auto sm:px-3" aria-label="Front desk">
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Front desk</span>
            </Link>
          )}
        </div>
      </header>

      {/* Voice call: a slim bar, not a big panel, so the chat and the camera stay in view. */}
      {voiceMode && (
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2 md:px-8">
          <VoiceOrb state={orbState} size={36} onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={busy} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">{agentName(tenant)} · {tenant.name}</p>
            <p className="truncate text-[12px] text-muted-foreground" aria-live="polite">{voice.listening ? "Listening. Tap the dot when you're done." : voice.speaking ? "Speaking. Tap the dot to cut in." : busy ? "Thinking…" : "On the call"}</p>
          </div>
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
              ) : m.role === "owner" ? (
                <div className="space-y-1.5" data-testid="owner-message">
                  <p className="text-[13px] font-medium text-primary">{m.by || tenant.name} · a person from the team</p>
                  <p className="max-w-[85%] rounded-lg rounded-bl-sm border border-[hsl(var(--primary)/0.4)] bg-card px-4 py-2.5 text-[16px] leading-relaxed">{m.content}</p>
                </div>
              ) : (
                <div className="space-y-4" data-testid="assistant-message">
                  <p className="text-[13px] text-muted-foreground">{tenant.name}</p>
                  <p className="text-[17px] leading-relaxed">
                    {voiceMode && voice.spoken.text === m.content && voice.spoken.upTo < m.content.length && i === c.messages.length - 1 ? (
                      // On a call, each word appears as it is spoken; the rest keeps its space so nothing jumps.
                      <>
                        {m.content.slice(0, voice.spoken.upTo)}
                        <span className="opacity-0" aria-hidden>{m.content.slice(voice.spoken.upTo)}</span>
                      </>
                    ) : (
                      m.content
                    )}
                  </p>
                  <AgentChecks trace={m.trace} />
                  {i === c.messages.findIndex((x) => x.role === "assistant") && <TrustChips tenant={tenant} />}
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
                      <p className="text-[15px] text-muted-foreground">{prof.onSite ? c.customer.address : `${tenant.name}, ${tenant.serviceArea}`}</p>
                      {c.quote && (
                        <p className="mt-3 text-[14px]">
                          {medspa ? "Plan status" : "Quote status"}: <span className="font-medium">{STATUS_LABEL[c.quote.status] || "Draft"}</span>
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
          {busy && draft?.assessment && (
            <div className="space-y-2" aria-label="Drafted card, being checked">
              <AssessmentCard segmentation={c.segmentation} measurement={c.measurement} assessment={draft.assessment} quote={null} tenant={tenant} compact />
              <p className="text-[13px] text-muted-foreground">Drafted. A second check runs before any price is shown.</p>
            </div>
          )}
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
          {showGuide && <CaptureGuide onPhoto={onPhoto} onLiveEye={() => setLiveEye(true)} onSample={onSample} onSkip={medspa ? null : onSkipPhoto} busy={busy} spa={spa} trade={tenant.trade} />}
          {!prof.personPhoto && !c.photo && !c.description && !busy && !pending && !liveEye && c.messages.length <= 2 && (
            <div className="fd-card p-4">
              <SamplePhotos onPick={onSample} busy={busy} compact trade={tenant.trade} />
              <p className="mt-2 text-[12px] text-muted-foreground">Fills in a made-up description and address, then runs the photo through the same outline, assessment and draft quote as a real one.</p>
            </div>
          )}
          {wantsInsurance(c, tenant, stormRuns) && !busy && <InsuranceCard c={c} />}
          {c.returning && <p className="rounded-lg border border-border bg-card px-4 py-3 text-[14px] text-muted-foreground" data-testid="returning-note">Welcome back. We've linked this to your earlier enquiry, so the team has your history.</p>}
          {c.takenOver && <p className="rounded-lg border border-border bg-card px-4 py-3 text-[14px] text-muted-foreground" data-testid="takeover-note">You're chatting with a person from {tenant.name}. {agentName(tenant)} is paused, and the team replies here.</p>}
          {showSlots && <SlotPicker caseId={c.id} tenant={tenant} address={c.customer.address} onBooked={onBooked} />}
          <div ref={endRef} />
        </div>
      </div>

      <Composer value={input} onChange={setInput} onSend={() => send()} onPhoto={onPhoto} voice={voice} busy={busy} placeholder={medspa ? "Tell us what you've noticed…" : spa && !prof.onSite ? "Tell us what you'd like…" : "Describe the problem…"} />
    </div>
  );
}

// What the customer sees of the quote: the range only once the job verifies or a person signs it off.
function customerQuote(c, tenant, slots) {
  if (!c.quote || c.quote.low == null) return c.quote; // no range to hold back
  if (customerMaySee(c, jobStatus(c, { tenant, slots }))) return c.quote;
  return { ...c.quote, low: null, high: null, total: null, lines: [], reason: `A ${tenant.words?.pro || "person"} is checking this one before a range is shared. Nothing is lost: book a time and they'll bring it.` };
}

// The chat button on a website that has no desk yet (or not in this browser and not published).
function SiteNotReady({ host, loading }) {
  return (
    <div className="grid min-h-[100svh] place-items-center bg-background px-6">
      <div className="max-w-[440px] text-center">
        {loading ? (
          <p className="flex items-center justify-center gap-2 text-[15px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Connecting you to {host}…</p>
        ) : (
          <>
            <Globe className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">This front desk isn't switched on yet</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">{host} hasn't launched its AI front desk. Please call the business for now.</p>
            <p className="mt-6 text-[13px] text-muted-foreground">Own this business?</p>
            <Link to={`/setup?url=${encodeURIComponent(`https://${host}`)}`} className="fd-btn-primary mt-2 inline-flex h-11 px-5">Set it up from your website <ArrowUpRight className="h-4 w-4" /></Link>
          </>
        )}
      </div>
    </div>
  );
}
