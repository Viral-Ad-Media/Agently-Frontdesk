
import { motion } from "framer-motion";
import { ScanLine, Vault } from "lucide-react";
import Reveal from "@/components/shared/Reveal";
import Accent from "@/components/shared/Accent";

const items = [
  {
    icon: ScanLine,
    title: "LiDAR spatial depth",
    text: "Future versions read the depth sensor on iPhone and Samsung phones. Scan a room and the exact square footage for tiling or drywall arrives without a tape measure — and without human measurement error.",
  },
  {
    icon: Vault,
    title: "Escrow & trust verification",
    text: "Funds held in escrow until the customer signs off on the finished work, closing the trust gap between informal artisans and homeowners.",
  },
];

export default function ComingSoon() {
  return (
    <section className="border-t border-border px-6 py-[10vw] md:px-12">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="font-spec text-xs uppercase text-primary">Coming soon</p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2.2rem,5vw,4.5rem)] font-light leading-[1.02]">
            Where this <Accent>is heading.</Accent>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.12} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <it.icon className="h-8 w-8 text-primary transition-transform duration-700 ease-viscous group-hover:-translate-y-1" strokeWidth={1.25} />
              <h3 className="mt-8 text-3xl">{it.title}</h3>
              <p className="mt-3 text-[15px] text-muted-foreground">{it.text}</p>
              <span className="mt-6 inline-block rounded-full border border-primary/40 px-3 py-1 font-spec text-[10px] uppercase text-primary">Coming soon</span>
            </Reveal>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-10 max-w-2xl font-spec text-[11px] uppercase text-muted-foreground"
        >
          Pitch highlights · not yet available in this build
        </motion.p>
      </div>
    </section>
  );
}