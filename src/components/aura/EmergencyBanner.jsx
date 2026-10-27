
import { motion } from "framer-motion";
import { AlertTriangle, PhoneCall } from "lucide-react";

// Shown the moment the AI flags a genuine safety risk — before any artisan bids.
export default function EmergencyBanner({ emergency }) {
  const hotline = emergency?.hotline || "112";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative my-6 overflow-hidden rounded-2xl border-2 border-destructive bg-destructive/5"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-destructive/15"
        animate={{ opacity: [0.15, 0.5, 0.15] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="font-spec text-[10px] uppercase tracking-widest text-destructive">Emergency override</p>
            <h3 className="text-xl">Make this safe before anything else</h3>
          </div>
        </div>
        {emergency?.reason && <p className="mt-4 text-[15px] text-foreground/85">{emergency.reason}</p>}
        {emergency?.actions?.length > 0 && (
          <ol className="mt-4 space-y-2 text-[15px]">
            {emergency.actions.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-spec text-xs text-destructive">{String(i + 1).padStart(2, "0")}</span>
                {a}
              </li>
            ))}
          </ol>
        )}
        <a
          href={`tel:${hotline}`}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-medium text-destructive-foreground transition-all duration-500 ease-viscous hover:-translate-y-0.5"
        >
          <PhoneCall className="h-4 w-4" /> Call emergency line {hotline}
        </a>
        <p className="mt-3 font-spec text-[11px] uppercase text-muted-foreground">Artisan bids are held until this is acknowledged.</p>
      </div>
    </motion.div>
  );
}