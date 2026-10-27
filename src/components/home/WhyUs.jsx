import { Link } from "react-router-dom";
import Reveal from "@/components/shared/Reveal";
import { useStore } from "@/lib/store";

export default function WhyUs() {
  const tenant = useStore((s) => s.tenant);
  const spa = tenant.trade === "medspa";
  const points = spa
    ? [
        ["Seconds", "First answer", "You're heard straight away, even while the clinicians are with clients."],
        ["Honest", "Never a diagnosis", "We match what you describe to our own services and nothing more. No promises, no medical claims."],
        ["Human", "Final say", "A clinician approves every plan and every price before you see it."],
      ]
    : [
        ["Seconds", "First answer", "You're heard straight away, even while the crew is on a roof."],
        ["Shown", "Our working", "The outline, the finding, the measurement basis and the quote maths are all on the card."],
        ["Human", "Final say", "Nothing is sent to you without a person at the desk approving it first."],
      ];
  return (
    <section id="why" className="bg-[hsl(var(--deep))] px-6 py-20 text-background md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">An honest first look.</h2>
          <div className="mt-10 space-y-2">
            {points.map(([big, t, d]) => (
              <div key={t} className="grid grid-cols-[7rem_1fr] items-baseline gap-4 py-5">
                <span className="font-heading text-3xl text-primary">{big}</span>
                <div>
                  <h3 className="text-lg">{t}</h3>
                  <p className="mt-1 text-[16px] text-background">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="bg-white/5 p-8">
          <h3 className="text-2xl">{spa ? "Tell us what you've noticed. That's it." : "Describe the problem. Add a photo. That's it."}</h3>
          <p className="mt-2 text-[16px] text-background">{spa ? "No account, no form. A matched service, a price range and a consultation time in a few minutes." : "No account, no form. A draft range and an inspection slot in a few minutes."}</p>
          <Link to="/chat" className="fd-btn-primary mt-6">
            Start now
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
