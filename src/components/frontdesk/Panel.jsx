// One card shape for every dashboard block: a 52px header bar inside the card (title, meta, one action),
// then the body. Cards in the same grid row stretch to the same height, so rows share their edges.
export default function Panel({ title, meta, action, label, className = "", bodyClassName = "", children }) {
  return (
    <section aria-label={label || title} className={`flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      <header className="flex min-h-[52px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-tight">{title}</h2>
          {meta && <p className="truncate text-[12px] text-muted-foreground">{meta}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
