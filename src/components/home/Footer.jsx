
import { Link } from "react-router-dom";
import Logo from "@/components/shared/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-14 md:px-12">
      <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[15px] text-muted-foreground">Diagnose the problem. Meet the right hands.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-3 font-spec text-xs uppercase text-muted-foreground sm:flex sm:gap-8">
          <a href="/#how" className="transition-colors hover:text-primary">How it works</a>
          <a href="/#artisans" className="transition-colors hover:text-primary">Artisans</a>
          <Link to="/aura" className="transition-colors hover:text-primary">Aura AI</Link>
          <Link to="/dispatch" className="transition-colors hover:text-primary">For artisans</Link>
          <Link to="/frontdesk" className="transition-colors hover:text-primary">Front desk</Link>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-[1400px] font-spec text-[11px] uppercase text-muted-foreground">
        © 2026 Agently Frontdesk. Estimates are indicative and not a binding quote.
      </p>
    </footer>
  );
}