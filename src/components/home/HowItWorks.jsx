import { Camera, ScanSearch, Receipt, CalendarCheck } from "lucide-react";
import Reveal from "@/components/shared/Reveal";

const steps = [
  { icon: Camera, n: "01", title: "Describe and add a photo", text: "Tell us what's happening and where. Then one photo of the damage, with something of known size in frame if you can." },
  { icon: ScanSearch, n: "02", title: "See the damage outlined", text: "We draw the damaged area on your photo, name what failed, and say how bad it is, with our confidence shown." },
  { icon: Receipt, n: "03", title: "Get a draft range", text: "Materials and labour at our published rates, as a range. A roofer confirms the final price on site." },
  { icon: CalendarCheck, n: "04", title: "Book the inspection", text: "Pick a real slot from our calendar in three taps. No account, no forms." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <p className="font-spec text-[11px] uppercase text-primary">How it works</p>
          <h2 className="mt-3 max-w-2xl text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">From a leak to a booked inspection, in minutes.</h2>
        </Reveal>
        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06} className="fd-card p-6">
              <div className="flex items-start justify-between">
                <span className="font-spec text-xs text-muted-foreground">{s.n}</span>
                <s.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="mt-8 text-xl">{s.title}</h3>
              <p className="mt-2 text-[15px] text-muted-foreground">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
