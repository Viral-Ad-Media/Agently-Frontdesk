
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { artisans } from "@/lib/artisanData";
import Logo from "@/components/shared/Logo";
import OfferCard from "@/components/dispatch/OfferCard";
import { Radio, Route, Inbox, CheckCircle2 } from "lucide-react";

export default function Dispatch() {
  const [params] = useSearchParams();
  const trade = params.get("trade");
  const [jobs, setJobs] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [accepted, setAccepted] = useState(null);

  const load = async () => {
    const page = await base44.entities.BookingRequest.filter({ status: "pending" }, { sort: "-created_date", limit: 12 });
    setJobs(page.items);
    setActiveId((prev) => (page.items.some((j) => j.id === prev) ? prev : page.items[0]?.id || null));
  };

  useEffect(() => {
    load();
  }, []);

  const job = jobs?.find((j) => j.id === activeId);
  const scoped = trade ? artisans.filter((a) => a.tradeKey === trade) : [];
  const routed = (scoped.length ? scoped : artisans).slice(0, 4);
  const photo = routed[0]?.action;

  const accept = async (artisan) => {
    if (!job) return;
    setBusyId(artisan.id);
    await base44.entities.BookingRequest.update(job.id, {
      status: "accepted",
      assigned_artisan_id: artisan.id,
      assigned_artisan_name: artisan.name,
      assigned_date: new Date().toISOString(),
    });
    setAccepted(`${artisan.name} took the job — it's on the front desk schedule.`);
    setBusyId(null);
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-5 md:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <Logo />
          <Link to="/frontdesk" className="font-spec text-xs uppercase text-muted-foreground transition-colors hover:text-primary">
            Front desk →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <p className="font-spec text-xs uppercase text-primary">For artisans · live dispatch</p>
        <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05]">The bidding feed.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          The moment a customer dispatches a job, the nearest artisans get it on WhatsApp and SMS. Routing is by real distance from the job site,
          nearest first.
        </p>

        {accepted && (
          <p className="mt-8 flex items-center gap-2 rounded-2xl border border-emerald-600/30 bg-emerald-600/10 px-5 py-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> {accepted}
          </p>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[340px_1fr]">
          <div>
            <h2 className="flex items-center gap-2 font-spec text-xs uppercase text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" /> Open jobs
            </h2>
            <div className="mt-4 space-y-3">
              {jobs === null && <p className="text-sm text-muted-foreground">Loading jobs…</p>}
              {jobs?.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  No open jobs right now.{" "}
                  <Link to="/#artisans" className="text-primary underline">
                    Book an artisan
                  </Link>{" "}
                  to see a job land here.
                </p>
              )}
              {jobs?.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setActiveId(j.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-500 ease-viscous hover:-translate-y-0.5 ${
                    j.id === activeId ? "border-foreground bg-secondary/60" : "border-border bg-card"
                  }`}
                >
                  <p className="font-spec text-[10px] uppercase text-primary">{j.artisan_name || "Unassigned trade"}</p>
                  <p className="mt-2">{j.notes?.slice(0, 60) || "Job description pending"}</p>
                  <p className="mt-2 font-spec text-[11px] uppercase text-muted-foreground">
                    {j.customer_name} · {j.preferred_date || "date flexible"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="flex items-center gap-2 font-spec text-xs uppercase text-muted-foreground">
              <Radio className="h-3.5 w-3.5" /> Notification feed {trade ? `· ${trade}` : ""}
            </h2>
            <p className="mt-3 flex items-center gap-2 font-spec text-[11px] uppercase text-primary">
              <Route className="h-3.5 w-3.5" /> Routed by proximity · Haversine from the job site
            </p>
            {!job ? (
              <p className="mt-6 text-sm text-muted-foreground">Pick an open job to see the cards artisans receive.</p>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {routed.map((a, i) => (
                  <OfferCard
                    key={a.id}
                    artisan={a}
                    job={{ notes: job.notes, photo: photo || a.action }}
                    index={i}
                    busy={busyId === a.id}
                    onAccept={accept}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}