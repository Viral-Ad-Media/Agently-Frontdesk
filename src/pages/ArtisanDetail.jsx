
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Wrench, CalendarCheck } from "lucide-react";
import { getArtisan } from "@/lib/artisanData";
import Navbar from "@/components/home/Navbar";
import Reveal from "@/components/shared/Reveal";
import Accent from "@/components/shared/Accent";
import MercuryButton from "@/components/shared/MercuryButton";
import BookingDialog from "@/components/artisan/BookingDialog";
import ReviewsSection from "@/components/artisan/ReviewsSection";
import PageNotFound from "@/lib/PageNotFound";
import { Image } from "@/components/ui/image";

export default function ArtisanDetail() {
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const a = getArtisan(id);
  if (!a) return <PageNotFound />;
  const gallery = [a.portrait, a.action, ...a.works.slice(0, 1).map((w) => w.image)];

  return (
    <div className="min-h-screen bg-background">
      <Navbar dark />
      <div className="lg:grid lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="sticky top-0 grid h-screen grid-rows-2 gap-2 p-2 pt-24">
            <Image src={gallery[0]} alt={a.name} className="h-full w-full rounded-2xl" fittingType="fill" />
            <div className="grid grid-cols-2 gap-2">
              {gallery.slice(1, 3).map((g, i) => (
                <Image key={i} src={g} alt="Past project" className="h-full w-full rounded-2xl" fittingType="fill" />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:hidden">
          <Image src={a.portrait} alt={a.name} className="h-[60svh] w-full" fittingType="fill" />
        </div>

        <div className="px-6 pb-40 pt-12 md:px-12 lg:pt-32">
          <Link to="/#artisans" className="group inline-flex items-center gap-2 font-spec text-xs uppercase text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4 transition-transform duration-500 ease-viscous group-hover:-translate-x-1" /> All artisans
          </Link>
          <Reveal>
            <p className="mt-10 font-spec text-xs uppercase text-primary">{a.trade} · {a.years} years</p>
            <h1 className="mt-3 text-[clamp(2.6rem,5vw,5rem)] font-light leading-none">{a.name}</h1>
            <p className="mt-4 font-accent text-2xl italic text-muted-foreground">{a.tagline}</p>
          </Reveal>
          <Reveal className="mt-10 grid grid-cols-3 divide-x divide-border border-y border-border py-5 text-center font-spec text-xs uppercase">
            <div><Star className="mx-auto h-4 w-4 fill-primary text-primary" /><p className="mt-2 text-lg">{a.rating}</p><p className="text-muted-foreground">{a.reviews} reviews</p></div>
            <div><MapPin className="mx-auto h-4 w-4 text-primary" /><p className="mt-2 text-lg">{a.distanceKm} km</p><p className="text-muted-foreground">{a.area.split(" & ")[0]}</p></div>
            <div><Wrench className="mx-auto h-4 w-4 text-primary" /><p className="mt-2 text-lg">${a.rate}/hr</p><p className="text-muted-foreground">Labour</p></div>
          </Reveal>
          <Reveal className="mt-14">
            <h2 className="text-3xl">Philosophy</h2>
            <p className="mt-4 text-lg text-foreground/80">{a.philosophy}</p>
          </Reveal>
          <Reveal className="mt-14">
            <h2 className="text-3xl">Tools of the trade</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {a.tools.map((t) => <span key={t} className="rounded-full border border-border px-4 py-2 font-spec text-[11px] uppercase">{t}</span>)}
            </div>
          </Reveal>
          <Reveal className="mt-14">
            <h2 className="text-3xl">Selected works</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">{a.works.length} recent projects from this workshop.</p>
            <div className="mt-6 space-y-6">
              {a.works.map((w, i) => (
                <div key={w.title} className="group grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                  <Image
                    src={w.image}
                    alt={w.title}
                    className="h-40 w-full rounded-2xl sm:h-32"
                    fittingType="fill"
                  />
                  <div>
                    <p className="font-spec text-[10px] uppercase text-primary">{w.year}</p>
                    <h3 className="mt-1 text-2xl">{w.title}</h3>
                    <p className="mt-1 text-[15px] text-muted-foreground">{w.blurb}</p>
                  </div>
                  {i < a.works.length - 1 && <div className="hidden" />}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="mt-14">
            <h2 className="text-3xl">Services</h2>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {a.services.map((s) => (
                <div key={s.name} className="flex justify-between py-4 transition-all duration-500 ease-viscous hover:pl-3"><span>{s.name}</span><span className="font-spec text-sm text-primary">{s.price}</span></div>
              ))}
            </div>
          </Reveal>

          <ReviewsSection artisan={a} />

          <Reveal className="mt-14 rounded-3xl border border-border bg-secondary/40 p-6">
            <p className="font-heading text-2xl">Prefer the machine to ask?</p>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Describe the problem to <Accent>Aura</Accent> and it will price the job and route it to the right trade.
            </p>
            <MercuryButton to="/aura" variant="outline" className="mt-5">Talk to Aura</MercuryButton>
          </Reveal>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 lg:left-1/2 lg:justify-center">
        <MercuryButton variant="terracotta" onClick={() => setOpen(true)} className="px-8 py-5 shadow-2xl shadow-primary/30">
          <CalendarCheck className="h-4 w-4" /> Book now · ${a.quote[0]}–${a.quote[1]}
        </MercuryButton>
      </div>
      <BookingDialog artisan={a} open={open} onOpenChange={setOpen} />
    </div>
  );
}