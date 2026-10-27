import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";

// A flat field on the photo, no glass: ink text on white, one action.
export default function HeroSearch() {
  const tenant = useStore((s) => s.tenant);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const go = (text) => navigate(`/chat${text ? `?q=${encodeURIComponent(text)}` : ""}`);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q.trim());
      }}
      className="flex w-full max-w-2xl items-center gap-2 rounded-xl bg-card p-1.5 pl-4"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tenant.words.placeholder}
        aria-label={tenant.trade === "medspa" ? "What would you like help with" : "Describe the roof problem"}
        className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button type="submit" className="fd-btn-primary shrink-0">
        Start <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
