import { Link } from "react-router-dom";
import { Check, Mic, MessageSquare } from "lucide-react";
import Reveal from "@/components/shared/Reveal";
import { useStore } from "@/lib/store";
import { siteCopy } from "@/config/siteCopy";
import { samplesFor } from "@/config/media";
import { mentions, tradeProfile, withArticle } from "@/config/trades";

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// What the desk does for this trade, next to an example of the chat: a sample job, the service it matches on the
// business's own menu (or its rate card for roofing) and the time picker. The numbers are the business's own.
export default function DeskPreview() {
  const tenant = useStore((s) => s.tenant);
  const copy = siteCopy(tenant.trade);
  const prof = tradeProfile(tenant.trade);
  const sample = samplesFor(tenant.trade)[0];
  const service = sample && (tenant.services || []).find((s) => (s.concerns || []).some((c) => mentions(sample.description, c)));
  const rc = tenant.rateCard;
  const agent = tenant.words?.agentName || "Aura";
  const answer = service
    ? `That matches ${service.name} on our menu: ${money(service.priceLow)} – ${money(service.priceHigh)}. The ${tenant.words.pro} confirms it ${prof.onSite ? "on site" : "with you"}.`
    : tenant.trade === "roofing" && rc
      ? `I've outlined the damaged area on your photo. Your draft range comes from our rates (${money(rc.materials["asphalt shingle"])}/m² for asphalt shingle plus labour), and a roofer confirms it on site.`
      : `I've noted it for the ${tenant.words.pro}, who confirms everything before anything is booked or priced.`;
  return (
    <section id="desk" className="border-t border-border px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1200px] items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">More than a chat box.</h2>
          <p className="mt-3 max-w-md text-lg text-muted-foreground">{agent}, our AI front desk, answers in seconds, day and night. A person here approves every price.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {copy.features.map(([t, d]) => (
              <li key={t} className="fd-card p-5">
                <p className="flex items-center gap-2 text-[16px] font-medium"><Check className="h-4 w-4 shrink-0 text-primary" /> {t}</p>
                <p className="mt-1.5 text-[14px] text-muted-foreground">{d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/chat" className="fd-btn-primary"><MessageSquare className="h-4 w-4" /> Start a chat</Link>
            <Link to="/chat?voice=1" className="fd-btn-outline"><Mic className="h-4 w-4" /> Talk to {agent}</Link>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="fd-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-[13px] font-semibold text-primary">{agent[0]}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{agent} · {tenant.name}</p>
              <p className="text-[12px] text-muted-foreground">Example conversation</p>
            </div>
          </div>
          <div className="space-y-3 p-4 text-[14px]">
            <p className="max-w-[85%] rounded-[18px] rounded-bl-md bg-secondary px-3.5 py-2.5">Hi, I'm {agent}, the AI front desk for {tenant.name}. {tenant.words.greeting}</p>
            {sample && (
              <div className="ml-auto max-w-[85%] space-y-2">
                <p className="rounded-[18px] rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground">{sample.description}</p>
                <img src={sample.src} alt={`Sample photo: ${sample.title.toLowerCase()} (synthetic)`} loading="lazy" className="ml-auto aspect-[4/3] w-48 rounded-xl object-cover" />
              </div>
            )}
            <p className="max-w-[85%] rounded-[18px] rounded-bl-md bg-secondary px-3.5 py-2.5">{answer}</p>
            <div className="rounded-xl border border-border p-3">
              <p className="font-spec text-[11px] uppercase text-muted-foreground">Book {tenant.words.visitLong === "chair" ? "the chair" : withArticle(tenant.words.visitLong)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["9:00 AM", "11:30 AM", "2:00 PM"].map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-3 py-1.5 text-[13px] font-semibold">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">Sample photo: a synthetic illustration made with Meta's Muse Image.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
