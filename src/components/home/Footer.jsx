import { Link } from "react-router-dom";
import Logo from "@/components/shared/Logo";
import { useStore } from "@/lib/store";

export default function Footer() {
  const tenant = useStore((s) => s.tenant);
  return (
    <footer className="border-t border-border px-6 py-12 md:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <Logo word={tenant.name} />
          <p className="mt-3 max-w-xs text-[15px] text-muted-foreground">Show us the damage. We'll tell you what it is, roughly what it costs, and when we can come.</p>
        </div>
        <nav className="flex flex-wrap gap-6 font-spec text-[11px] uppercase text-muted-foreground">
          <a href="/#how" className="transition-colors hover:text-primary">How it works</a>
          <Link to="/chat" className="transition-colors hover:text-primary">Start a case</Link>
          <Link to="/frontdesk" className="transition-colors hover:text-primary">Front desk</Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-[1200px] font-spec text-[11px] uppercase text-muted-foreground">
        © 2026 {tenant.name} · Front desk by Agently. Draft ranges are not a binding quote.
      </p>
    </footer>
  );
}
