import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { artisans, trades } from "@/lib/artisanData";
import ArtisanCard from "@/components/home/ArtisanCard";
import Reveal from "@/components/shared/Reveal";
import Accent from "@/components/shared/Accent";

const offsets = ["", "md:mt-20", "", "md:mt-20"];

export default function ArtisanGrid() {
  const [params] = useSearchParams();
  const [trade, setTrade] = useState(trades.includes(params.get("trade")) ? params.get("trade") : "All");
  const list = artisans.filter((a) => trade === "All" || a.tradeKey === trade);
  return (
    <section id="artisans" className="border-t border-border bg-secondary/40 px-6 py-[10vw] md:px-12">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="font-spec text-xs uppercase text-primary">Vetted · routed nearest first</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.5rem)] font-light leading-[1.02]">
              The people <Accent>behind the work.</Accent>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", ...trades].map((t) => (
              <button
                key={t}
                onClick={() => setTrade(t)}
                className={`rounded-full border px-4 py-2 font-spec text-[11px] uppercase transition-all duration-500 ease-viscous hover:-translate-y-0.5 ${
                  trade === t ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Reveal>
        <motion.div layout className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {list.map((a, i) => (
              <motion.div
                layout key={a.id}
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                className={trade === "All" ? offsets[i] : ""}
              >
                <ArtisanCard a={a} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        {list.length === 0 && (
          <p className="mt-16 text-muted-foreground">No {trade.toLowerCase()} artisans in your area yet — we're onboarding more every week.</p>
        )}
      </div>
    </section>
  );
}