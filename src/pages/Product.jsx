import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Camera,
  Check,
  ChevronDown,
  CloudLightning,
  FileText,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import Reveal from "@/components/shared/Reveal";

// Agently product site, laid out like a modern developer-tool SaaS page (21st.dev/mcp as the reference):
// dark canvas, one accent, hairline borders, a live product mock in the hero, numbered steps, a bento grid,
// a real screenshot of the owner dashboard, FAQ and a closing call to action. Everything shown is in the app.

const EASE = [0.32, 0.72, 0, 1];
const SITE = "/site";

const MODELS = ["Muse Spark", "SAM 3.1", "Muse Image", "Muse Voice Transcribe"];

const FAQ = [
  ["Does it make up prices?", "No. Roofing quotes come from the owner's own rate card and the measured damage. Med spa prices come only from the published menu. If there is no match, the desk says so and books a consultation instead."],
  ["Does anything go to a customer without me?", "Every price, plan and re-opener waits for the owner's tap. The desk drafts; you approve and send."],
  ["What does it run on?", "Meta models: Muse Spark for conversation and drafting, SAM 3.1 to outline damage in photos, Muse Voice Transcribe for calls. A labelled mock provider runs the same flow offline for rehearsals."],
  ["How long does setup take?", "Paste your website. The desk reads it, lists the services, prices and service area it found with the quote it found them in, and you check each fact before launch. Usually under a minute."],
  ["Which businesses does it support?", "Roofing and med spas today. Each trade has its own rules: roofers get photo outlines, measured estimates, storm alerts and claim packs; med spas get consent, clinician review and published-menu pricing."],
  ["What happens when a storm hits?", "Storm radar reads live National Weather Service alerts, finds the customers inside the warning area and drafts a personal check-in for each. Anyone who opted out is never contacted."],
];

function Window({ title, children, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#111113] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ${className}`}>
      <div className="flex h-10 items-center gap-2 border-b border-white/[0.08] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 truncate font-mono text-[12px] text-white/40">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Bubble({ from = "customer", delay = 0, children }) {
  const me = from === "customer";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: EASE }} className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${me ? "rounded-br-md bg-[hsl(16_88%_54%)] text-white" : "rounded-bl-md bg-white/[0.07] text-white/85"}`}>{children}</div>
    </motion.div>
  );
}

function HeroDemo() {
  return (
    <Window title="summitridgeroofing.com · front desk" className="text-left">
      <div className="grid md:grid-cols-[1.25fr_1fr]">
        <div className="space-y-2.5 p-4 sm:p-5">
          <Bubble delay={0.5}>Water's coming through the bedroom ceiling since the storm last night.</Bubble>
          <Bubble from="desk" delay={1.1}>Sorry to hear that. Can you send a photo of the roof above that room?</Bubble>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.7, ease: EASE }} className="flex justify-end">
            <div className="relative h-28 w-44 overflow-hidden rounded-2xl rounded-br-md bg-gradient-to-br from-[#3a3f47] via-[#2a2e35] to-[#1c1f24]">
              <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(170deg,transparent_0_9px,rgba(255,255,255,0.08)_9px_10px)]" />
              <svg viewBox="0 0 176 112" className="absolute inset-0 h-full w-full" aria-hidden>
                <motion.polygon points="58,34 118,28 132,70 74,82" fill="hsl(16 88% 54% / 0.28)" stroke="hsl(16 88% 60%)" strokeWidth="2" strokeLinejoin="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: 2.3, ease: EASE }} />
              </svg>
              <span className="absolute bottom-1.5 left-2 rounded-full bg-black/50 px-2 py-0.5 font-mono text-[10px] text-white/80">SAM 3.1 outline</span>
            </div>
          </motion.div>
          <Bubble from="desk" delay={3.0}>
            Lifted shingles over about <b className="text-white">42 sq ft</b>. Draft range <b className="text-white">$650 – $1,100</b>, confirmed after the free inspection. Tuesday 9:00 AM is open.
          </Bubble>
          <Bubble delay={3.6}>Tuesday works.</Bubble>
        </div>
        <div className="hidden border-l border-white/[0.08] p-5 md:block">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Owner sees</p>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 3.9, ease: EASE }} className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-white">New lead</p>
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Moderate</span>
            </div>
            <p className="mt-1 text-[12px] text-white/50">14 Larkspur Lane · photo outlined</p>
            <p className="mt-3 text-[20px] font-semibold tracking-tight text-white">$650 – $1,100</p>
            <p className="text-[11px] text-white/40">from your rate card · 82% confidence</p>
            <div className="mt-4 flex gap-2">
              <span className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-white text-[12px] font-semibold text-black"><Check className="h-3.5 w-3.5" /> Approve</span>
              <span className="inline-flex h-8 flex-1 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white">Edit</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 4.4, ease: EASE }} className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-center leading-none">
              <span>
                <span className="block text-[9px] font-semibold uppercase text-[hsl(16_88%_60%)]">Tue</span>
                <span className="block text-[14px] font-semibold text-white">10</span>
              </span>
            </span>
            <div>
              <p className="text-[13px] font-medium text-white">Inspection booked</p>
              <p className="text-[11px] text-white/45">9:00 AM · slot closed for everyone else</p>
            </div>
          </motion.div>
        </div>
      </div>
    </Window>
  );
}

function SectionHead({ eyebrow, title, text, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="font-mono text-[12px] text-[hsl(16_88%_62%)]">{eyebrow}</p>}
        <h2 className="mt-2 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">{title}</h2>
        {text && <p className="mt-3 text-[16px] leading-relaxed text-white/55">{text}</p>}
      </div>
      {action}
    </div>
  );
}

function Tile({ icon: Icon, title, text, className = "", children, delay = 0 }) {
  return (
    <Reveal delay={delay} y={24} className={className}>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111113] p-5 transition-colors duration-300 hover:border-white/20 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(400px_circle_at_20%_0%,rgba(241,90,36,0.10),transparent_60%)]" />
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-white">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">{text}</p>
        {children && <div className="relative mt-5 flex-1">{children}</div>}
      </div>
    </Reveal>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="text-[16px] font-medium text-white">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
        <p className="max-w-3xl pb-5 text-[15px] leading-relaxed text-white/55">{a}</p>
      </motion.div>
    </div>
  );
}

export default function Product() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white antialiased selection:bg-[hsl(16_88%_54%)]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#09090b]/70 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(16_88%_54%)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M6 10v9h12v-9" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Agently</span>
          </Link>
          <div className="hidden items-center gap-5 text-[14px] text-white/55 md:flex">
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#trades" className="transition-colors hover:text-white">Trades</a>
            <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/frontdesk" className="hidden h-9 items-center rounded-full px-3 text-[14px] text-white/70 transition-colors hover:text-white sm:inline-flex">Owner dashboard</Link>
            <Link to="/setup" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-black transition-transform duration-300 active:scale-95">
              Set up free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] [background:radial-gradient(60%_50%_at_50%_0%,rgba(241,90,36,0.22),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
          <div className="relative mx-auto max-w-[1200px] px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[13px] text-white/70">
              <span className="rounded-full bg-[hsl(16_88%_54%)] px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
              Storm radar and claim packs for roofers
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: EASE }} className="mx-auto mt-6 max-w-[16ch] text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[68px]">
              The front desk that never misses a job.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16, ease: EASE }} className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-white/60 sm:text-[18px]">
              Agently answers every chat and call, reads the photo, drafts a fair price from your own rates and books the visit. You approve, it sends.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24, ease: EASE }} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={SITE} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-black transition-transform duration-300 hover:bg-white/90 active:scale-95 sm:w-auto">
                Try it as a customer <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/frontdesk" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[15px] font-semibold text-white transition-colors duration-300 hover:bg-white/[0.08] active:scale-95 sm:w-auto">
                <LayoutDashboard className="h-4 w-4" /> Open the owner dashboard
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.36 }} className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {[
                [MessageCircle, "Chat"],
                [Phone, "Calls"],
                [Camera, "Photos"],
                [CloudLightning, "Storm alerts"],
                [Globe, "Built from your site"],
              ].map(([Icon, label]) => (
                <span key={label} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[13px] text-white/65">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} /> {label}
                </span>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: EASE }} className="relative mx-auto mt-14 max-w-[980px]">
              <div className="pointer-events-none absolute -inset-x-10 -top-10 h-40 [background:radial-gradient(50%_60%_at_50%_100%,rgba(241,90,36,0.25),transparent)] blur-2xl" />
              <HeroDemo />
            </motion.div>
          </div>
        </section>

        {/* Models strip */}
        <section className="border-y border-white/[0.08]">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
            <p className="text-[13px] text-white/45">Runs on Meta models</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {MODELS.map((m) => (
                <span key={m} className="font-mono text-[14px] text-white/70">{m}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <Reveal y={24}>
            <SectionHead eyebrow="// how it works" title="Live in three steps." text="No forms to fill in. The desk learns your business from your own website, then works every channel your customers already use." />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Paste your website", "The desk reads your services, prices and service area, and shows the line it found each one in.", <code key="c" className="block rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[12.5px] text-white/75"><span className="text-white/35">$</span> agently setup <span className="text-[hsl(16_88%_62%)]">summitridgeroofing.com</span></code>],
              ["02", "Customers reach out", "By chat, phone or photo, day or night. The desk asks the right questions, outlines the damage and offers a real open slot.", <div key="c" className="flex flex-wrap gap-1.5">{["chat", "call", "photo", "storm check-in"].map((t) => <span key={t} className="rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[12px] text-white/70">{t}</span>)}</div>],
              ["03", "You approve, it sends", "Every price and message waits for your tap. Approve on your phone between jobs and the customer gets it at once.", <div key="c" className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20"><Check className="h-3 w-3 text-emerald-400" /></span><span className="font-mono text-[12.5px] text-white/75">quote approved · sent 9:41</span></div>],
            ].map(([n, title, text, extra], i) => (
              <Reveal key={n} delay={i * 0.08} y={24}>
                <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#111113] p-6">
                  <span className="font-mono text-[13px] text-white/35">{n}</span>
                  <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">{title}</h3>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed text-white/55">{text}</p>
                  <div className="mt-5">{extra}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Bento */}
        <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal y={24}>
            <SectionHead eyebrow="// features" title="Everything a great front desk does. All day, every day." />
          </Reveal>
          <div className="mt-10 grid auto-rows-[minmax(0,auto)] gap-4 md:grid-cols-6">
            <Tile icon={Camera} title="Sees the damage" text="SAM 3.1 outlines the problem in the customer's photo and measures it, so the draft price is grounded in what is actually there." className="md:col-span-4">
              <div className="grid h-full min-h-[150px] grid-cols-3 gap-2">
                {["Lifted shingles", "Flashing gap", "Ceiling stain"].map((t, i) => (
                  <div key={t} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#2b2f36] to-[#17191d]">
                    <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full" aria-hidden>
                      <polygon points={["30,22 70,18 78,50 38,58", "20,30 60,26 64,40 24,46", "40,20 70,30 62,60 30,52"][i]} fill="hsl(16 88% 54% / 0.25)" stroke="hsl(16 88% 60%)" strokeWidth="1.5" />
                    </svg>
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white/80">{t}</span>
                  </div>
                ))}
              </div>
            </Tile>
            <Tile icon={ShieldCheck} title="You approve every price" text="Drafts only. Nothing reaches a customer until you tap approve." className="md:col-span-2" delay={0.05}>
              <div className="space-y-2">
                {[["Draft", "bg-white/10 text-white/70"], ["Approved", "bg-white text-black"], ["Sent", "bg-emerald-500/20 text-emerald-300"]].map(([s, cls], i) => (
                  <div key={s} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px]">
                    <span className="text-white/60">Quote #{1042 + i}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{s}</span>
                  </div>
                ))}
              </div>
            </Tile>
            <Tile icon={CloudLightning} title="Storm radar" text="Live weather-service warnings, matched to your customers' addresses. One tap drafts a check-in for everyone in the path." className="md:col-span-2" delay={0.05}>
              <div className="relative h-[130px] overflow-hidden rounded-xl bg-[#17191d]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />
                <svg viewBox="0 0 200 130" className="absolute inset-0 h-full w-full" aria-hidden>
                  <polygon points="40,40 150,30 165,85 55,100" fill="hsl(16 88% 54% / 0.18)" stroke="hsl(16 88% 60%)" strokeWidth="1.5" strokeDasharray="6 4" className="motion-safe:animate-[storm-march_1.2s_linear_infinite]" />
                  {[[70, 60], [95, 70], [120, 55], [135, 75], [85, 85], [30, 110], [175, 20]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="4" fill={i < 5 ? "hsl(16 88% 60%)" : "rgba(255,255,255,0.35)"} />
                  ))}
                </svg>
              </div>
            </Tile>
            <Tile icon={FileText} title="Insurance claim pack" text="Weather on record, the outlined photos, the estimate and a timeline, ready to print for the adjuster." className="md:col-span-2" delay={0.1}>
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[11.5px] text-white/60">
                <p><span className="text-white/35">storm</span> 1.75 in hail · 70 mph</p>
                <p><span className="text-white/35">photos</span> 3 outlined</p>
                <p><span className="text-white/35">estimate</span> $650 – $1,100</p>
              </div>
            </Tile>
            <Tile icon={RotateCcw} title="Wakes up dead leads" text="A personal note to every old enquiry, written from its real history. Opt-outs are never contacted." className="md:col-span-2" delay={0.15}>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-[36px] font-semibold leading-none tracking-[-0.04em]">22</p>
                  <p className="mt-1 text-[12px] text-white/45">re-openers drafted</p>
                </div>
                <div>
                  <p className="text-[36px] font-semibold leading-none tracking-[-0.04em] text-white/40">3</p>
                  <p className="mt-1 text-[12px] text-white/45">opted out, skipped</p>
                </div>
              </div>
            </Tile>
            <Tile icon={Phone} title="Answers the phone" text="Calls are transcribed by Muse Voice Transcribe and become the same case as a chat." className="md:col-span-3" delay={0.05}>
              <div className="flex h-12 items-center gap-[3px]">
                {Array.from({ length: 48 }).map((_, i) => (
                  <span key={i} className="w-full rounded-full bg-white/20" style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%` }} />
                ))}
              </div>
            </Tile>
            <Tile icon={CalendarCheck} title="Never double-books" text="Chat and dashboard share one calendar. A taken slot is never offered twice." className="md:col-span-3" delay={0.1}>
              <div className="grid grid-cols-5 gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
                  <div key={d} className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                    <p className="text-[10px] uppercase text-white/40">{d}</p>
                    <p className={`mt-1 text-[12px] font-semibold ${i === 1 ? "text-[hsl(16_88%_62%)]" : "text-white/70"}`}>{i === 1 ? "Booked" : `${2 + i} open`}</p>
                  </div>
                ))}
              </div>
            </Tile>
          </div>
        </section>

        {/* Dashboard screenshot */}
        <section className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal y={24}>
            <SectionHead
              eyebrow="// the owner's view"
              title="One screen for the whole day."
              text="Leads, calendar, calls, storm radar and dead leads, on your phone or your desk."
              action={
                <Link to="/frontdesk" className="inline-flex h-10 items-center gap-1.5 self-start rounded-full border border-white/15 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-white/[0.06] sm:self-auto">
                  Open it <ArrowUpRight className="h-4 w-4" />
                </Link>
              }
            />
          </Reveal>
          <Reveal y={40} delay={0.1}>
            <Window title="agently.app/frontdesk" className="mt-10">
              <div className="relative max-h-[560px] overflow-hidden bg-[#f2f2f7]">
                <img src="/shots/dashboard.webp" alt="The Agently owner dashboard: today's numbers, leads, calendar, storm radar and phone calls" width="1200" height="1300" loading="lazy" className="block w-full" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#111113] to-transparent" />
              </div>
            </Window>
          </Reveal>
        </section>

        {/* Trades */}
        <section id="trades" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal y={24}>
            <SectionHead eyebrow="// trades" title="Built for the work, not a generic chatbot." />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              [Wrench, "Roofing", "Summit Ridge Roofing", ["Photo outline and measured area", "Estimate from your own rate card", "Storm radar and claim packs", "Free inspection booking"]],
              [Sparkles, "Med spa", "Luma Skin Studio", ["Photo consent before anything else", "Prices only from your published menu", "Clinician approves every plan", "Consultation booking"]],
            ].map(([Icon, trade, demo, items], i) => (
              <Reveal key={trade} delay={i * 0.08} y={24}>
                <div className="h-full rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"><Icon className="h-5 w-5 text-white/80" strokeWidth={1.75} /></span>
                    <span className="font-mono text-[12px] text-white/40">demo: {demo}</span>
                  </div>
                  <h3 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">{trade}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {items.map((it) => (
                      <li key={it} className="flex items-center gap-2.5 text-[15px] text-white/70">
                        <Check className="h-4 w-4 shrink-0 text-[hsl(16_88%_62%)]" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
            <Reveal y={24}>
              <SectionHead eyebrow="// faq" title="Questions owners ask." />
            </Reveal>
            <div className="border-t border-white/10">
              {FAQ.map(([q, a]) => (
                <Faq key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
          <Reveal y={30}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111113] px-6 py-16 text-center sm:py-20">
              <div className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_80%_at_50%_100%,rgba(241,90,36,0.25),transparent_70%)]" />
              <h2 className="relative mx-auto max-w-[18ch] text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[48px]">Stop losing jobs to voicemail.</h2>
              <p className="relative mx-auto mt-4 max-w-[48ch] text-[16px] text-white/60">Paste your website and your front desk is ready to review in about a minute.</p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/setup" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-black transition-transform duration-300 active:scale-95">
                  Build my front desk <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to={SITE} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white/80 transition-colors hover:text-white">
                  See the customer side
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-4">
          <div>
            <p className="text-[15px] font-semibold">Agently</p>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-white/45">An AI front desk for roofers and med spas, on Meta models.</p>
          </div>
          {[
            ["Product", [["Customer view", SITE], ["Owner dashboard", "/frontdesk"], ["Set up from a website", "/setup"]]],
            ["Trades", [["Roofing", SITE], ["Med spa", "/chat?tenant=luma-skin"]]],
            ["Learn", [["How it works", "#how"], ["Features", "#features"], ["FAQ", "#faq"]]],
          ].map(([h, links]) => (
            <div key={h}>
              <p className="text-[13px] font-medium text-white/40">{h}</p>
              <ul className="mt-3 space-y-2">
                {links.map(([label, to]) =>
                  <li key={label}>{to.startsWith("#") ? <a href={to} className="text-[14px] text-white/70 transition-colors hover:text-white">{label}</a> : <Link to={to} className="text-[14px] text-white/70 transition-colors hover:text-white">{label}</Link>}</li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-[1200px] border-t border-white/[0.08] px-4 py-6 text-[12px] text-white/35 sm:px-6">© 2026 Agently · demo data is synthetic</div>
      </footer>
    </div>
  );
}
