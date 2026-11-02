import { heroSlides } from "@/lib/artisanData";
import HeroSearch from "@/components/home/HeroSearch";
import { useStore } from "@/lib/store";

// Hero photo: an illustration made with Meta's Muse Image, served locally from public/images.
const slide = heroSlides.find((s) => s.word === "Roofers") || heroSlides[0];

export default function Hero() {
  const tenant = useStore((s) => s.tenant);
  return (
    <section className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden bg-[hsl(var(--deep))]">
      <div className="absolute inset-0">
        <img src={slide.src} alt="A roofer working on a roof at sunrise" fetchpriority="high" decoding="async" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--deep))] via-[hsl(var(--deep)/0.55)] to-[hsl(var(--deep)/0.35)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-14 pt-40 md:px-8 md:pb-20">
        <h1 className="font-display-tight max-w-3xl text-[clamp(2.8rem,7.5vw,6rem)] leading-[0.98] text-white">
          {tenant.words.heroTitle}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white">
          {tenant.words.heroText} {tenant.name}{tenant.serviceArea ? `, ${tenant.serviceArea}` : ""}.
        </p>
        <div className="mt-8">
          <HeroSearch />
        </div>
      </div>
    </section>
  );
}
