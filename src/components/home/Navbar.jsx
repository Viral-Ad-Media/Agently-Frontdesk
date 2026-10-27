import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Logo from "@/components/shared/Logo";
import { useStore } from "@/lib/store";

export default function Navbar({ dark = false }) {
  const tenant = useStore((s) => s.tenant);
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
    ["Front desk", "/frontdesk"],
  ];
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${scrolled ? "border-b border-border bg-background/90 backdrop-blur-md" : ""}`}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3 md:px-8">
        <Logo light={light} word={tenant.name} />
        <nav className={`hidden items-center gap-8 text-sm md:flex ${light ? "text-white/85" : "text-foreground/80"}`}>
          {links.map(([l, h]) => (
            <a key={l} href={h} className="transition-colors duration-200 hover:text-primary">
              {l}
            </a>
          ))}
        </nav>
        <Link to="/chat" className="fd-btn-primary">
          <MessageSquare className="h-4 w-4" /> Describe your roof problem
        </Link>
      </div>
    </header>
  );
}
