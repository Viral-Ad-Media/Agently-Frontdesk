import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function HeroSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const go = (text) => navigate(`/chat${text ? `?q=${encodeURIComponent(text)}` : ""}`);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q.trim());
      }}
      className="flex w-full max-w-2xl items-center gap-2 rounded-xl border border-white/30 bg-white/10 p-1.5 pl-4 backdrop-blur-md transition-colors duration-200 focus-within:border-white/70"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="What's happening? e.g. water dripping through the bedroom ceiling"
        aria-label="Describe the roof problem"
        className="h-10 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/60"
      />
      <button type="submit" className="fd-btn-primary shrink-0">
        Start <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
