import { useState } from "react";
import { CalendarCheck, Check } from "lucide-react";
import { useStore, bookSlot, updateCase } from "@/lib/store";

export const fmtDay = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Three taps to book: pick a slot, confirm, done. Reads and writes the same calendar the dashboard shows.
export default function SlotPicker({ caseId, tenant, address, onBooked }) {
  const slots = useStore((s) => s.slots);
  const c = useStore((s) => s.cases.find((x) => x.id === caseId));
  const [picked, setPicked] = useState(null);
  const [name, setName] = useState(c?.customer?.name || "");
  const [phone, setPhone] = useState(c?.customer?.phone || "");
  const [error, setError] = useState(null);

  const open = slots.filter((s) => s.tenantId === tenant.id && !s.caseId && new Date(s.start).getTime() > Date.now());
  const byDay = open.reduce((acc, s) => {
    const k = fmtDay(s.start);
    (acc[k] = acc[k] || []).push(s);
    return acc;
  }, {});
  const days = Object.entries(byDay).slice(0, 3);
  const slot = open.find((s) => s.id === picked);

  const confirm = () => {
    if (!slot) return;
    updateCase(caseId, (cur) => ({ customer: { ...cur.customer, name: name.trim(), phone: phone.trim() } }));
    const res = bookSlot(caseId, slot.id);
    if (!res.ok) {
      setError(res.reason);
      setPicked(null);
      return;
    }
    onBooked?.(res.slot);
  };

  if (open.length === 0) {
    return (
      <div className="fd-card p-5 text-[15px]">
        No open {tenant.words.visit} slots this week. The {tenant.words.approver} will call you to arrange one.
      </div>
    );
  }

  return (
    <section className="fd-card p-5" aria-label="Book an inspection">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" />
        <h3 className="text-lg">Book a {tenant.words.visitLong}</h3>
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">{tenant.trade === "medspa" ? "A clinician goes through everything with you in person." : `A ${tenant.words.pro} confirms the price on site.`} Pick a time that suits you.</p>

      {error && <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[14px] text-destructive">{error}</p>}

      {!slot ? (
        <div className="mt-4 space-y-3">
          {days.map(([day, list]) => (
            <div key={day}>
              <p className="font-spec text-[11px] uppercase text-muted-foreground">{day}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {list.map((s) => (
                  <button key={s.id} type="button" onClick={() => setPicked(s.id)} className="fd-btn-outline">
                    {fmtTime(s.start)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="font-spec text-[11px] uppercase text-muted-foreground">{tenant.words.visit}</p>
            <p className="mt-1 text-lg">
              {fmtDay(slot.start)} at {fmtTime(slot.start)}
            </p>
            <p className="text-[14px] text-muted-foreground">{tenant.trade === "medspa" ? `${tenant.name}, ${tenant.serviceArea}` : address || "Address to confirm"}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="h-10 rounded-xl border border-border bg-card px-3 text-[15px] outline-none focus:border-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={`Phone for the ${tenant.words.pro} (optional)`} className="h-10 rounded-xl border border-border bg-card px-3 text-[15px] outline-none focus:border-foreground" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={confirm} className="fd-btn-primary flex-1">
              <Check className="h-4 w-4" /> Confirm booking
            </button>
            <button type="button" onClick={() => setPicked(null)} className="fd-btn-outline">
              Change time
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
