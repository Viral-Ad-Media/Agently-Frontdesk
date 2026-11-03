import Reveal from "@/components/shared/Reveal";
import { useStore } from "@/lib/store";

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// The business's own published prices, straight from its record: the menu for service trades, the rate card for
// roofing. The desk quotes only from these, so customers see the same numbers here as in the chat.
export default function Services() {
  const tenant = useStore((s) => s.tenant);
  const rc = tenant.rateCard;
  const items =
    tenant.trade === "roofing" && rc && !rc.placeholder
      ? [
          ...Object.entries(rc.materials || {}).map(([name, rate]) => ({ name: name.replace(/^./, (c) => c.toUpperCase()), price: `${money(rate)} per m²`, note: "Materials" })),
          { name: "Roofer labour", price: `${money(rc.labourPerHour)} per hour`, note: "Labour" },
        ]
      : (tenant.services || []).filter((s) => s.priceLow > 0).map((s) => ({ name: s.name, price: s.priceHigh > s.priceLow ? `${money(s.priceLow)} – ${money(s.priceHigh)}` : money(s.priceLow), note: "Published price" }));
  if (!items.length) return null;
  return (
    <section id="services" className="px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">{tenant.trade === "roofing" ? "Our rates" : "Services and prices"}</h2>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">The desk only quotes from these prices. {tenant.disclaimer}</p>
        </Reveal>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.name}>
              <Reveal className="fd-card flex h-full items-baseline justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-[17px] font-medium">{it.name}</p>
                  <p className="mt-0.5 font-spec text-[11px] uppercase text-muted-foreground">{it.note}</p>
                </div>
                <p className="shrink-0 text-[17px] font-semibold tabular-nums text-primary">{it.price}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
