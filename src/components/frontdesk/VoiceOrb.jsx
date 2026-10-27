// The voice front desk's face: one circle whose rings breathe with the conversation state.
// Animates transform and opacity only; respects reduced motion through the global rule.
const labels = { idle: "Tap to talk", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };

export default function VoiceOrb({ state = "idle", size = 120, onClick, disabled }) {
  const ring = {
    idle: "animate-[orb-breathe_3.2s_ease-in-out_infinite]",
    listening: "animate-[orb-breathe_1.1s_ease-in-out_infinite]",
    thinking: "animate-[orb-spin_1.6s_linear_infinite]",
    speaking: "animate-[orb-breathe_0.7s_ease-in-out_infinite]",
  }[state];
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={labels[state]}
        aria-pressed={state !== "idle"}
        className="relative grid place-items-center rounded-full outline-offset-4 transition-transform duration-200 ease-out-quick active:scale-95 disabled:opacity-50"
        style={{ width: size, height: size }}
      >
        <span className={`absolute inset-0 rounded-full border-2 border-primary/50 ${ring}`} aria-hidden />
        <span className={`absolute inset-[14%] rounded-full border border-dashed border-primary/60 ${state === "thinking" ? "animate-[orb-spin_2.4s_linear_infinite_reverse]" : ring}`} aria-hidden />
        <span className={`absolute inset-[30%] rounded-full ${state === "idle" ? "bg-primary/80" : "bg-primary"} ${state === "speaking" ? "animate-[orb-breathe_0.45s_ease-in-out_infinite]" : ""}`} aria-hidden />
      </button>
      <span className="font-spec text-[11px] uppercase text-muted-foreground" aria-live="polite">
        {labels[state]}
      </span>
    </div>
  );
}
