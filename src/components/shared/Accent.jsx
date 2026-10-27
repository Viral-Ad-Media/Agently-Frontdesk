
// Accent word inside a headline — set in the app's accent face, never the heading face.
export default function Accent({ children, className = "" }) {
  return <span className={`font-accent italic tracking-[-0.01em] ${className}`}>{children}</span>;
}