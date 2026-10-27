
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import StarRating from "@/components/artisan/StarRating";
import MercuryButton from "@/components/shared/MercuryButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ReviewForm({ artisan, onDone }) {
  const [form, setForm] = useState({ customer_name: "", rating: 0, comment: "", worked_with: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) return setError("Pick a star rating first.");
    if (!form.customer_name.trim()) return setError("Add your name so the artisan knows who to thank.");
    if (form.comment.trim().length < 4) return setError("Add a short comment about the work.");
    setError("");
    setSaving(true);
    try {
      await base44.entities.ArtisanReview.create({
        artisan_id: artisan.id,
        artisan_name: artisan.name,
        customer_name: form.customer_name.trim(),
        rating: form.rating,
        comment: form.comment.trim(),
        worked_with: form.worked_with,
      });
      onDone?.();
    } catch (err) {
      setSaving(false);
      setError((err?.message || "").includes("401") ? "Please sign in to leave a review." : "Couldn't post that review. Try again.");
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-secondary/50 p-5">
      <p className="font-spec text-[10px] uppercase tracking-widest text-primary">Leave a review</p>
      <h3 className="mt-2 text-2xl">How did {artisan.name.split(" ")[0]} do?</h3>
      <div className="mt-4">
        <StarRating size="lg" value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
      </div>
      <div className="mt-5 space-y-3">
        <Input placeholder="Your name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        <Textarea rows={3} placeholder="A short note about the work…" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        <label className="flex items-center gap-2 font-spec text-[11px] uppercase text-muted-foreground">
          <input
            type="checkbox"
            checked={form.worked_with}
            onChange={(e) => setForm({ ...form, worked_with: e.target.checked })}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          I hired this artisan
        </label>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <MercuryButton type="submit" variant="terracotta" className="mt-5" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post review"}
      </MercuryButton>
    </form>
  );
}