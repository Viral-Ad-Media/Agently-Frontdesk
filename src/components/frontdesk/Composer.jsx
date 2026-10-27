import { useRef } from "react";
import { ArrowUp, Camera, Mic, Square } from "lucide-react";

// Chat input: text, browser voice dictation, and a photo attach that runs the assessment.
export default function Composer({ value, onChange, onSend, onPhoto, voice, busy, placeholder = "Describe the problem…" }) {
  const fileRef = useRef(null);
  return (
    <div className="border-t border-border bg-background px-4 py-3 md:px-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="mx-auto flex max-w-2xl items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 pl-1.5 transition-colors duration-200 focus-within:border-foreground"
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files[0] && onPhoto(e.target.files[0])} />
        <button type="button" disabled={busy} onClick={() => fileRef.current.click()} aria-label="Attach photo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-primary disabled:opacity-40">
          <Camera className="h-5 w-5" />
        </button>
        <input
          value={voice?.listening ? voice.interim : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={voice?.listening ? "Listening…" : placeholder}
          aria-label="Message"
          className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[16px] outline-none placeholder:text-muted-foreground"
        />
        {voice?.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            aria-label={voice.listening ? "Stop listening" : "Speak"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${voice.listening ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}
          >
            {voice.listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
        <button type="submit" disabled={busy || !value.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-colors duration-200 hover:bg-primary disabled:opacity-30">
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
