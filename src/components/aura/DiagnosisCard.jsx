
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Hammer, AlertTriangle, Send, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const tiers = [
  { label: "Budget", mat: 0.7, lab: 0.85, note: "Economy materials, standard fitting" },
  { label: "Standard", mat: 1, lab: 1, note: "Trade-grade materials, same fitter" },
  { label: "Premium", mat: 1.6, lab: 1.3, note: "Top-spec materials, senior fitter" },
];

const money = (n) => `$${Math.round(n).toLocaleString()}`;

export default function DiagnosisCard({ d, emergency }) {
  const [tier, setTier] = useState(1);
  const t = tiers[tier];
  const materials = d.materials || [];
  const materialsBase = materials.reduce((s, m) => s + (m.estimated_cost_usd || 0), 0);
  const laborBase = (d.labor_hours_estimated || 0) * (d.labor_rate_per_hour_usd || 0);
  const base = materialsBase + laborBase || 1;
  const factor = (materialsBase * t.mat + laborBase * t.lab) / base;
  const diy = d.is_diy_feasible;
  const blocked = emergency?.is_emergency;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      className="my-6 overflow-hidden rounded-2xl border border-border bg-background"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/60 px-5 py-3 font-spec text-[10px] uppercase">
        <span className="rounded-full bg-foreground px-3 py-1 text-background">{d.trade_category}</span>
        <span className="rounded-full border border-border px-3 py-1">{d.severity}</span>
        <span className={`ml-auto flex items-center gap-1 ${diy ? "text-emerald-700" : "text-primary"}`}>
          {diy ? <ShieldCheck className="h-3.5 w-3.5" /> : <Hammer className="h-3.5 w-3.5" />}
          {diy ? "DIY safe" : "Professional required"}
        </span>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <h3 className="text-2xl">{d.issue_title}</h3>
          <p className="mt-1 text-[15px] text-muted-foreground">{d.description}</p>
        </div>
        {d.steps?.length > 0 && (
          <ol className="space-y-2 text-[15px]">
            {d.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-spec text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ol>
        )}
        {d.safety_warning && (
          <p className="flex gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {d.safety_warning}
          </p>
        )}

        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-spec text-[10px] uppercase tracking-widest text-primary">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Scope adjuster
            </span>
            <span className="font-spec text-[10px] uppercase text-muted-foreground">{t.note}</span>
          </div>
          <Slider className="mt-4" min={0} max={2} step={1} value={[tier]} onValueChange={(v) => setTier(v[0])} />
          <div className="mt-2 flex justify-between font-spec text-[10px] uppercase">
            {tiers.map((x, i) => (
              <button key={x.label} onClick={() => setTier(i)} className={i === tier ? "text-primary" : "text-muted-foreground"}>
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-dashed border-border pt-4 font-spec text-xs">
          {materials.map((m, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="uppercase">{m.item}</span>
              <span>{money((m.estimated_cost_usd || 0) * t.mat)}</span>
            </div>
          ))}
          <div className="flex justify-between py-1 text-muted-foreground">
            <span className="uppercase">
              Labour · {d.labor_hours_estimated}h @ {money((d.labor_rate_per_hour_usd || 0) * t.lab)}/h
            </span>
            <span>{money(laborBase * t.lab)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-3 text-base">
            <span className="uppercase">Estimate · {t.label}</span>
            <span className="text-primary">
              {money(d.total_estimated_low_usd * factor)} – {money(d.total_estimated_high_usd * factor)}
            </span>
          </div>
        </div>

        {blocked ? (
          <p className="font-spec text-[11px] uppercase text-destructive">Artisan bids are held while this is an emergency.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/?trade=${encodeURIComponent(d.trade_category)}#artisans`}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-500 ease-viscous hover:-translate-y-0.5 hover:bg-foreground"
            >
              Match me with a {d.trade_category.toLowerCase()} artisan
            </Link>
            <Link
              to={`/dispatch?trade=${encodeURIComponent(d.trade_category)}`}
              className="group inline-flex items-center gap-2 rounded-full border border-foreground/70 px-6 py-3 text-sm font-medium transition-all duration-500 ease-viscous hover:-translate-y-0.5 hover:bg-foreground hover:text-background"
            >
              <Send className="h-4 w-4 transition-transform duration-500 ease-viscous group-hover:translate-x-0.5" />
              Dispatch to nearby artisans
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}