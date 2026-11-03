import { Link } from "react-router-dom";
import Reveal from "@/components/shared/Reveal";
import { useStore } from "@/lib/store";
import { siteCopy } from "@/config/siteCopy";

export default function WhyUs() {
  const tenant = useStore((s) => s.tenant);
  const copy = siteCopy(tenant.trade);
  const points = copy.points;
  return (
    <section id="why" className="bg-[hsl(var(--deep))] px-6 py-20 text-white md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">An honest first look.</h2>
          <div className="mt-10 space-y-2">
            {points.map(([big, t, d]) => (
              <div key={t} className="grid grid-cols-[7rem_1fr] items-baseline gap-4 py-5">
                <span className="font-heading text-3xl text-primary">{big}</span>
                <div>
                  <h3 className="text-lg">{t}</h3>
                  <p className="mt-1 text-[16px] text-white/70">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="bg-white/5 p-8">
          <h3 className="text-2xl">{copy.whyTitle}</h3>
          <p className="mt-2 text-[16px] text-white/70">{copy.whyText}</p>
          <Link to="/chat" className="fd-btn-primary mt-6">
            Start now
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
