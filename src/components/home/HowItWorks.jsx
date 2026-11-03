import Reveal from "@/components/shared/Reveal";
import { useStore } from "@/lib/store";
import { siteCopy } from "@/config/siteCopy";

// A split, not a row of icon cards: the claim on the left, the four steps as a plain list on the right.
export default function HowItWorks() {
  const tenant = useStore((s) => s.tenant);
  const copy = siteCopy(tenant.trade);
  const steps = copy.steps;
  return (
    <section id="how" className="px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <Reveal>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">How it works</h2>
          <p className="mt-4 max-w-md text-lg text-foreground">
            {copy.howLead}
          </p>
        </Reveal>
        <ol className="space-y-2">
          {steps.map(([title, text], i) => (
            <Reveal key={title} delay={i * 0.06} className="grid gap-2 py-5 sm:grid-cols-[1fr_1.6fr] sm:gap-8">
              <h3 className="text-xl">{title}</h3>
              <p className="text-[16px] text-foreground">{text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
