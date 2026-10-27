
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const variants = {
  solid: { base: "bg-foreground text-background", fill: "bg-primary", text: "" },
  terracotta: { base: "bg-primary text-primary-foreground", fill: "bg-foreground", text: "" },
  glass: {
    base: "border border-white/40 bg-white/10 text-white backdrop-blur-md",
    fill: "bg-white",
    text: "group-hover:text-foreground",
  },
  outline: {
    base: "border border-foreground/80 text-foreground",
    fill: "bg-foreground",
    text: "group-hover:text-background",
  },
};

export default function MercuryButton({ children, variant = "solid", to, className, ...props }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const v = variants[variant];
  const track = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const cls = cn(
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-4 text-sm font-medium tracking-wide",
    "transition-[transform,color,border-color,opacity] duration-500 ease-viscous hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    v.base,
    className
  );
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform duration-[900ms] ease-viscous group-hover:scale-100",
          v.fill
        )}
        style={{ left: pos.x, top: pos.y }}
      />
      <span className={cn("relative z-10 flex items-center gap-2 transition-colors duration-500", v.text)}>
        {children}
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls} onMouseEnter={track} onMouseLeave={track} {...props}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={cls} onMouseEnter={track} onMouseLeave={track} {...props}>
      {inner}
    </button>
  );
}