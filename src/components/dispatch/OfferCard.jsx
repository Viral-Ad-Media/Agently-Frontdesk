import { motion } from "framer-motion";
import { MapPin, Wallet, Check, Loader2, MessageCircle } from "lucide-react";
import { Image } from "@/components/ui/image";

// Simulated WhatsApp / SMS card an artisan receives when a job is dispatched to them.
export default function OfferCard({ job, artisan, busy, onAccept, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-40px_hsl(var(--foreground))]"
    >
      <div className="flex items-center gap-3 border-b border-border bg-secondary/60 px-4 py-3">
        <Image src={artisan.portrait} alt={artisan.name} className="h-9 w-9 rounded-full" fittingType="fill" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{artisan.name}</p>
          <p className="font-spec text-[10px] uppercase text-muted-foreground">
            {artisan.trade} · {artisan.rating}★
          </p>
        </div>
        <span className="flex items-center gap-1 font-spec text-[10px] uppercase text-emerald-700">
          <MessageCircle className="h-3 w-3" /> Sent
        </span>
      </div>
      <div className="flex gap-4 p-4">
        <Image src={job.photo} alt="Job photo" className="h-20 w-24 shrink-0 rounded-xl" fittingType="fill" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            New job {artisan.distanceKm} km away — {job.notes?.slice(0, 70) || "job details on request"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 font-spec text-[10px] uppercase text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {artisan.distanceKm} km
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" /> ${artisan.quote[0]}–${artisan.quote[1]}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onAccept(artisan)}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 border-t border-border py-3 font-spec text-[11px] uppercase transition-colors duration-500 hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {busy ? "Accepting" : "Accept with one tap"}
      </button>
    </motion.div>
  );
}