import { Link } from "react-router-dom";
import Reveal from "@/components/shared/Reveal";

const points = [
  ["Seconds", "First answer", "You're heard straight away, even while the crew is on a roof."],
  ["Shown", "Our working", "The outline, the finding, the measurement basis and the quote maths are all on the card."],
  ["Human", "Final say", "Nothing is sent to you without a person at the desk approving it first."],
];

export default function WhyUs() {
  return (
    <section id="why" className="bg-[hsl(var(--deep))] px-6 py-20 text-background md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="font-spec text-[11px] uppercase text-primary">Why it's different</p>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">An honest first look, before anyone climbs a ladder.</h2>
          <div className="mt-10 divide-y divide-white/15 border-y border-white/15">
            {points.map(([big, t, d]) => (
              <div key={t} className="grid grid-cols-[7rem_1fr] items-baseline gap-4 py-5">
                <span className="font-heading text-3xl text-primary">{big}</span>
                <div>
                  <h3 className="text-lg">{t}</h3>
                  <p className="mt-1 text-[15px] text-background/65">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="fd-card border-white/15 bg-white/5 p-8">
          <p className="font-spec text-[11px] uppercase text-background/60">Ready when you are</p>
          <h3 className="mt-2 text-2xl">Describe the problem. Add a photo. That's it.</h3>
          <p className="mt-2 text-[15px] text-background/65">No account, no form. A draft range and an inspection slot in a few minutes.</p>
          <Link to="/chat" className="fd-btn-primary mt-6">Start now</Link>
        </Reveal>
      </div>
    </section>
  );
}
