import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Camera } from "lucide-react";
import { trades } from "@/lib/artisanData";

export default function HeroSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const go = (text) => navigate(`/aura${text ? `?q=${encodeURIComponent(text)}` : ""}`);
  return (
    <div className="w-full max-w-3xl">
      <form
        onSubmit={(e) => { e.preventDefault(); go(q.trim()); }}
        className="flex items-center gap-3 rounded-full border border-white/30 bg-white/15 p-2 pl-6 shadow-2xl backdrop-blur-[20px] transition-all duration-500 ease-viscous focus-within:border-white/60 focus-within:bg-white/25"
      >
        <Camera className="hidden h-5 w-5 shrink-0 text-white/80 sm:block" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe what's broken — a leaking sink, a cracked wall…"
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-white/65"
        />
        <button
          type="submit"
          className="group flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all duration-500 ease-viscous hover:-translate-y-0.5 hover:bg-white hover:text-foreground active:scale-95"
        >
          Diagnose
          <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-viscous group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {trades.map((t) => (
          <button
            key={t}
            onClick={() => go(`I need help with ${t.toLowerCase()}`)}
            className="rounded-full border border-white/25 px-4 py-1.5 font-spec text-[11px] uppercase text-white/85 backdrop-blur-md transition-all duration-500 ease-viscous hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-foreground"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}