import { BadgeCheck, ShieldCheck, Star, Award, CalendarClock } from "lucide-react";
import Reveal from "@/components/shared/Reveal";
import { trustFor, TRUST_NOTE } from "@/lib/trust";

const ICON = { Licence: BadgeCheck, Insurance: ShieldCheck, Warranty: Award, Reviews: Star, "In business": CalendarClock };

// Site section: who you're dealing with, before you share anything. Only what the business states.
export default function TrustCard({ tenant }) {
  const { lines, source } = trustFor(tenant);
  if (!lines.length) return null;
  return (
    <section id="trust" className="border-t border-border px-6 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.05]">Who you're dealing with</h2>
          <p className="mt-2 text-[13px] text-muted-foreground">{TRUST_NOTE[source]}</p>
        </Reveal>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {lines.map((l) => {
            const Icon = ICON[l.label] || BadgeCheck;
            return (
              <li key={l.label + l.value} className="fd-card p-5">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <p className="mt-3 font-spec text-[11px] uppercase text-muted-foreground">{l.label}</p>
                <p className="mt-1 text-[15px] leading-snug">{l.value}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// In the chat, under the greeting: the same facts as small chips, so trust comes before the first question.
export function TrustChips({ tenant }) {
  const { lines, source } = trustFor(tenant);
  if (!lines.length) return null;
  return (
    <div className="space-y-1.5" data-testid="trust-chips">
      <div className="flex flex-wrap gap-1.5">
        {lines.slice(0, 4).map((l) => {
          const Icon = ICON[l.label] || BadgeCheck;
          return (
            <span key={l.label + l.value} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[12px]">
              <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
              {l.label === "Reviews" ? l.value.replace(" out of 5 from", "★ ·") : l.value}
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">{TRUST_NOTE[source]}</p>
    </div>
  );
}
