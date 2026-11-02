// One card shape for every dashboard block, iOS style: white card, an icon tile in the system colour for
// the block, a bold title, then the body. Cards rise in on load, staggered by `delay` (ms).
// Cards in the same grid row stretch to the same height, so rows share their edges.
export default function Panel({ title, meta, action, icon: Icon, tint = "var(--ios-blue)", delay = 0, label, className = "", bodyClassName = "", children }) {
  return (
    <section aria-label={label || title} style={{ animationDelay: `${delay}ms` }} className={`fd-card rise flex min-w-0 flex-col overflow-hidden ${className}`}>
      <header className="flex min-h-[60px] shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]" style={{ background: `linear-gradient(180deg, hsl(${tint} / 0.88), hsl(${tint}))` }} aria-hidden>
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold leading-tight tracking-[-0.02em]">{title}</h2>
            {meta && <p className="truncate text-[13px] text-muted-foreground">{meta}</p>}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
