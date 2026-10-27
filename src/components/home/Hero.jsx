
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { heroSlides } from "@/lib/artisanData";
import HeroSearch from "@/components/home/HeroSearch";
import Accent from "@/components/shared/Accent";
import { Image } from "@/components/ui/image";

const ease = [0.2, 0.8, 0.2, 1];

export default function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, []);
  const slide = heroSlides[i];
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-foreground">
      <AnimatePresence>
        <motion.div
          key={slide.src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.0 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.6, ease }, scale: { duration: 7.5, ease: "linear" } }}>
          
          <Image src={slide.src} alt={slide.caption} className="h-full w-full" fittingType="fill" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
      <div className="blueprint-lines pointer-events-none absolute inset-0 opacity-30 invert" />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-14 pt-40 md:px-12 md:pb-20">
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}
          className="mb-6 font-spec text-xs uppercase text-white/75">
          
          AI triage · Verified local artisans
        </motion.p>
        <div className="grid items-end gap-6 md:grid-cols-[1.4fr_1fr]">
          <motion.h1
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.15, ease }}
            className="text-[clamp(2.6rem,7.5vw,7rem)] font-light leading-[0.98] text-white">
            
            Know the fix.<br /><Accent>Meet the hands.</Accent>
          </motion.h1>
          <div className="md:pb-3">
            <p className="font-spec text-xs uppercase text-white/70">Match with</p>
            <div className="relative h-[3.2rem] overflow-hidden md:h-[4rem]">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={slide.word}
                  initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: 0.9, ease }}
                  className="absolute inset-x-0 italic text-white md:text-5xl text-5xl [font-family:'Instrument_Serif',_Georgia,_serif]">
                  
                  {slide.word}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <p className="mt-6 max-w-xl text-lg text-white/80">
          Snap a photo of the damage. Aura diagnoses it, itemises the cost, and routes the job to the right trade nearby — in seconds.
        </p>
        <div className="mt-10 flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <HeroSearch />
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {heroSlides.map((s, idx) =>
              <button key={s.word} aria-label={s.word} onClick={() => setI(idx)} className="h-px w-8 overflow-hidden bg-white/30">
                  <span className={`block h-full bg-white transition-all ease-linear ${idx === i ? "w-full duration-[6000ms]" : idx < i ? "w-full duration-0" : "w-0 duration-0"}`} />
                </button>
              )}
            </div>
            <span className="font-spec text-[11px] uppercase text-white/70">{slide.caption}</span>
          </div>
        </div>
      </div>
    </section>);

}