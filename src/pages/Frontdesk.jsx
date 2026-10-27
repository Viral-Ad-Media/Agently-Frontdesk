import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/shared/Logo";
import { Inbox, CalendarCheck, Mail, Phone, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import MercuryButton from "@/components/shared/MercuryButton";

const when = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Flexible");

export default function Frontdesk() {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, accepted: 0 });
  const [pending, setPending] = useState(null);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setEmail(me?.alert_email || me?.email || "");
      const [pendingPage, schedulePage, pendingCount, acceptedCount] = await Promise.all([
        base44.entities.BookingRequest.filter({ status: "pending" }, { sort: "-created_date", limit: 20 }),
        base44.entities.BookingRequest.filter({ status: "accepted" }, { sort: "preferred_date", limit: 20 }),
        base44.entities.BookingRequest.count({ status: "pending" }),
        base44.entities.BookingRequest.count({ status: "accepted" }),
      ]);
      setPending(pendingPage.items);
      setSchedule(schedulePage.items);
      setCounts({ pending: pendingCount, accepted: acceptedCount });
    })();
  }, []);

  const saveEmail = async () => {
    setSaving(true);
    await base44.auth.updateMe({ alert_email: email });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-5 md:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <Logo />
          <Link to="/dispatch" className="font-spec text-xs uppercase text-muted-foreground transition-colors hover:text-primary">
            Artisan dispatch →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <p className="font-spec text-xs uppercase text-primary">Front desk</p>
        <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05]">Today at the desk.</h1>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-6">
            <Inbox className="h-6 w-6 text-primary" strokeWidth={1.4} />
            <p className="mt-6 font-heading text-5xl">{counts.pending}</p>
            <p className="mt-1 font-spec text-[11px] uppercase text-muted-foreground">Awaiting dispatch</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <CalendarCheck className="h-6 w-6 text-primary" strokeWidth={1.4} />
            <p className="mt-6 font-heading text-5xl">{counts.accepted}</p>
            <p className="mt-1 font-spec text-[11px] uppercase text-muted-foreground">Booked artisans</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <Mail className="h-6 w-6 text-primary" strokeWidth={1.4} />
            <p className="mt-6 font-heading text-2xl">Booking alerts</p>
            <div className="mt-3 flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <MercuryButton type="button" variant="terracotta" onClick={saveEmail} disabled={saving} className="px-5 py-3">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </MercuryButton>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {saved ? "Saved — alerts go to this address." : "Every new booking request is emailed here the moment it arrives."}
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          <section>
            <h2 className="font-spec text-xs uppercase text-muted-foreground">Inbox · awaiting dispatch</h2>
            <div className="mt-5 space-y-4">
              {pending === null && <p className="text-sm text-muted-foreground">Loading…</p>}
              {pending?.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No new requests. Bookings arrive here the moment a customer sends one.
                </p>
              )}
              {pending?.map((b) => (
                <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-primary/15 px-3 py-1 font-spec text-[10px] uppercase text-primary">Pending</span>
                    <span className="font-spec text-[11px] uppercase text-muted-foreground">{when(b.preferred_date)}</span>
                  </div>
                  <h3 className="mt-3 text-2xl">{b.customer_name}</h3>
                  <a href={`tel:${b.phone}`} className="mt-1 inline-flex items-center gap-2 font-spec text-xs uppercase text-primary">
                    <Phone className="h-3.5 w-3.5" /> {b.phone}
                  </a>
                  <p className="mt-3 text-[15px] text-muted-foreground">{b.notes || "No job description supplied."}</p>
                  <Link
                    to="/dispatch"
                    className="mt-4 inline-flex items-center gap-2 font-spec text-[11px] uppercase transition-colors hover:text-primary"
                  >
                    <Send className="h-3.5 w-3.5" /> Dispatch to nearby artisans
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-spec text-xs uppercase text-muted-foreground">Schedule · accepted jobs</h2>
            <div className="mt-5 space-y-4">
              {schedule === null && <p className="text-sm text-muted-foreground">Loading…</p>}
              {schedule?.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Nothing booked yet. Accept a job in the dispatch feed and it lands here.
                </p>
              )}
              {schedule?.map((b) => (
                <div key={b.id} className="flex gap-5 rounded-2xl border border-border bg-secondary/40 p-5">
                  <div className="shrink-0 border-r border-border pr-5 text-center">
                    <p className="font-heading text-3xl">{when(b.preferred_date).split(" ")[0]}</p>
                    <p className="font-spec text-[10px] uppercase text-muted-foreground">{when(b.preferred_date).split(" ").slice(1).join(" ")}</p>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl">{b.assigned_artisan_name || b.artisan_name || "Artisan"}</h3>
                    <p className="mt-1 font-spec text-[11px] uppercase text-muted-foreground">
                      {b.customer_name} · {b.phone}
                    </p>
                    <p className="mt-2 text-[15px] text-muted-foreground">{b.notes?.slice(0, 90) || "No job description supplied."}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6">
          <div>
            <p className="font-heading text-2xl">Project archive</p>
            <p className="mt-1 text-[15px] text-muted-foreground">Download the whole Agently Frontdesk source for review.</p>
          </div>
          <a
            href="/agently-frontdesk.zip"
            download
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all duration-500 ease-viscous hover:-translate-y-0.5 hover:bg-primary"
          >
            <Download className="h-4 w-4 transition-transform duration-500 ease-viscous group-hover:translate-y-0.5" />
            Download .zip
          </a>
        </div> */}

        <p className="mt-6 font-spec text-[11px] uppercase text-muted-foreground">
          Booking alerts are emailed by Agently Frontdesk's own mail service. Google Calendar sync is not connected.
        </p>
      </div>
    </div>
  );
}