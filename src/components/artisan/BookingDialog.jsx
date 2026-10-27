
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import MercuryButton from "@/components/shared/MercuryButton";

export default function BookingDialog({ artisan, open, onOpenChange }) {
  const [form, setForm] = useState({ customer_name: "", phone: "", preferred_date: "", notes: "" });
  const [state, setState] = useState("idle");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState("saving");
    const booking = await base44.entities.BookingRequest.create({
      ...form,
      artisan_id: artisan.id,
      artisan_name: artisan.name,
      status: "pending",
    });
    // Alert the front desk — never blocks the customer's confirmation.
    base44.functions.invoke("frontdeskNotify", { booking_id: booking.id }).catch(() => {});
    setState("done");
  };
  const close = (v) => { onOpenChange(v); if (!v) setTimeout(() => setState("idle"), 300); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-2xl">
        {state === "done" ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" strokeWidth={1.25} />
            <h3 className="mt-5 text-2xl">Request sent</h3>
            <p className="mt-2 text-muted-foreground">{artisan.name} will contact you on {form.phone} to confirm.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-normal">Book {artisan.name}</DialogTitle>
              <DialogDescription>Tell them what needs doing. Typical quote ${artisan.quote[0]}–${artisan.quote[1]}.</DialogDescription>
            </DialogHeader>
            <Input required placeholder="Your name" value={form.customer_name} onChange={set("customer_name")} />
            <Input required placeholder="Phone number" value={form.phone} onChange={set("phone")} />
            <Input type="date" value={form.preferred_date} onChange={set("preferred_date")} />
            <Textarea placeholder="Describe the job…" rows={3} value={form.notes} onChange={set("notes")} />
            <MercuryButton type="submit" variant="terracotta" className="w-full" disabled={state === "saving"}>
              {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send booking request"}
            </MercuryButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}