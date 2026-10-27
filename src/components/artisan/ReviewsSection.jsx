
import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PenLine } from "lucide-react";
import StarRating from "@/components/artisan/StarRating";
import ReviewForm from "@/components/artisan/ReviewForm";
import Reveal from "@/components/shared/Reveal";

export default function ReviewsSection({ artisan }) {
  const [reviews, setReviews] = useState(null);
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [page, agg] = await Promise.all([
      base44.entities.ArtisanReview.filter({ artisan_id: artisan.id }, { sort: "-created_date", limit: 12 }),
      base44.entities.ArtisanReview.aggregate({ query: { artisan_id: artisan.id }, avg: ["rating"] }),
    ]);
    setReviews(page.items);
    setStats(agg.rows?.[0] || { count: 0, avg_rating: 0 });
  }, [artisan.id]);

  useEffect(() => {
    load();
  }, [load]);

  const avg = stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : null;

  return (
    <Reveal className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl">Visitor reviews</h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {stats === null
              ? "Loading reviews…"
              : stats.count > 0
                ? `${stats.count} review${stats.count === 1 ? "" : "s"} from customers who hired this artisan · ${avg} average`
                : "No reviews yet — be the first to vouch for this work."}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="group inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-spec text-[11px] uppercase transition-all duration-500 ease-viscous hover:-translate-y-0.5 hover:border-foreground"
        >
          <PenLine className="h-3.5 w-3.5 transition-transform duration-500 ease-viscous group-hover:-rotate-12" />
          {open ? "Close" : "Write a review"}
        </button>
      </div>

      {open && (
        <div className="mt-6">
          <ReviewForm
            artisan={artisan}
            onDone={() => {
              setOpen(false);
              load();
            }}
          />
        </div>
      )}

      <div className="mt-8 space-y-7">
        {(reviews || []).map((r) => (
          <figure key={r.id} className="border-l-2 border-primary pl-5">
            <div className="flex items-center gap-3">
              <StarRating value={r.rating} />
              <span className="font-spec text-[11px] uppercase text-muted-foreground">
                {new Date(r.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <blockquote className="mt-2 text-foreground/85">“{r.comment}”</blockquote>
            <figcaption className="mt-2 font-spec text-[11px] uppercase text-muted-foreground">
              {r.customer_name}
              {r.worked_with ? " · verified customer" : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </Reveal>
  );
}