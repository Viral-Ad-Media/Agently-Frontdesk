
import { Camera, ScanSearch, GitFork, MapPin } from "lucide-react";
import Reveal from "@/components/shared/Reveal";
import Accent from "@/components/shared/Accent";

const steps = [
  { icon: Camera, n: "01", title: "Snap & describe", text: "Photograph the damage and tell Aura what you noticed — by typing or simply speaking." },
  { icon: ScanSearch, n: "02", title: "AI diagnosis", text: "Aura names the trade, the severity and an itemised materials and labour estimate." },
  { icon: GitFork, n: "03", title: "DIY or pro", text: "A clear verdict: safe to fix yourself with steps, or a professional is required." },
  { icon: MapPin, n: "04", title: "Artisan match", text: "Vetted artisans nearby, routed by real distance, quote and community rating." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative px-6 py-[10vw] md:px-12">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="font-spec text-xs uppercase text-primary">The flow · under two minutes</p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2.2rem,5vw,4.5rem)] font-light leading-[1.02]">
            From a blurry photo to a booked <Accent>craftsperson.</Accent>
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal
              key={s.n}
              delay={i * 0.1}
              className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-secondary to-card p-8 shadow-[0_18px_50px_-40px_hsl(var(--foreground))] transition-all duration-700 ease-viscous hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_36px_70px_-38px_hsl(var(--primary))]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/15 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="relative flex items-start justify-between">
                <span className="font-spec text-xs text-muted-foreground">{s.n}</span>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-inner">
                  <s.icon className="h-7 w-7 text-primary transition-transform duration-700 ease-viscous group-hover:-translate-y-1 group-hover:scale-110" strokeWidth={1.25} />
                </span>
              </div>
              <h3 className="relative mt-10 text-2xl">{s.title}</h3>
              <p className="relative mt-3 text-[15px] text-muted-foreground">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}