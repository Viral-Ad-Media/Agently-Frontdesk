
import Reveal from "@/components/shared/Reveal";
import MercuryButton from "@/components/shared/MercuryButton";
import Accent from "@/components/shared/Accent";
import Orb from "@/components/aura/Orb";

const points = [
  ["$0", "Diagnostic visit fees", "Skip the $50–$150 call-out. Aura pre-inspects from your phone."],
  ["5", "Trades routed precisely", "Plumbing, electrical, carpentry, masonry and roofing — matched before dispatch."],
  ["100%", "Itemised estimates", "Materials and labour hours shown up front, so you can't be overcharged."],
];

export default function WhyUs() {
  return (
    <section id="why" className="relative overflow-hidden bg-foreground px-6 py-[10vw] text-background md:px-12">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <p className="font-spec text-xs uppercase text-primary">Why Agently Frontdesk</p>
          <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.5rem)] font-light leading-[1.02]">
            A contractor <Accent>in your pocket.</Accent>
          </h2>
          <div className="mt-12 divide-y divide-white/15 border-y border-white/15">
            {points.map(([big, t, d]) => (
              <div key={t} className="group grid grid-cols-[6rem_1fr] items-baseline gap-4 py-6 transition-all duration-500 ease-viscous hover:pl-3">
                <span className="font-heading text-5xl text-primary">{big}</span>
                <div><h3 className="text-xl">{t}</h3><p className="mt-1 text-[15px] text-background/65">{d}</p></div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.15} className="flex flex-col items-center text-center">
          <Orb state="speaking" size={260} />
          <h3 className="mt-14 text-3xl">Just talk to Aura.</h3>
          <p className="mt-3 max-w-sm text-background/65">Describe the problem out loud and hear a diagnosis, a cost and a verdict back.</p>
          <MercuryButton to="/aura" variant="terracotta" className="mt-8">Start a conversation</MercuryButton>
        </Reveal>
      </div>
    </section>
  );
}