
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import MercuryButton from "@/components/shared/MercuryButton";
import Logo from "@/components/shared/Logo";

export default function Navbar({ dark = false }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const light = !scrolled && !dark;
  const links = [
    ["How it works", "/#how"],
    ["Artisans", "/#artisans"],
    ["For artisans", "/dispatch"],
  ];
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-viscous ${
        scrolled ? "bg-background/80 py-3 shadow-[0_1px_0_hsl(var(--border))] backdrop-blur-xl" : "py-6"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-12">
        <Logo light={light} />
        <nav className={`hidden items-center gap-10 text-sm lg:flex ${light ? "text-white/85" : "text-foreground/75"}`}>
          {links.map(([l, h]) => (
            <a key={l} href={h} className="group relative py-1 transition-colors hover:text-primary">
              {l}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-500 ease-viscous group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <MercuryButton to="/aura" variant={light ? "glass" : "terracotta"} className="px-5 py-3">
          <Sparkles className="h-4 w-4" /> Talk to Aura
        </MercuryButton>
      </div>
      <div className={`mx-auto mt-3 flex max-w-[1400px] gap-6 px-6 font-spec text-[10px] uppercase lg:hidden ${light ? "text-white/70" : "text-muted-foreground"}`}>
        {links.map(([l, h]) => (
          <Link key={l} to={h.replace("/#", "/")}>{l}</Link>
        ))}
      </div>
    </header>
  );
}