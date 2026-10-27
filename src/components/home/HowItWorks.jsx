import Reveal from "@/components/shared/Reveal";
import { useStore } from "@/lib/store";

// A split, not a row of icon cards: the claim on the left, the four steps as a plain list on the right.
export default function HowItWorks() {
  const tenant = useStore((s) => s.tenant);
  const spa = tenant.trade === "medspa";
  const steps = spa
    ? [
        ["Tell us what you've noticed", "A sentence is enough. If you'd like to share a photo, you confirm consent first; it's optional."],
        ["See it matched to our services", "We note the area in your photo and match your concern to the treatments we actually offer, with the published price range."],
        ["A clinician reviews before anything is offered", "Nothing is recommended by software. A clinician reads your notes and flags anything to check with you."],
        ["Book your consultation", "Pick a real time from our calendar in three taps. No account, no forms."],
      ]
    : [
        ["Describe it and add a photo", "Tell us what's happening and where. Then one photo of the damage, with something of known size in frame if you can."],
        ["See the damage outlined", "We draw the damaged area on your photo, name what failed and say how bad it is, with our confidence shown."],
        ["Get a draft range", "Materials and labour at our published rates, as a range. A roofer confirms the final price on site."],
        ["Book the inspection", "Pick a real slot from our calendar in three taps. No account, no forms."],
      ];
  return (
    <section id="how" className="px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <Reveal>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">How it works</h2>
          <p className="mt-4 max-w-md text-lg text-foreground">
            {spa ? "From a question to a booked consultation, in minutes, with a person deciding every step that matters." : "From a leak to a booked inspection, in minutes, with a person approving every price before you see it."}
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
