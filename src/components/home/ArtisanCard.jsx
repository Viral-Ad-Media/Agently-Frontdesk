
import { Link } from "react-router-dom";
import { Star, ArrowUpRight } from "lucide-react";

export default function ArtisanCard({ a }) {
  return (
    <Link to={`/artisan/${a.id}`} className="group block">
      <div className={`relative overflow-hidden rounded-2xl bg-secondary ${a.aspect}`}>
        <img src={a.portrait} alt={a.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-viscous group-hover:scale-110 group-hover:opacity-0" />
        <img src={a.action} alt={`${a.name} at work`} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-0 transition-all duration-[1400ms] ease-viscous group-hover:scale-100 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 font-spec text-[10px] uppercase backdrop-blur">{a.trade}</span>
        <span className="absolute right-4 top-4 flex h-10 w-10 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-500 ease-viscous group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 p-4 font-spec text-[10px] uppercase text-white/90 transition-transform duration-700 ease-viscous group-hover:-translate-y-1">
          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current" />{a.rating}</span>
          <span>{a.distanceKm} km</span>
          <span className="text-right">${a.rate}/hr</span>
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="text-2xl">{a.name}</h3>
        <span className="font-spec text-[11px] uppercase text-muted-foreground">{a.years} yrs</span>
      </div>
      <p className="mt-1 text-[15px] text-muted-foreground">{a.tagline}</p>
    </Link>
  );
}