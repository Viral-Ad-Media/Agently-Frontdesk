// Scroll entrance in pure CSS (animation-timeline: view(), see .reveal in index.css). No JS observer:
// browsers without scroll timelines, and anyone with reduced motion, just see the content in place.
// `delay` is kept for call-site compatibility; scroll-linked motion has no clock to delay against.
// eslint-disable-next-line no-unused-vars
export default function Reveal({ children, delay = 0, y = 20, className = "" }) {
  return (
    <div className={`reveal ${className}`} style={{ "--reveal-y": `${Math.min(y, 24)}px` }}>
      {children}
    </div>
  );
}
