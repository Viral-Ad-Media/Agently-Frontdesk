import { heroSlides } from "@/lib/artisanData";
import HeroSearch from "@/components/home/HeroSearch";
import { Image } from "@/components/ui/image";
import { useStore } from "@/lib/store";

// PLACEHOLDER visual: a generated roofer image from the starting build, until product-matched photography exists.
const slide = heroSlides.find((s) => s.word === "Roofers") || heroSlides[0];

export default function Hero() {
  const tenant = useStore((s) => s.tenant);
  return (
    <section className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden bg-[hsl(var(--deep))]">
      <div className="absolute inset-0">
        <Image src={slide.src} alt="A roofer working on a tiled roof at sunrise" className="h-full w-full" fittingType="fill" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--deep))] via-[hsl(var(--deep)/0.55)] to-[hsl(var(--deep)/0.35)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-14 pt-40 md:px-8 md:pb-20">
        <p className="mb-4 text-[15px] text-white/80">{tenant.name}, {tenant.serviceArea}</p>
        <h1 className="max-w-3xl text-[clamp(2.4rem,6.5vw,5.2rem)] font-semibold leading-[1.02] text-white">
          {tenant.words.heroTitle}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white/80">
          {tenant.words.heroText}
        </p>
        <div className="mt-8">
          <HeroSearch />
        </div>
      </div>
    </section>
  );
}
